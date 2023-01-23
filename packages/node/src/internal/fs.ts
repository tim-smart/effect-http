import * as Effect from "@effect/io/Effect"
import * as Sink from "@effect/stream/Sink"
import * as Stream from "@effect/stream/Stream"
import { pipe } from "@fp-ts/data/Function"
import * as Option from "@fp-ts/data/Option"
import * as NFS from "fs"

export class ErrnoError {
  readonly _tag = "ErrnoError"
  constructor(readonly error: NodeJS.ErrnoException) {}
}

export const DEFAULT_CHUNK_SIZE = 512 * 1024

export class OpenError {
  readonly _tag = "OpenError"
  constructor(readonly error: unknown) {}
}

const unsafeOpen = (path: string, flags?: NFS.OpenMode, mode?: NFS.Mode) =>
  Effect.async<never, ErrnoError | OpenError, number>((resume) => {
    try {
      NFS.open(path, flags, mode, (err, fd) => {
        if (err) {
          resume(Effect.fail(new ErrnoError(err)))
        } else {
          resume(Effect.succeed(fd))
        }
      })
    } catch (err) {
      resume(Effect.fail(new OpenError(err)))
    }
  })

const close = (fd: number) =>
  Effect.async<never, ErrnoError, void>((resume) => {
    NFS.close(fd, (err) => {
      if (err) {
        resume(Effect.fail(new ErrnoError(err)))
      } else {
        resume(Effect.unit())
      }
    })
  })

export const open = (path: string, flags?: NFS.OpenMode, mode?: NFS.Mode) =>
  Effect.acquireRelease(unsafeOpen(path, flags, mode), (fd) =>
    Effect.ignoreLogged(close(fd)),
  )

export const stat = (path: string) =>
  Effect.async<never, ErrnoError, NFS.Stats>((resume) => {
    NFS.stat(path, (err, stats) => {
      if (err) {
        resume(Effect.fail(new ErrnoError(err)))
      } else {
        resume(Effect.succeed(stats))
      }
    })
  })

export const read = (
  fd: number,
  buf: Uint8Array,
  offset: number,
  length: number,
  position: NFS.ReadPosition | null,
) =>
  Effect.async<never, ErrnoError, number>((resume) => {
    NFS.read(fd, buf, offset, length, position, (err, bytesRead) => {
      if (err) {
        resume(Effect.fail(new ErrnoError(err)))
      } else {
        resume(Effect.succeed(bytesRead))
      }
    })
  })

export const allocAndRead = (
  fd: number,
  size: number,
  position: NFS.ReadPosition | null,
) =>
  pipe(
    Effect.sync(() => Buffer.allocUnsafeSlow(size)),
    Effect.flatMap((buf) =>
      pipe(
        read(fd, buf, 0, size, position),
        Effect.map((bytesRead) => {
          if (bytesRead === 0) {
            return Option.none
          }

          if (bytesRead === size) {
            return Option.some([buf, bytesRead] as const)
          }

          const dst = Buffer.allocUnsafeSlow(bytesRead)
          buf.copy(dst, 0, 0, bytesRead)
          return Option.some([dst, bytesRead] as const)
        }),
      ),
    ),
  )

export interface StreamOptions {
  bufferSize?: number
  chunkSize?: number
  offset?: number
  bytesToRead?: number
}

export const stream = (
  path: string,
  {
    bufferSize = 4,
    chunkSize = DEFAULT_CHUNK_SIZE,
    offset = 0,
    bytesToRead,
  }: StreamOptions = {},
) =>
  pipe(
    open(path, "r"),
    Effect.map((fd) =>
      Stream.unfoldEffect(offset, (position) => {
        if (bytesToRead !== undefined && bytesToRead <= position - offset) {
          return Effect.succeedNone()
        }

        const toRead =
          bytesToRead !== undefined &&
          bytesToRead - (position - offset) < chunkSize
            ? bytesToRead - (position - offset)
            : chunkSize

        return pipe(
          allocAndRead(fd, toRead, position),
          Effect.map(
            Option.map(
              ([buf, bytesRead]) => [buf, position + bytesRead] as const,
            ),
          ),
        )
      }),
    ),
    Stream.unwrapScoped,
    Stream.bufferChunks(bufferSize),
  )

export const write = (fd: number, data: Uint8Array, offset?: number) =>
  Effect.async<never, ErrnoError, number>((resume) => {
    NFS.write(fd, data, offset, (err, written) => {
      if (err) {
        resume(Effect.fail(new ErrnoError(err)))
      } else {
        resume(Effect.succeed(written))
      }
    })
  })

export const writeAll = (
  fd: number,
  data: Uint8Array,
  offset = 0,
): Effect.Effect<never, ErrnoError, void> =>
  pipe(
    write(fd, data, offset),
    Effect.flatMap((bytesWritten) => {
      const newOffset = offset + bytesWritten

      if (newOffset >= data.byteLength) {
        return Effect.unit()
      }

      return writeAll(fd, data, newOffset)
    }),
  )

export const sink = (
  path: string,
  flags: NFS.OpenMode = "w",
  mode?: NFS.Mode,
) =>
  pipe(
    open(path, flags, mode),
    Effect.map((fd) => Sink.forEach((_: Uint8Array) => writeAll(fd, _))),
    Sink.unwrapScoped,
  )

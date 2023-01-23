import type { Effect } from "@effect/io/Effect"
import * as Stream from "@effect/stream/Stream"
import { LazyArg, pipe } from "@fp-ts/data/Function"
import * as Sink from "@effect/stream/Sink"
import * as Option from "@fp-ts/data/Option"
import { Readable, Writable } from "stream"

export class ReadableError {
  readonly _tag = "ReadableError"
  constructor(readonly reason: Error) {}
}

export const fromReadable = (evaluate: LazyArg<Readable>) =>
  pipe(
    Effect(evaluate)
      .acquireRelease((stream) =>
        Effect(() => {
          stream.removeAllListeners()

          if (!stream.closed) {
            stream.destroy()
          }
        }),
      )
      .map((stream) =>
        Stream.async<never, ReadableError, Readable>((emit) => {
          stream.once("error", (err) => {
            emit.fail(new ReadableError(err))
          })

          stream.once("end", () => {
            emit.end()
          })

          stream.on("readable", () => {
            emit.single(stream)
          })

          if (stream.readable) {
            emit.single(stream)
          }
        }, 0),
      ),
    Stream.unwrapScoped,
  ).flatMap((_) => Stream.repeatEffectOption(readChunk(_)))

const readChunk = (
  stream: Readable,
): Effect<never, Option.Option<never>, Uint8Array> =>
  Effect(() => stream.read() as Uint8Array | null).flatMap((a) =>
    a ? Effect.succeed(a) : Effect.fail(Option.none),
  )

export type WritableSink<A> = Sink.Sink<never, WritableError, A, never, void>

export class WritableError {
  readonly _tag = "WritableError"
  constructor(readonly error: Error) {}
}

export interface SinkOptions {
  endOnExit?: boolean
  encoding?: BufferEncoding
}

export const sink = <A>(
  evaluate: LazyArg<Writable>,
  { endOnExit = true, encoding = "binary" }: SinkOptions = {},
): WritableSink<A> =>
  pipe(
    Effect.sync(evaluate)
      .acquireRelease(endOnExit ? end : () => Effect.unit())
      .map((_) => makeSink<A>(_, encoding)),
    Sink.unwrapScoped,
  )

const end = (stream: Writable) =>
  Effect.async<never, never, void>((resume) => {
    if (stream.closed) {
      resume(Effect.unit())
      return
    }

    stream.end(() => resume(Effect.unit()))
  })

const makeSink = <A>(stream: Writable, encoding: BufferEncoding) =>
  Sink.forEach(write<A>(stream, encoding))

const write =
  <A>(stream: Writable, encoding: BufferEncoding) =>
  (_: A) =>
    Effect.async<never, WritableError, void>((resume) => {
      stream.write(_, encoding, (err) => {
        if (err) {
          resume(Effect.fail(new WritableError(err)))
        } else {
          resume(Effect.unit())
        }
      })
    })

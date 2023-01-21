import type { Effect } from "@effect/io/Effect"
import * as Stream from "@effect/stream/Stream"
import { LazyArg, pipe } from "@fp-ts/data/Function"
import * as Option from "@fp-ts/data/Option"
import { Readable } from "stream"

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

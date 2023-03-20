export const fromReadableStream = <A = Uint8Array>(
  evaluate: LazyArg<ReadableStream<A>>,
) =>
  Stream.unwrapScoped(
    Effect(() => evaluate().getReader())
      .acquireRelease(reader => Effect.promise(reader.cancel()))
      .map(reader =>
        Stream.repeatEffectOption(
          Effect.attemptCatchPromise(
            () => reader.read(),
            reason => Maybe.some(new ReadableStreamError(reason)),
          ).flatMap(({ value, done }) =>
            done ? Effect.fail(Maybe.none()) : Effect.succeed(value),
          ),
        ),
      ),
  )

export const fromReadableStreamByob = (
  evaluate: LazyArg<ReadableStream<Uint8Array>>,
  allocSize = 4096,
) =>
  Stream.unwrapScoped(
    Effect(() => evaluate().getReader({ mode: "byob" }))
      .acquireRelease(reader => Effect.promise(reader.cancel()))
      .map(reader =>
        readChunk(reader, allocSize).forever.catchAll(e =>
          e._tag === "EOF" ? Stream.empty : Stream.fail(e),
        ),
      ),
  )

export class ReadableStreamError {
  readonly _tag = "ReadableStreamError"
  constructor(readonly reason: unknown) {}
}

class EOF {
  readonly _tag = "EOF"
}

const readChunk = (reader: ReadableStreamBYOBReader, size: number) => {
  const buffer = new ArrayBuffer(size)

  return Stream.paginateEffect(0, offset =>
    Effect.attemptCatchPromise(
      () =>
        reader.read(new Uint8Array(buffer, offset, buffer.byteLength - offset)),
      reason => new ReadableStreamError(reason),
    ).flatMap(({ done, value }) => {
      if (done) {
        return Effect.fail(new EOF())
      }

      const newOffset = offset + value.byteLength
      return Effect.succeed([
        value,
        newOffset >= buffer.byteLength
          ? Maybe.none<number>()
          : Maybe.some(newOffset),
      ])
    }),
  )
}

export const toReadableStream = <E, A>(source: Stream<never, E, A>) => {
  let pull: Effect<never, never, void>
  let scope: CloseableScope

  return new ReadableStream<A>({
    start(controller) {
      scope = Scope.make().runSync
      pull = source.toPull
        .use(scope)
        .runSync.tap(_ =>
          Effect(() => {
            _.forEach(_ => {
              controller.enqueue(_)
            })
          }),
        )
        .tapErrorCause(() => scope.close(Exit.unit()))
        .catchTag("None", () =>
          Effect(() => {
            controller.close()
          }),
        )
        .catchTag("Some", e =>
          Effect(() => {
            controller.error(e.value)
          }),
        ).asUnit
    },
    pull() {
      return pull.runPromise
    },
    cancel() {
      return scope.close(Exit.unit()).runPromise
    },
  })
}

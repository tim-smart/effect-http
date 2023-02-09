export const fromReadableStream = <A = Uint8Array>(
  evaluate: LazyArg<ReadableStream<A>>,
) =>
  Stream.unwrapScoped(
    Effect(() => evaluate().getReader())
      .acquireRelease(reader => Effect.promise(reader.cancel()))
      .map(reader =>
        Stream.repeatEffectOption(
          Effect.tryCatchPromise(
            () => reader.read(),
            _ => Maybe.some(_),
          ).flatMap(({ value, done }) =>
            done ? Effect.fail(Maybe.none()) : Effect.succeed(value),
          ),
        ),
      ),
  )

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

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

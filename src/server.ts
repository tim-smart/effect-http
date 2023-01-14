export const make = <R>(
  handle: (ctx: Request) => Effect<R, EarlyResponse, Response>,
): Effect<R, never, void> =>
  Effect.runtime<R>().flatMap((rt) =>
    Effect.asyncInterrupt<never, never, void>(() => {
      const server = Bun.serve({
        fetch(request) {
          return rt.unsafeRunPromise(
            handle(request).catchTag("EarlyResponse", (e) =>
              Effect.succeed(e.response),
            ),
          )
        },
      })

      return Effect.sync(() => {
        server.stop()
      })
    }),
  )

export class EarlyResponse {
  readonly _tag = "EarlyResponse"
  constructor(readonly response: Response) {}
}

export const respond = (
  response: Response,
): Effect<never, EarlyResponse, never> =>
  Effect.fail(new EarlyResponse(response))

export const make = <R>(
  handle: Effect<R | RequestContext, EarlyResponse, Response>,
): Effect<Exclude<R, RequestContext>, never, void> =>
  Effect.runtime<Exclude<R, RequestContext>>().flatMap((rt) =>
    Effect.asyncInterrupt<never, never, void>(() => {
      const server = Bun.serve({
        fetch(request) {
          return rt.unsafeRunPromise(
            pipe(
              handle,
              Effect.provideService(RequestContext)({ request }),
            ).catchTag("EarlyResponse", (e) => Effect.succeed(e.response)),
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

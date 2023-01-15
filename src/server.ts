export const make = <R>(
  handle: RequestHandler<R, EarlyResponse>,
): Effect<R, never, void> =>
  Effect.runtime<R>().flatMap((rt) =>
    Effect.asyncInterrupt<never, never, void>(() => {
      const server = Bun.serve({
        fetch(request) {
          return rt.unsafeRunPromise(
            handle(request.url, request).catchTag("EarlyResponse", (e) =>
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

import { GenericServeOptions } from "bun"

/**
 * @tsplus fluent effect-bun-http/HttpApp serve
 */
export const make = <R>(
  httpApp: HttpApp<R, EarlyResponse>,
  options: Exclude<GenericServeOptions, "error"> = {},
): Effect<R, never, void> =>
  Effect.runtime<R>().flatMap((rt) =>
    Effect.asyncInterrupt<never, never, void>(() => {
      const server = Bun.serve({
        ...options,
        fetch(request) {
          return rt.unsafeRunPromise(
            httpApp(request.url, request).catchTag("EarlyResponse", (e) =>
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

export const respondEarly = (
  response: Response,
): Effect<never, EarlyResponse, never> =>
  Effect.fail(new EarlyResponse(response))

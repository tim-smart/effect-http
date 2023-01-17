import type { Effect } from "@effect/io/Effect"
import type { GenericServeOptions } from "bun"
import type { HttpApp, EarlyResponse, HttpRequest } from "@effect-http/core"
import { response } from "@effect-http/core"

/**
 * @tsplus fluent effect-http/HttpApp serveBun
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
            httpApp(HttpRequest.fromStandard(request)).map(response.toStandard),
          )
        },
      })

      return Effect(() => {
        server.stop()
      })
    }),
  )

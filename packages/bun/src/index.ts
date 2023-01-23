import type { HttpApp } from "@effect-http/core"
import type { HttpRequest } from "@effect-http/core/Request"
import { EarlyResponse, HttpResponse } from "@effect-http/core/Response"
import type { Effect } from "@effect/io/Effect"
import type { GenericServeOptions } from "bun"

/**
 * @tsplus pipeable effect-http/HttpApp serveBun
 */
export const make =
  (options: Exclude<GenericServeOptions, "error"> = {}) =>
  <R>(httpApp: HttpApp<R, EarlyResponse>): Effect<R, never, void> =>
    Effect.runtime<R>().flatMap((rt) =>
      Effect.asyncInterrupt<never, never, void>(() => {
        const server = Bun.serve({
          ...options,
          fetch(request) {
            return rt.unsafeRunSyncOrPromise(
              httpApp(
                HttpRequest.fromStandard(request, request.method, request.url),
              )
                .catchTag("EarlyResponse", (e) => Effect.succeed(e.response))
                .map(HttpResponse.toStandard),
            )
          },
        })

        return Effect(() => {
          server.stop()
        })
      }),
    )

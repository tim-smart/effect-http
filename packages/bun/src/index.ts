import type { HttpApp } from "@effect-http/core"
import type { HttpRequest } from "@effect-http/core/Request"
import {
  EarlyResponse,
  FileResponse,
  HttpResponse,
} from "@effect-http/core/Response"
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
                .map((_) => HttpResponse.toStandard(_, fileResponse)),
            )
          },
          error(req) {
            req.cause
          },
        })

        return Effect(() => {
          server.stop()
        })
      }),
    )

const fileResponse = (response: FileResponse): Response => {
  let file = Bun.file(response.path, {
    type: response.contentType,
  })

  if (response.range._tag === "Some") {
    file = file.slice(response.range.value[0], response.range.value[1])
  }

  return new Response(file, {
    status: response.status,
    headers:
      response.headers._tag === "Some" ? response.headers.value : undefined,
  })
}

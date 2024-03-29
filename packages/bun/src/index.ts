import type { HttpApp } from "@effect-http/core"
import type { HttpRequest } from "@effect-http/core/Request"
import { EarlyResponse, HttpResponse } from "@effect-http/core/Response"
import {
  HttpFs,
  HttpFsError,
  HttpFsNotFound,
} from "@effect-http/core/internal/HttpFs"
import type { Effect } from "@effect/io/Effect"
import type { Layer } from "@effect/io/Layer"
import { GenericServeOptions, SystemError } from "bun"
import * as Fs from "node:fs"

/**
 * @tsplus pipeable effect-http/HttpApp serve
 */
export const serve =
  (options: Exclude<GenericServeOptions, "error"> = {}) =>
  <R>(
    httpApp: HttpApp<R, EarlyResponse>,
  ): Effect<Exclude<R, HttpFs>, never, void> =>
    Effect.runtime<R>()
      .flatMap(rt => {
        const run = rt.runPromise
        return Effect.async<never, never, void>(() => {
          const server = Bun.serve({
            ...options,
            fetch(request) {
              return run(
                httpApp(
                  HttpRequest.fromStandard(
                    request,
                    request.method,
                    request.url,
                  ),
                )
                  .catchTag("EarlyResponse", e => Effect.succeed(e.response))
                  .map(HttpResponse.toStandard),
              )
            },
          })

          return Effect(() => {
            server.stop()
          })
        })
      })
      .provideService(HttpFs, bunHttpFsImpl)

const bunHttpFsImpl: HttpFs = {
  toResponse(path, { status, contentType, range }) {
    return Effect.async<never, SystemError, Fs.Stats>(resume => {
      Fs.stat(path, (err, stats) => {
        if (err) {
          resume(Effect.fail(err))
        } else {
          resume(Effect.succeed(stats))
        }
      })
    })
      .map(() => {
        let file = Bun.file(path, {
          type: contentType,
        })

        if (range) {
          file = file.slice(range[0], range[1])
        }

        return HttpResponse.raw(file, { status })
      })
      .mapError(_ =>
        _.code === "ENOENT" ? new HttpFsNotFound(path, _) : new HttpFsError(_),
      )
  },
}

export const BunHttpFsLive = Layer.succeed(HttpFs, bunHttpFsImpl)

import { RequestError } from "../Error.js"
import * as response from "../Response.js"
import { toReadableStream } from "../util/stream.js"
import { RequestBody } from "./Body.js"
import { RequestExecutorFactory } from "./Executor.js"

/**
 * @tsplus pipeable effect-http/client/Request fetch
 */
export const fetch: RequestExecutorFactory<RequestInit, response.Response> =
  ({
    executorOptions = {},
    validateResponse = response.defaultValidator,
  } = {}) =>
  request =>
    Do($ => {
      const url = $(
        Effect.tryCatch(
          () => new URL(request.url),
          _ => new RequestError(request, _),
        ),
      )

      request.urlParams.forEach(([key, value]) => {
        url.searchParams.append(key, value)
      })

      const headers = new Headers(request.headers.toReadonlyArray() as any)
      const body = request.body.map(convertBody).getOrUndefined

      return $(
        Effect.tryCatchPromiseInterrupt(
          signal =>
            globalThis.fetch(url, {
              ...executorOptions,
              method: request.method,
              headers,
              body,
              signal,
            }),
          _ => new RequestError(request, _),
        )
          .map(response.fromWeb)
          .flatMap(validateResponse),
      )
    })

const convertBody = (body: RequestBody): BodyInit => {
  switch (body._tag) {
    case "RawBody":
      return body.value as any

    case "StreamBody":
      return toReadableStream(body.value)
  }
}

import { HttpClientError, RequestError } from "../Error.js"
import { Request } from "../Request.js"
import * as response from "../Response.js"
import { toReadableStream } from "../util/stream.js"
import { RequestBody } from "./Body.js"
import type { RequestExecutor } from "./Executor.js"
import * as executor from "./Executor.js"

export const fetchRaw =
  (
    options: RequestInit = {},
  ): RequestExecutor<never, HttpClientError, response.Response> =>
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
              ...options,
              method: request.method,
              headers,
              body,
              signal,
            }),
          _ => new RequestError(request, _),
        ).map(response.fromWeb),
      )
    })

export const fetch = flow(
  fetchRaw,
  executor.filterStatus(_ => _ >= 200 && _ < 300),
)

/**
 * @tsplus pipeable effect-http/client/Request fetch
 */
export const fetch_: (
  options?: RequestInit,
) => (request: Request) => Effect<never, HttpClientError, response.Response> =
  fetch

export const fetchJson = flow(
  fetch,
  executor.contramap(_ => _.acceptJson),
  executor.mapEffect(_ => _.json),
)

/**
 * @tsplus pipeable effect-http/client/Request fetchJson
 */
export const fetchJson_: (
  options?: RequestInit,
) => (request: Request) => Effect<never, HttpClientError, unknown> = fetchJson

export const fetchDecode = <A>(
  schema: Schema<A>,
  options?: RequestInit,
): RequestExecutor<never, HttpClientError, A> =>
  fetch(options)
    .contramap(_ => _.acceptJson)
    .mapEffect(_ => _.decode(schema))

/**
 * @tsplus pipeable effect-http/client/Request fetchDecode
 */
export const fetchDecode_: <A>(
  schema: Schema<A>,
  options?: RequestInit,
) => (request: Request) => Effect<never, HttpClientError, A> = fetchDecode

const convertBody = (body: RequestBody): BodyInit => {
  switch (body._tag) {
    case "FormDataBody":
    case "RawBody":
      return body.value as any

    case "StreamBody":
      return toReadableStream(body.value)
  }
}

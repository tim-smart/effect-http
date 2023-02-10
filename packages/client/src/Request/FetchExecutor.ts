import { HttpClientError, RequestError } from "../Error.js"
import { Request } from "../Request.js"
import * as response from "../Response.js"
import { toReadableStream } from "../util/stream.js"
import { RequestBody } from "./Body.js"
import {
  RequestExecutor,
  RequestExecutorFactory,
  RequestExecutorOptions,
} from "./Executor.js"

export const fetch: RequestExecutorFactory<
  RequestInit,
  never,
  HttpClientError,
  response.Response
> =
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

/**
 * @tsplus pipeable effect-http/client/Request fetch
 */
export const fetch_: (
  options?: RequestExecutorOptions<RequestInit>,
) => (request: Request) => Effect<never, HttpClientError, response.Response> =
  fetch

export const fetchJson: RequestExecutorFactory<
  RequestInit,
  never,
  HttpClientError,
  unknown
> = options =>
  fetch(options)
    .contramap(_ => _.acceptJson)
    .mapEffect(_ => _.json)

/**
 * @tsplus pipeable effect-http/client/Request fetchJson
 */
export const fetchJson_: (
  options?: RequestExecutorOptions<RequestInit>,
) => (request: Request) => Effect<never, HttpClientError, unknown> = fetchJson

export const fetchDecode = <A>(
  schema: Schema<A>,
  options?: RequestExecutorOptions<RequestInit>,
): RequestExecutor<never, HttpClientError, A> =>
  fetch(options)
    .contramap(_ => _.acceptJson)
    .mapEffect(_ => _.decode(schema))

/**
 * @tsplus pipeable effect-http/client/Request fetchDecode
 */
export const fetchDecode_: <A>(
  schema: Schema<A>,
  options?: RequestExecutorOptions<RequestInit>,
) => (request: Request) => Effect<never, HttpClientError, A> = fetchDecode

const convertBody = (body: RequestBody): BodyInit => {
  switch (body._tag) {
    case "RawBody":
      return body.value as any

    case "StreamBody":
      return toReadableStream(body.value)
  }
}

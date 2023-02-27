import type { ParseOptions } from "@fp-ts/schema/AST"
import {
  RequestError,
  ResponseDecodeError,
  SchemaDecodeError,
  StatusCodeError,
} from "../Error.js"
import { Request } from "../Request.js"
import * as response from "../Response.js"
import { toReadableStream } from "../util/stream.js"
import { RequestBody } from "./Body.js"
import type { RequestExecutor } from "./Executor.js"
import * as executor from "./Executor.js"

/**
 * A request executor that uses the global fetch function.
 *
 * It performs no validation on the response status code.
 *
 * @since 1.0.0
 */
export const fetch =
  (
    options: RequestInit = {},
  ): RequestExecutor<never, RequestError, response.Response> =>
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

      const headers = new Headers([...request.headers] as any)
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

/**
 * A request executor that uses the global fetch function.
 *
 * It filters out responses with a status code outside the range 200-299.
 *
 * @since 1.0.0
 */
export const fetchOk = flow(fetch, executor.filterStatusOk)

/**
 * @since 1.0.0
 * @tsplus pipeable effect-http/client/Request fetch
 */
export const fetch_: (
  options?: RequestInit,
) => (
  request: Request,
) => Effect<never, RequestError | StatusCodeError, response.Response> = fetchOk

/**
 * A request executor that uses the global fetch function.
 *
 * It sets the Accept header to "application/json" and decodes the response
 * body.
 *
 * @since 1.0.0
 */
export const fetchJson = flow(
  fetchOk,
  executor.contramap(_ => _.acceptJson),
  executor.mapEffect(_ => _.json),
)

/**
 * @tsplus pipeable effect-http/client/Request fetchJson
 */
export const fetchJson_: (
  options?: RequestInit,
) => (
  request: Request,
) => Effect<
  never,
  RequestError | StatusCodeError | ResponseDecodeError,
  unknown
> = fetchJson

/**
 * A request executor that uses the global fetch function.
 *
 * It decodes the response body using the given schema.
 *
 * @since 1.0.0
 */
export const fetchDecode = <A>(
  schema: Schema<A>,
  options?: ParseOptions,
  requestInit?: RequestInit,
): RequestExecutor<
  never,
  RequestError | StatusCodeError | ResponseDecodeError | SchemaDecodeError,
  A
> =>
  fetchOk(requestInit)
    .contramap(_ => _.acceptJson)
    .mapEffect(_ => _.decode(schema, options))

/**
 * @tsplus pipeable effect-http/client/Request fetchDecode
 */
export const fetchDecode_: <A>(
  schema: Schema<A>,
  options?: ParseOptions,
  requestInit?: RequestInit,
) => (
  request: Request,
) => Effect<
  never,
  RequestError | StatusCodeError | ResponseDecodeError | SchemaDecodeError,
  A
> = fetchDecode

const convertBody = (body: RequestBody): BodyInit => {
  switch (body._tag) {
    case "FormDataBody":
    case "RawBody":
      return body.value as any

    case "StreamBody":
      return toReadableStream(body.value)
  }
}

export const LiveFetchRequestExecutor = Layer.succeed(
  executor.HttpRequestExecutor,
  { execute: fetch() },
)

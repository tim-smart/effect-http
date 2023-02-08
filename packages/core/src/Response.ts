import { ToResponseOptions } from "./internal/HttpFs.js"
import { toReadableStream } from "./util/stream.js"
import * as Mime from "mime-types"

/**
 * @tsplus type effect-http/Response
 * @tsplus companion effect-http/Response.Ops
 */
export type HttpResponse =
  | EmptyResponse
  | FormDataResponse
  | StreamResponse
  | RawResponse

export class HttpStreamError {
  readonly _tag = "HttpStreamError"
  constructor(readonly error: unknown) {}
}

export class EmptyResponse {
  readonly _tag = "EmptyResponse"
  constructor(readonly status: number, readonly headers: Headers | undefined) {}
}

export class FormDataResponse {
  readonly _tag = "FormDataResponse"
  constructor(
    readonly status: number,
    readonly headers: Headers | undefined,
    readonly body: FormData,
  ) {}
}

export class StreamResponse {
  readonly _tag = "StreamResponse"
  constructor(
    readonly status: number,
    readonly headers: Headers,
    readonly body: Stream<never, HttpStreamError, Uint8Array>,
  ) {}
}

export class RawResponse {
  readonly _tag = "RawResponse"
  constructor(
    readonly status: number,
    readonly headers: Headers | undefined,
    readonly body: unknown,
  ) {}
}

/**
 * @tsplus static effect-http/Response.Ops empty
 */
export const empty = ({
  headers,
  status = 204,
}: {
  status?: number
  headers?: Headers
} = {}): HttpResponse => new EmptyResponse(status, headers)

/**
 * @tsplus static effect-http/Response.Ops json
 */
export const json = (
  value: unknown,
  {
    headers = new Headers(),
    status = 200,
  }: {
    status?: number
    headers?: Headers
  } = {},
): HttpResponse => {
  headers.set("content-type", "application/json")
  return new RawResponse(status, headers, JSON.stringify(value))
}

/**
 * @tsplus static effect-http/Response.Ops text
 */
export const text = (
  value: string,
  {
    headers = new Headers(),
    status = 200,
    contentType = "text/plain",
  }: {
    status?: number
    contentType?: string
    headers?: Headers
  } = {},
): HttpResponse => {
  headers.set("content-type", contentType)
  return new RawResponse(status, headers, value)
}

/**
 * @tsplus static effect-http/Response.Ops html
 */
export const html = (
  value: string,
  {
    headers = new Headers(),
    status = 200,
  }: {
    status?: number
    headers?: Headers
  } = {},
): HttpResponse => {
  headers.set("content-type", "text/html")
  return new RawResponse(status, headers, value)
}

/**
 * @tsplus static effect-http/Response.Ops searchParams
 */
export const searchParams = (
  value: URLSearchParams,
  {
    headers = new Headers(),
    status = 200,
  }: {
    status?: number
    headers?: Headers
  } = {},
): HttpResponse => {
  headers.set("content-type", "application/x-www-form-urlencoded")
  return new RawResponse(status, headers, value.toString())
}

/**
 * @tsplus static effect-http/Response.Ops stream
 */
export const stream = (
  value: Stream<never, HttpStreamError, Uint8Array>,
  {
    headers = new Headers(),
    status = 200,
    contentType = "application/octet-stream",
    contentLength,
  }: {
    status?: number
    headers?: Headers
    contentType?: string
    contentLength?: number
  } = {},
): HttpResponse => {
  headers.set("content-type", contentType)

  if (contentLength) {
    headers.set("content-length", contentLength.toString())
  }

  return new StreamResponse(status, headers, value)
}

/**
 * @tsplus static effect-http/Response.Ops formData
 */
export const formData = (
  value: FormData,
  {
    headers,
    status = 200,
  }: {
    status?: number
    headers?: Headers
  } = {},
): HttpResponse => new FormDataResponse(status, headers, value)

/**
 * @tsplus static effect-http/Response.Ops raw
 */
export const raw = (
  body: unknown,
  {
    headers,
    status = 200,
  }: {
    status?: number
    headers?: Headers
  } = {},
): HttpResponse => new RawResponse(status, headers, body)

/**
 * @tsplus static effect-http/Response.Ops file
 */
export const file = (path: string, opts: Partial<ToResponseOptions> = {}) => {
  const options: ToResponseOptions = {
    ...opts,
    contentType: Mime.lookup(path) || "application/octet-stream",
  }

  return HttpFs.accessWithEffect(_ => _.toResponse(path, options))
}

export class EarlyResponse {
  readonly _tag = "EarlyResponse"
  constructor(readonly response: HttpResponse) {}
}

/**
 * @tsplus getter effect-http/Response.Ops early
 */
export const early = (
  response: HttpResponse,
): Effect<never, EarlyResponse, never> =>
  Effect.fail(new EarlyResponse(response))

/**
 * @tsplus fluent effect-http/Response toStandard
 * @tsplus static effect-http/Response.Ops toStandard
 */
export const toStandard = (self: HttpResponse): Response => {
  switch (self._tag) {
    case "EmptyResponse":
      return new Response(null, {
        status: self.status,
        headers: self.headers,
      })

    case "RawResponse":
      return new Response(self.body as any, {
        status: self.status,
        headers: self.headers,
      })

    case "FormDataResponse":
      return new Response(self.body as any, {
        status: self.status,
        headers: self.headers,
      })

    case "StreamResponse":
      return new Response(toReadableStream(self.body), {
        status: self.status,
        headers: self.headers,
      })
  }
}

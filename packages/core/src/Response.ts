/**
 * @tsplus type effect-http/Response
 * @tsplus companion effect-http/Response.Ops
 */
export class HttpResponse {
  readonly _tag = "HttpResponse"
  constructor(
    readonly status: number,
    readonly headers: Maybe<Headers>,
    readonly body: ResponseBody,
  ) {}
}

export type ResponseBody =
  | { _tag: "Empty" }
  | { _tag: "Text"; contentType: string; value: string }
  | { _tag: "Json"; value: unknown }
  | { _tag: "URLSearchParams"; value: URLSearchParams }
  | {
      _tag: "ReadableStream"
      contentType: string
      contentLength: Maybe<number>
      value: ReadableStream
    }

/**
 * @tsplus static effect-http/Response.Ops json
 */
export const json = (
  value: unknown,
  {
    headers = Maybe.none,
    status = 200,
  }: {
    status?: number
    headers?: Maybe<Headers>
  } = {},
) =>
  new HttpResponse(status, headers, {
    _tag: "Json",
    value,
  })

/**
 * @tsplus static effect-http/Response.Ops text
 */
export const text = (
  value: string,
  {
    headers = Maybe.none,
    status = 200,
    contentType = "text/plain",
  }: {
    status?: number
    contentType?: string
    headers?: Maybe<Headers>
  } = {},
) =>
  new HttpResponse(status, headers, {
    _tag: "Text",
    contentType,
    value,
  })

/**
 * @tsplus static effect-http/Response.Ops searchParams
 */
export const searchParams = (
  value: URLSearchParams,
  {
    headers = Maybe.none,
    status = 200,
  }: {
    status?: number
    headers?: Maybe<Headers>
  } = {},
) =>
  new HttpResponse(status, headers, {
    _tag: "URLSearchParams",
    value,
  })

/**
 * @tsplus static effect-http/Response.Ops stream
 */
export const stream = (
  value: ReadableStream,
  {
    headers,
    status = 200,
    contentType = "application/octet-stream",
    contentLength,
  }: {
    status?: number
    headers?: Headers
    contentType?: string
    contentLength?: number
  } = {},
) =>
  new HttpResponse(status, Maybe.fromNullable(headers), {
    _tag: "ReadableStream",
    contentType,
    contentLength: Maybe.fromNullable(contentLength),
    value,
  })

export class EarlyResponse {
  readonly _tag = "EarlyResponse"
  constructor(readonly response: HttpResponse) {}
}

/**
 * @tsplus static effect-http/Response.Ops early
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
  if (self.body._tag === "Empty") {
    return new Response(null, {
      status: self.status,
      headers: self.headers._tag === "Some" ? self.headers.value : undefined,
    })
  }

  const headers =
    self.headers._tag === "Some" ? self.headers.value : new Headers()
  let body: any = null

  switch (self.body._tag) {
    case "Json":
      body = JSON.stringify(self.body.value)
      headers.set("content-type", "application/json")
      break

    case "Text":
      headers.set("content-type", self.body.contentType)
      body = self.body.value
      break

    case "URLSearchParams":
      headers.set("content-type", "application/x-www-form-urlencoded")
      body = self.body.value.toString()
      break

    case "ReadableStream":
      headers.set("content-type", self.body.contentType)
      if (self.body.contentLength._tag === "Some") {
        headers.set("content-length", self.body.value.toString())
      }
      body = self.body.value
  }

  return new Response(body, {
    status: self.status,
    headers,
  })
}

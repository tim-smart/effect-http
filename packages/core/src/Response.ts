/**
 * @tsplus type effect-http/Response
 * @tsplus companion effect-http/Response.Ops
 */
export type HttpResponse =
  | EmptyResponse
  | TextResponse
  | JsonResponse
  | SearchParamsResponse
  | FormDataResponse
  | StreamResponse

export class EmptyResponse {
  readonly _tag = "EmptyResponse"
  constructor(readonly status: number, readonly headers: Maybe<Headers>) {}
}

export class TextResponse {
  readonly _tag = "TextResponse"
  constructor(
    readonly status: number,
    readonly headers: Maybe<Headers>,
    readonly contentType: string,
    readonly body: string,
  ) {}
}

export class JsonResponse {
  readonly _tag = "JsonResponse"
  constructor(
    readonly status: number,
    readonly headers: Maybe<Headers>,
    readonly body: unknown,
  ) {}
}

export class SearchParamsResponse {
  readonly _tag = "SearchParamsResponse"
  constructor(
    readonly status: number,
    readonly headers: Maybe<Headers>,
    readonly body: URLSearchParams,
  ) {}
}

export class FormDataResponse {
  readonly _tag = "FormDataResponse"
  constructor(
    readonly status: number,
    readonly headers: Maybe<Headers>,
    readonly body: FormData,
  ) {}
}

export class StreamResponse {
  readonly _tag = "StreamResponse"
  constructor(
    readonly status: number,
    readonly headers: Maybe<Headers>,
    readonly contentType: string,
    readonly contentLength: Maybe<number>,
    readonly body: ReadableStream,
  ) {}
}

/**
 * @tsplus static effect-http/Response.Ops empty
 */
export const empty = ({
  headers = Maybe.none,
  status = 204,
}: {
  status?: number
  headers?: Maybe<Headers>
} = {}): HttpResponse => new EmptyResponse(status, headers)

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
): HttpResponse => new JsonResponse(status, headers, value)

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
): HttpResponse => new TextResponse(status, headers, contentType, value)

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
): HttpResponse => new SearchParamsResponse(status, headers, value)

/**
 * @tsplus static effect-http/Response.Ops formData
 */
export const formData = (
  value: FormData,
  {
    headers = Maybe.none,
    status = 200,
  }: {
    status?: number
    headers?: Maybe<Headers>
  } = {},
): HttpResponse => new FormDataResponse(status, headers, value)

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
): HttpResponse =>
  new StreamResponse(
    status,
    Maybe.fromNullable(headers),
    contentType,
    Maybe.fromNullable(contentLength),
    value,
  )

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
  if (self._tag === "EmptyResponse") {
    return new Response(null, {
      status: self.status,
      headers: self.headers._tag === "Some" ? self.headers.value : undefined,
    })
  }

  const headers =
    self.headers._tag === "Some" ? self.headers.value : new Headers()
  let body: any = null

  switch (self._tag) {
    case "JsonResponse":
      headers.set("content-type", "application/json")
      body = JSON.stringify(self.body)
      break

    case "TextResponse":
      headers.set("content-type", self.contentType)
      body = self.body
      break

    case "SearchParamsResponse":
      headers.set("content-type", "application/x-www-form-urlencoded")
      body = self.body.toString()
      break

    case "FormDataResponse":
      body = self.body
      break

    case "StreamResponse":
      headers.set("content-type", self.contentType)
      if (self.contentLength._tag === "Some") {
        headers.set("content-length", self.contentLength.toString())
      }
      body = self.body
  }

  return new Response(body, {
    status: self.status,
    headers,
  })
}

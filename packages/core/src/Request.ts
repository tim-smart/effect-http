/**
 * @tsplus type effect-http/Request
 * @tsplus companion effect-http/Request.Ops
 */
export interface HttpRequest {
  readonly source: unknown
  readonly method: string

  readonly url: string
  readonly originalUrl: string
  setUrl(url: string): HttpRequest

  readonly headers: Headers
  readonly json: Effect<never, RequestBodyError, unknown>
  readonly text: Effect<never, RequestBodyError, string>
  readonly stream: Effect<never, RequestBodyError, ReadableStream>
}

export class RequestBodyError {
  readonly _tag = "RequestBodyError"
  constructor(readonly reason: unknown) {}
}

class HttpRequestImpl implements HttpRequest {
  constructor(readonly source: Request, readonly url: string) {}

  get method() {
    return this.source.method
  }

  get originalUrl() {
    return this.source.url
  }

  setUrl(url: string): HttpRequest {
    return new HttpRequestImpl(this.source, url)
  }

  get headers() {
    return this.source.headers
  }

  get json() {
    return Effect.tryCatchPromise(
      () => this.source.json(),
      (reason) => new RequestBodyError(reason),
    )
  }

  get text() {
    return Effect.tryCatchPromise(
      () => this.source.text(),
      (reason) => new RequestBodyError(reason),
    )
  }

  get stream() {
    return this.source.body
      ? Effect(this.source.body)
      : Effect.fail(new RequestBodyError("no body"))
  }
}

/**
 * @tsplus static effect-http/Request.Ops fromStandard
 */
export const fromStandard = (source: Request): HttpRequest =>
  new HttpRequestImpl(source, source.url)

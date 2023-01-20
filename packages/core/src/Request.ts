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
  readonly formData: Effect<never, RequestBodyError, FormData>
  readonly formDataStream: Stream<never, RequestBodyError, FormDataPart>
  readonly stream: Stream<never, ReadableStreamError, Uint8Array>
}

export class RequestBodyError {
  readonly _tag = "RequestBodyError"
  constructor(readonly reason: unknown) {}
}

class HttpRequestImpl implements HttpRequest {
  constructor(
    private _build: Request | LazyArg<Request>,
    readonly method: string,
    readonly url: string,
  ) {}

  get source() {
    if (typeof this._build !== "function") {
      return this._build
    }

    this._build = this._build()
    return this._build
  }

  get originalUrl() {
    return this.source.url
  }

  setUrl(url: string): HttpRequest {
    return new HttpRequestImpl(this.source, this.method, url)
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

  get formData() {
    return Effect.tryCatchPromise(
      () => this.source.formData(),
      (reason) => new RequestBodyError(reason),
    )
  }

  get formDataStream(): any {
    throw "unimplemented"
  }

  get stream() {
    return this.source.body
      ? fromReadableStream(this.source.body)
      : Stream.fail(new ReadableStreamError("no body"))
  }
}

/**
 * @tsplus static effect-http/Request.Ops fromStandard
 */
export const fromStandard = (
  source: LazyArg<Request> | Request,
  method: string,
  url: string,
): HttpRequest => new HttpRequestImpl(source, method, url)

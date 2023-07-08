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
  readonly stream: Stream<never, RequestBodyError, Uint8Array>
  readonly webStream: Effect<
    never,
    RequestBodyError,
    ReadableStream<Uint8Array>
  >
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
    return Effect.tryPromise(
{
try:      () => this.source.json(),
   catch:   reason => new RequestBodyError(reason),
}
    )
  }

  get text() {
    return Effect.tryPromise(
{
try:      () => this.source.text(),
   catch:   reason => new RequestBodyError(reason),
}
    )
  }

  get formData() {
    return Effect.tryPromise(
{
try:      () => this.source.formData(),
   catch:   reason => new RequestBodyError(reason),
}
    )
  }

  get formDataStream(): any {
    throw "unimplemented"
  }

  get stream() {
    return this.source.body
      ? fromReadableStream(this.source.body).mapError(
          _ => new RequestBodyError(_),
        )
      : Stream.fail(new RequestBodyError("no body"))
  }

  get webStream() {
    return this.source.body
      ? Effect.succeed(this.source.body)
      : Effect.fail(new RequestBodyError("no body"))
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

/**
 * @tsplus static effect-http/Request.Ops params
 */
export const params = RouteContext.accessWith(
  (_): Readonly<Record<string, string | undefined>> => ({
    ..._.searchParams,
    ...(_.params || {}),
  }),
)

/**
 * @tsplus static effect-http/Request.Ops json
 */
export const json = RouteContext.accessWithEffect(_ => _.request.json)

/**
 * @tsplus static effect-http/Request.Ops text
 */
export const text = RouteContext.accessWithEffect(_ => _.request.text)

/**
 * @tsplus static effect-http/Request.Ops formData
 */
export const formData = RouteContext.accessWithEffect(_ => _.request.formData)

/**
 * @tsplus static effect-http/Request.Ops formDataStream
 */
export const formDataStream = Stream.fromEffect(RouteContext).flatMap(
  _ => _.request.formDataStream,
)

/**
 * @tsplus static effect-http/Request.Ops stream
 */
export const stream = Stream.fromEffect(RouteContext).flatMap(_ => _.request.stream)

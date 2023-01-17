/**
 * @tsplus type effect-http/Request
 * @tsplus companion effect-http/Request.Ops
 */
export interface HttpRequest {
  readonly source: unknown

  readonly method: string

  readonly url: string
  readonly originalUrl: string

  readonly headers: Headers

  readonly json: Effect<never, RequestBodyError, unknown>
  readonly text: Effect<never, RequestBodyError, string>
  readonly stream: Effect<never, RequestBodyError, ReadableStream>
}

export class RequestBodyError {
  readonly _tag = "RequestBodyError"
  constructor(readonly reason: unknown) {}
}

/**
 * @tsplus static effect-http/Request.Ops fromStandard
 */
export const fromStandard = (source: Request): HttpRequest => ({
  source,
  method: source.method,
  url: source.url,
  originalUrl: source.url,
  headers: source.headers,
  json: Effect.tryCatchPromise(
    () => source.json(),
    (reason) => new RequestBodyError(reason),
  ),
  text: Effect.tryCatchPromise(
    () => source.text(),
    (reason) => new RequestBodyError(reason),
  ),
  stream: source.body
    ? Effect(source.body)
    : Effect.fail(new RequestBodyError("no body")),
})

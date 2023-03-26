import { ParseOptions } from "@effect/schema/AST"
import { SchemaEncodeError } from "./Error.js"
import type { RequestBody } from "./Request/Body.js"
import * as body from "./Request/Body.js"
import { RequestExecutor } from "./Request/Executor.js"
import { Json, Schema } from "@effect/schema/Schema"

export type HttpMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "DELETE"
  | "PATCH"
  | "HEAD"
  | "OPTIONS"

/**
 * @tsplus type effect-http/client/Request
 * @tsplus companion effect-http/client/Request.Ops
 */
export interface Request {
  readonly _tag: "Request"
  readonly url: string
  readonly urlParams: Chunk<[string, string]>
  readonly method: HttpMethod
  readonly headers: HashMap<string, string>
  readonly body: Maybe<RequestBody>
}

export interface MakeOptions {
  readonly params: Record<string, any>
  readonly headers: Record<string, string>
  readonly body: RequestBody
  readonly accept: string
  readonly acceptJson: boolean
}

const emptyRequest: Request = {
  _tag: "Request",
  method: "GET",
  url: "",
  urlParams: Chunk.empty(),
  headers: HashMap.empty(),
  body: Maybe.none(),
}

/**
 * @tsplus static effect-http/client/Request.Ops make
 */
export const make = (method: HttpMethod) => {
  let request: Request = {
    ...emptyRequest,
    method,
  }

  return (url: string, options: Partial<MakeOptions> = {}): Request => {
    request = {
      ...request,
      url,
    }

    if (options.body) {
      request = setBody(options.body)(request)
    }

    if (options.acceptJson) {
      request = acceptJson(request)
    }

    if (options.accept) {
      request = accept(options.accept)(request)
    }

    if (options.headers) {
      request = setHeaders(options.headers)(request)
    }

    if (options.params) {
      request = appendParams(options.params)(request)
    }

    if (options.body) {
      request = setBody(options.body)(request)
    }

    return request
  }
}

/**
 * @tsplus static effect-http/client/Request.Ops get
 */
export const get = make("GET")

/**
 * @tsplus static effect-http/client/Request.Ops post
 */
export const post = make("POST")

/**
 * @tsplus static effect-http/client/Request.Ops put
 */
export const put = make("PUT")

/**
 * @tsplus static effect-http/client/Request.Ops del
 */
export const del = make("DELETE")

/**
 * @tsplus static effect-http/client/Request.Ops patch
 */
export const patch = make("PATCH")

/**
 * @tsplus static effect-http/client/Request.Ops head
 */
export const head = make("HEAD")

/**
 * @tsplus static effect-http/client/Request.Ops options
 */
export const options = make("OPTIONS")

/**
 * @tsplus pipeable effect-http/client/Request setHeader
 */
export const setHeader =
  (name: string, value: string) =>
  (self: Request): Request => ({
    ...self,
    headers: self.headers.set(name.toLowerCase(), value),
  })

/**
 * @tsplus pipeable effect-http/client/Request setHeaders
 */
export const setHeaders =
  (headers: Record<string, string>) =>
  (self: Request): Request =>
    Object.entries(headers).reduce(
      (acc, [key, value]) => setHeader(key, value)(acc),
      self,
    )

/**
 * @tsplus pipeable effect-http/client/Request updateUrl
 */
export const updateUrl =
  (f: (url: string) => string) =>
  (self: Request): Request => ({
    ...self,
    url: f(self.url),
  })

/**
 * @tsplus pipeable effect-http/client/Request accept
 */
export const accept: (value: string) => (self: Request) => Request = (
  value: string,
) => setHeader("Accept", value)

/**
 * @tsplus getter effect-http/client/Request acceptJson
 */
export const acceptJson = accept("application/json")

/**
 * @tsplus pipeable effect-http/client/Request appendParam
 */
export const appendParam =
  (name: string, value: any) =>
  (self: Request): Request => {
    if (Array.isArray(value)) {
      return {
        ...self,
        urlParams: self.urlParams.concat(
          Chunk.fromIterable(value.map(_ => [name, _])),
        ),
      }
    } else if (typeof value === "string") {
      return {
        ...self,
        urlParams: self.urlParams.append([name, value]),
      }
    }

    return {
      ...self,
      urlParams: self.urlParams.append([name, JSON.stringify(value)]),
    }
  }

/**
 * @tsplus pipeable effect-http/client/Request appendParams
 */
export const appendParams =
  (params: Record<string, any>) =>
  (self: Request): Request =>
    Object.entries(params).reduce(
      (acc, [key, value]) => appendParam(key, value)(acc),
      self,
    )

/**
 * @tsplus pipeable effect-http/client/Request setParam
 */
export const setParam =
  (name: string, value: any) =>
  (self: Request): Request =>
    appendParam(
      name,
      value,
    )({
      ...self,
      urlParams: self.urlParams.filter(([key]) => key !== name),
    })

/**
 * @tsplus pipeable effect-http/client/Request setParams
 */
export const setParams =
  (params: Record<string, any>) =>
  (self: Request): Request =>
    Object.entries(params).reduce(
      (acc, [key, value]) => setParam(key, value)(acc),
      self,
    )

/**
 * @tsplus pipeable effect-http/client/Request setBody
 */
export const setBody =
  (body: RequestBody) =>
  (self: Request): Request => {
    let request: Request = {
      ...self,
      body: Maybe.some(body),
    }

    if (body._tag === "FormDataBody") {
      return request
    }

    request = body.contentType.match(
      () => request,
      contentType => setHeader("content-type", contentType)(request),
    )

    request = body.contentLength.match(
      () => request,
      contentLength =>
        setHeader("content-length", contentLength.toString())(request),
    )

    return request
  }

/**
 * @tsplus pipeable effect-http/client/Request textBody
 */
export const textBody =
  (value: string, contentType?: string) =>
  (self: Request): Request =>
    self.setBody(body.text(value, contentType))

/**
 * @tsplus pipeable effect-http/client/Request jsonBody
 */
export const jsonBody =
  (value: unknown) =>
  (self: Request): Request =>
    self.setBody(body.json(value)).acceptJson

/**
 * @tsplus pipeable effect-http/client/Request searchParamsBody
 */
export const searchParamsBody =
  (value: URLSearchParams) =>
  (self: Request): Request =>
    self.setBody(body.searchParams(value))

/**
 * @tsplus pipeable effect-http/client/Request formDataBody
 */
export const formDataBody =
  (value: FormData) =>
  (self: Request): Request =>
    self.setBody(body.formData(value))

/**
 * @tsplus pipeable effect-http/client/Request streamBody
 */
export const streamBody =
  (
    value: Stream<never, unknown, Uint8Array>,
    {
      contentType,
      contentLength,
    }: { contentType?: string; contentLength?: number } = {},
  ) =>
  (self: Request): Request =>
    self.setBody(body.stream(value, contentType, contentLength))

/**
 * @tsplus pipeable effect-http/client/Request withSchema
 */
export const withSchema = <I extends Json, O, R, E, A>(
  schema: Schema<I, O>,
  run: RequestExecutor<R, E, A>,
  options: ParseOptions = { isUnexpectedAllowed: true },
) => {
  const encode = schema.encodeEffect

  return (self: Request) =>
    (input: O): Effect<R, E | SchemaEncodeError, A> =>
      (encode(input, options) as unknown as Effect<never, ParseError, I>)
        .mapError(_ => new SchemaEncodeError(_, self))
        .flatMap(_ => run(self.jsonBody(_)))
}

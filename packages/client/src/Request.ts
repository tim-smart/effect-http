import { ParseOptions } from "@effect/schema/AST"
import { SchemaEncodeError } from "./Error.js"
import type { RequestBody } from "./Request/Body.js"
import * as body from "./Request/Body.js"
import { RequestExecutor } from "./Request/Executor.js"
import { Json, Schema } from "@effect/schema/Schema"
import { dual } from "@effect/data/Function"

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

export const empty: Request = {
  _tag: "Request",
  method: "GET",
  url: "",
  urlParams: Chunk.empty(),
  headers: HashMap.empty(),
  body: Maybe.none(),
}

export type MakeOptions = Omit<ModifyOptions, "method" | "url">

/**
 * @tsplus static effect-http/client/Request.Ops make
 */
export const make =
  (method: HttpMethod) =>
  (url: string, options: Partial<MakeOptions> = {}): Request =>
    modify(empty, { ...options, method, url })

export interface ModifyOptions {
  readonly method: HttpMethod
  readonly url: string
  readonly params: Record<string, any>
  readonly headers: Record<string, string>
  readonly body: RequestBody
  readonly accept: string
  readonly acceptJson: boolean
}

/**
 * @tsplus fluent effect-http/client/Request modify
 */
export const modify: {
  (options: Partial<ModifyOptions>): (self: Request) => Request
  (self: Request, options: Partial<ModifyOptions>): Request
} = dual(2, (self: Request, options: ModifyOptions) => {
  if (options.method) {
    self = setMethod(options.method)(self)
  }

  if (options.url) {
    self = setUrl(options.url)(self)
  }

  if (options.body) {
    self = setBody(options.body)(self)
  }

  if (options.acceptJson) {
    self = acceptJson(self)
  }

  if (options.accept) {
    self = accept(options.accept)(self)
  }

  if (options.headers) {
    self = setHeaders(options.headers)(self)
  }

  if (options.params) {
    self = appendParams(options.params)(self)
  }

  if (options.body) {
    self = setBody(options.body)(self)
  }

  return self
})

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
 * @tsplus fluent effect-http/client/Request setHeader
 */
export const setHeader: {
  (name: string, value: string): (self: Request) => Request
  (self: Request, name: string, value: string): Request
} = dual(3, (self: Request, name: string, value: string) => ({
  ...self,
  headers: self.headers.set(name.toLowerCase(), value),
}))

/**
 * @tsplus fluent effect-http/client/Request basicAuth
 */
export const basicAuth: {
  (username: string, password: string): (self: Request) => Request
  (self: Request, username: string, password: string): Request
} = dual(3, (self: Request, username: string, password: string) =>
  setHeader(self, "Authorization", `Basic ${btoa(`${username}:${password}`)}`),
)

/**
 * @tsplus fluent effect-http/client/Request setHeaders
 */
export const setHeaders: {
  (headers: Record<string, string>): (self: Request) => Request
  (self: Request, headers: Record<string, string>): Request
} = dual(2, (self: Request, headers: Record<string, string>) =>
  Object.entries(headers).reduce(
    (acc, [key, value]) => setHeader(acc, key, value),
    self,
  ),
)

/**
 * @tsplus fluent effect-http/client/Request setMethod
 */
export const setMethod: {
  (method: HttpMethod): (self: Request) => Request
  (self: Request, method: HttpMethod): Request
} = dual(2, (self: Request, method: HttpMethod) => ({ ...self, method }))

/**
 * @tsplus fluent effect-http/client/Request setUrl
 */
export const setUrl: {
  (url: string): (self: Request) => Request
  (self: Request, url: string): Request
} = dual(2, (self: Request, url: string) => ({ ...self, url }))

/**
 * @tsplus fluent effect-http/client/Request appendUrl
 */
export const appendUrl: {
  (path: string): (self: Request) => Request
  (self: Request, path: string): Request
} = dual(2, (self: Request, path: string) => ({
  ...self,
  url: `${self.url}${path}`,
}))

/**
 * @tsplus fluent effect-http/client/Request updateUrl
 */
export const updateUrl: {
  (f: (url: string) => string): (self: Request) => Request
  (self: Request, f: (url: string) => string): Request
} = dual(2, (self: Request, f: (url: string) => string) => ({
  ...self,
  url: f(self.url),
}))

/**
 * @tsplus fluent effect-http/client/Request accept
 */
export const accept: {
  (value: string): (self: Request) => Request
  (self: Request, value: string): Request
} = dual(2, (self: Request, value: string) => setHeader(self, "Accept", value))

/**
 * @tsplus getter effect-http/client/Request acceptJson
 */
export const acceptJson = accept("application/json")

/**
 * @tsplus fluent effect-http/client/Request appendParam
 */
export const appendParam: {
  (name: string, value: any): (self: Request) => Request
  (self: Request, name: string, value: any): Request
} = dual(3, (self: Request, name: string, value: any) => {
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
})

/**
 * @tsplus fluent effect-http/client/Request appendParams
 */
export const appendParams: {
  (params: Record<string, any>): (self: Request) => Request
  (self: Request, params: Record<string, any>): Request
} = dual(2, (self: Request, params: Record<string, any>) =>
  Object.entries(params).reduce(
    (acc, [key, value]) => appendParam(key, value)(acc),
    self,
  ),
)

/**
 * @tsplus fluent effect-http/client/Request setParam
 */
export const setParam: {
  (name: string, value: any): (self: Request) => Request
  (self: Request, name: string, value: any): Request
} = dual(3, (self: Request, name: string, value: any) =>
  appendParam(
    {
      ...self,
      urlParams: self.urlParams.filter(([key]) => key !== name),
    },
    name,
    value,
  ),
)

/**
 * @tsplus fluent effect-http/client/Request setParams
 */
export const setParams: {
  (params: Record<string, any>): (self: Request) => Request
  (self: Request, params: Record<string, any>): Request
} = dual(2, (self: Request, params: Record<string, any>) =>
  Object.entries(params).reduce(
    (acc, [key, value]) => setParam(acc, key, value),
    self,
  ),
)

/**
 * @tsplus fluent effect-http/client/Request setBody
 */
export const setBody: {
  (body: RequestBody): (self: Request) => Request
  (self: Request, body: RequestBody): Request
} = dual(2, (self: Request, body: RequestBody) => {
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
})

/**
 * @tsplus fluent effect-http/client/Request textBody
 */
export const textBody: {
  (value: string, contentType: string): (self: Request) => Request
  (self: Request, value: string, contentType: string): Request
} = dual(3, (self: Request, value: string, contentType: string) =>
  self.setBody(body.text(value, contentType)),
)

/**
 * @tsplus fluent effect-http/client/Request jsonBody
 */
export const jsonBody: {
  (value: unknown): (self: Request) => Request
  (self: Request, value: unknown): Request
} = dual(
  2,
  (self: Request, value: unknown) => self.setBody(body.json(value)).acceptJson,
)

/**
 * @tsplus fluent effect-http/client/Request searchParamsBody
 */
export const searchParamsBody: {
  (value: URLSearchParams): (self: Request) => Request
  (self: Request, value: URLSearchParams): Request
} = dual(2, (self: Request, value: URLSearchParams) =>
  self.setBody(body.searchParams(value)),
)

/**
 * @tsplus fluent effect-http/client/Request formDataBody
 */
export const formDataBody: {
  (value: FormData): (self: Request) => Request
  (self: Request, value: FormData): Request
} = dual(2, (self: Request, value: FormData) =>
  self.setBody(body.formData(value)),
)

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
  options?: ParseOptions,
) => {
  const encode = schema.encodeEffect

  return (self: Request) =>
    (input: O): Effect<R, E | SchemaEncodeError, A> =>
      encode(input, options)
        .mapError(_ => new SchemaEncodeError(_, self))
        .flatMap(_ => run(self.jsonBody(_)))
}

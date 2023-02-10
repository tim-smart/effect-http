import { ParseOptions } from "@fp-ts/schema/AST"
import { SchemaEncodeError } from "./Error.js"
import type { RequestBody } from "./Request/Body.js"
import * as body from "./Request/Body.js"
import { RequestExecutor } from "./Request/Executor.js"

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
  readonly headers: Chunk<[string, string]>
  readonly body: Maybe<RequestBody>
}

export interface MakeOptions {
  readonly params: Record<string, any>
  readonly headers: Record<string, string>
  readonly body: RequestBody
  readonly accept: string
  readonly acceptJson: boolean
}

/**
 * @tsplus static effect-http/client/Request.Ops make
 */
export const make =
  (method: HttpMethod) =>
  (url: string, options: Partial<MakeOptions> = {}): Request => {
    let request: Request = {
      _tag: "Request",
      method,
      url,
      urlParams: Chunk.empty(),
      headers: Chunk.empty(),
      body: Maybe.fromNullable(options.body),
    }

    if (options.acceptJson) {
      request = acceptJson(request)
    }

    if (options.accept) {
      request = accept(options.accept)(request)
    }

    if (options.headers) {
      request = addHeaders(options.headers)(request)
    }

    if (options.params) {
      request = appendParams(options.params)(request)
    }

    if (options.body) {
      request = setBody(options.body)(request)
    }

    return request
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
 * @tsplus pipeable effect-http/client/Request addHeader
 */
export const addHeader =
  (name: string, value: string) =>
  (self: Request): Request => ({
    ...self,
    headers: self.headers.append([name.toLowerCase(), value]),
  })

/**
 * @tsplus pipeable effect-http/client/Request addHeaders
 */
export const addHeaders =
  (headers: Record<string, string>) =>
  (self: Request): Request => ({
    ...self,
    headers: Object.entries(headers).reduce(
      (acc, [key, value]) => acc.append([key.toLowerCase(), value]),
      self.headers,
    ),
  })

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
export const accept =
  (value: string) =>
  (self: Request): Request =>
    addHeader("Accept", value)(self)

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
 * @tsplus pipeable effect-http/client/Request setBody
 */
export const setBody =
  (body: RequestBody) =>
  (self: Request): Request => {
    let request: Request = {
      ...self,
      headers: self.headers.append(["content-type", body.contentType]),
      body: Maybe.some(body),
    }

    if ("contentLength" in body && body.contentLength._tag === "Some") {
      request = addHeader(
        "content-length",
        body.contentLength.value.toString(),
      )(request)
    }

    return request
  }

/**
 * @tsplus pipeable effect-http/client/Request json
 */
export const json =
  (value: unknown) =>
  (self: Request): Request =>
    self.setBody(body.json(value)).acceptJson

/**
 * @tsplus pipeable effect-http/client/Request withSchema
 */
export const withSchema = <A, R, E, RA>(
  schema: Schema<A>,
  run: RequestExecutor<R, E, RA>,
  options?: ParseOptions,
) => {
  const encode = schema.encode

  return (self: Request) =>
    (input: A): Effect<R, E | SchemaEncodeError, RA> => {
      const encoded = encode(input, options)

      return encoded._tag === "Left"
        ? Effect.fail(new SchemaEncodeError(encoded.left, self))
        : run(self.json(encoded.right))
    }
}

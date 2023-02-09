import { HttpClientError } from "../Error.js"
import { Request } from "../Request.js"
import { Response } from "../Response.js"

export interface RequestExecutorFactory<O, A> {
  (options?: RequestExecutorOptions<O>): RequestExecutor<A>
}

/**
 * @tsplus type effect-http/client/RequestExecutor
 */
export interface RequestExecutor<A> {
  (request: Request): Effect<never, HttpClientError, A>
}

export interface RequestExecutorOptions<O> {
  readonly validateResponse?: (
    response: Response,
  ) => Effect<never, HttpClientError, Response>

  readonly executorOptions?: O
}

/**
 * @tsplus pipeable effect-http/client/RequestExecutor contramap
 */
export const contramap =
  (f: (a: Request) => Request) =>
  <A>(self: RequestExecutor<A>): RequestExecutor<A> =>
  request =>
    self(f(request))

/**
 * @tsplus pipeable effect-http/client/RequestExecutor map
 */
export const map =
  <A, B>(f: (a: A) => B) =>
  (self: RequestExecutor<A>): RequestExecutor<B> =>
  request =>
    self(request).map(f)

/**
 * @tsplus pipeable effect-http/client/RequestExecutor mapEffect
 */
export const mapEffect =
  <A, B>(f: (a: A) => Effect<never, HttpClientError, B>) =>
  (self: RequestExecutor<A>): RequestExecutor<B> =>
  request =>
    self(request).flatMap(f)

import { Predicate } from "@fp-ts/core/Predicate"
import { HttpClientError, StatusCodeError } from "../Error.js"
import { Request } from "../Request.js"
import { Response } from "../Response.js"

/**
 * @tsplus type effect-http/client/RequestExecutor
 */
export interface RequestExecutor<R, E, A> {
  (request: Request): Effect<R, E, A>
}

/**
 * Represents a service that can execute a request.
 *
 * Can be used for embedding a RequestExecutor into a Layer.
 *
 * @since 1.0.0
 */
export interface HttpRequestExecutor {
  readonly execute: RequestExecutor<never, HttpClientError, Response>
}

/**
 * A tag for the HttpRequestExecutor service.
 *
 * @since 1.0.0
 */
export const HttpRequestExecutor = Tag<HttpRequestExecutor>()

/**
 * @tsplus pipeable effect-http/client/RequestExecutor contramap
 */
export const contramap =
  (f: (a: Request) => Request) =>
  <R, E, A>(self: RequestExecutor<R, E, A>): RequestExecutor<R, E, A> =>
  request =>
    self(f(request))

/**
 * @tsplus pipeable effect-http/client/RequestExecutor contramapEffect
 */
export const contramapEffect =
  <R2, E2>(f: (a: Request) => Effect<R2, E2, Request>) =>
  <R1, E1, A>(
    self: RequestExecutor<R1, E1, A>,
  ): RequestExecutor<R1 | R2, E1 | E2, A> =>
  request =>
    f(request).flatMap(self)

/**
 * @tsplus pipeable effect-http/client/RequestExecutor map
 */
export const map =
  <A, B>(f: (a: A) => B) =>
  <R, E>(self: RequestExecutor<R, E, A>): RequestExecutor<R, E, B> =>
  request =>
    self(request).map(f)

/**
 * @tsplus pipeable effect-http/client/RequestExecutor mapEffect
 */
export const mapEffect =
  <R2, E2, A, B>(f: (a: A) => Effect<R2, E2, B>) =>
  <R1, E1>(
    self: RequestExecutor<R1, E1, A>,
  ): RequestExecutor<R1 | R2, E1 | E2, B> =>
  request =>
    self(request).flatMap(f)

/**
 * @tsplus pipeable effect-http/client/RequestExecutor filterStatus
 */
export const filterStatus =
  (f: (status: number) => boolean) =>
  <R, E>(
    self: RequestExecutor<R, E, Response>,
  ): RequestExecutor<R, E | StatusCodeError, Response> =>
  request =>
    self(request).filterOrElseWith(
      _ => f(_.status),
      _ => Effect.fail(new StatusCodeError(_)),
    )

/**
 * @tsplus pipeable effect-http/client/RequestExecutor filterOrElseWith
 */
export const filterOrElseWith =
  <A, R2, E2, B>(f: Predicate<A>, orElse: (a: A) => Effect<R2, E2, B>) =>
  <R, E>(
    self: RequestExecutor<R, E, A>,
  ): RequestExecutor<R2 | R, E2 | E, A | B> =>
  request =>
    self(request).filterOrElseWith(f, orElse)

/**
 * @tsplus pipeable effect-http/client/RequestExecutor catchTag
 */
export const catchTag =
  <K extends E["_tag"] & string, E extends { _tag: string }, R1, E1, A1>(
    tag: K,
    f: (e: E) => Effect<R1, E1, A1>,
  ) =>
  <R, A>(
    self: RequestExecutor<R, E, A>,
  ): RequestExecutor<R1 | R, E1 | Exclude<E, { _tag: K }>, A1 | A> =>
  request =>
    self(request).catchTag(tag, f)

/**
 * @tsplus pipeable effect-http/client/RequestExecutor catchTags
 */
export const catchTags =
  <
    E extends { _tag: string },
    Cases extends {
      [K in E["_tag"]]+?:
        | ((error: Extract<E, { _tag: K }>) => Effect<any, any, any>)
        | undefined
    },
  >(
    cases: Cases,
  ) =>
  <R, A>(
    self: RequestExecutor<R, E, A>,
  ): RequestExecutor<
    | R
    | {
        [K in keyof Cases]: Cases[K] extends (
          ...args: Array<any>
        ) => Effect<infer R, any, any>
          ? R
          : never
      }[keyof Cases],
    | Exclude<E, { _tag: keyof Cases }>
    | {
        [K in keyof Cases]: Cases[K] extends (
          ...args: Array<any>
        ) => Effect<any, infer E, any>
          ? E
          : never
      }[keyof Cases],
    | A
    | {
        [K in keyof Cases]: Cases[K] extends (
          ...args: Array<any>
        ) => Effect<any, any, infer A>
          ? A
          : never
      }[keyof Cases]
  > =>
  request =>
    self(request).catchTags(cases)

/**
 * @tsplus pipeable effect-http/client/RequestExecutor catchAll
 */
export const catchAll =
  <E, R2, E2, A2>(f: (e: E) => Effect<R2, E2, A2>) =>
  <R, A>(self: RequestExecutor<R, E, A>): RequestExecutor<R | R2, E2, A2 | A> =>
  request =>
    self(request).catchAll(f)

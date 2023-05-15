import { Predicate } from "@effect/data/Predicate"
import { RequestError, StatusCodeError } from "../Error.js"
import { Request } from "../Request.js"
import { Response } from "../Response.js"
import { dual } from "@effect/data/Function"

/**
 * Represents a function that can execute a request.
 *
 * It takes a `Request` and returns an Effect that returns the result.
 *
 * @tsplus type effect-http/client/RequestExecutor
 * @since 1.0.0
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
  readonly execute: RequestExecutor<never, RequestError, Response>
}

/**
 * A tag for the HttpRequestExecutor service.
 *
 * @since 1.0.0
 */
export const HttpRequestExecutor = Tag<HttpRequestExecutor>()

/**
 * @tsplus fluent effect-http/client/RequestExecutor contramap
 */
export const contramap: {
  (f: (a: Request) => Request): <R, E, A>(
    self: RequestExecutor<R, E, A>,
  ) => RequestExecutor<R, E, A>
  <R, E, A>(
    self: RequestExecutor<R, E, A>,
    f: (a: Request) => Request,
  ): RequestExecutor<R, E, A>
} = dual(
  2,
  <R, E, A>(
      self: RequestExecutor<R, E, A>,
      f: (a: Request) => Request,
    ): RequestExecutor<R, E, A> =>
    request =>
      self(f(request)),
)

/**
 * @tsplus fluent effect-http/client/RequestExecutor contramapEffect
 */
export const contramapEffect: {
  <R2, E2>(f: (a: Request) => Effect<R2, E2, Request>): <R1, E1, A>(
    self: RequestExecutor<R1, E1, A>,
  ) => RequestExecutor<R1 | R2, E1 | E2, A>
  <R1, R2, E1, E2, A>(
    self: RequestExecutor<R1, E1, A>,
    f: (a: Request) => Effect<R2, E2, Request>,
  ): RequestExecutor<R1 | R2, E1 | E2, A>
} = dual(
  2,
  <R1, R2, E1, E2, A>(
      self: RequestExecutor<R1, E1, A>,
      f: (a: Request) => Effect<R2, E2, Request>,
    ): RequestExecutor<R1 | R2, E1 | E2, A> =>
    request =>
      f(request).flatMap(self),
)

/**
 * @tsplus fluent effect-http/client/RequestExecutor contratapEffect
 */
export const contratapEffect: {
  <R2, E2, X>(f: (a: Request) => Effect<R2, E2, X>): <R1, E1, A>(
    self: RequestExecutor<R1, E1, A>,
  ) => RequestExecutor<R1 | R2, E1 | E2, A>
  <R1, R2, E1, E2, A, X>(
    self: RequestExecutor<R1, E1, A>,
    f: (a: Request) => Effect<R2, E2, X>,
  ): RequestExecutor<R1 | R2, E1 | E2, A>
} = dual(
  2,
  <R1, R2, E1, E2, A, X>(
      self: RequestExecutor<R1, E1, A>,
      f: (a: Request) => Effect<R2, E2, X>,
    ): RequestExecutor<R1 | R2, E1 | E2, A> =>
    request =>
      f(request).zipRight(self(request)),
)

/**
 * @tsplus fluent effect-http/client/RequestExecutor map
 */
export const map: {
  <A, B>(f: (a: A) => B): <R, E>(
    self: RequestExecutor<R, E, A>,
  ) => RequestExecutor<R, E, B>
  <R, E, A, B>(self: RequestExecutor<R, E, A>, f: (a: A) => B): RequestExecutor<
    R,
    E,
    B
  >
} = dual(
  2,
  <R, E, A, B>(
      self: RequestExecutor<R, E, A>,
      f: (a: A) => B,
    ): RequestExecutor<R, E, B> =>
    request =>
      self(request).map(f),
)

/**
 * @tsplus fluent effect-http/client/RequestExecutor mapEffect
 */
export const mapEffect: {
  <R2, E2, A, B>(f: (a: A) => Effect<R2, E2, B>): <R1, E1>(
    self: RequestExecutor<R1, E1, A>,
  ) => RequestExecutor<R1 | R2, E1 | E2, B>
  <R1, R2, E1, E2, A, B>(
    self: RequestExecutor<R1, E1, A>,
    f: (a: A) => Effect<R2, E2, B>,
  ): RequestExecutor<R1 | R2, E1 | E2, B>
} = dual(
  2,
  <R1, R2, E1, E2, A, B>(
      self: RequestExecutor<R1, E1, A>,
      f: (a: A) => Effect<R2, E2, B>,
    ): RequestExecutor<R1 | R2, E1 | E2, B> =>
    request =>
      self(request).flatMap(f),
)

/**
 * @tsplus fluent effect-http/client/RequestExecutor tapEffect
 */
export const tapEffect: {
  <R2, E2, A, X>(f: (a: A) => Effect<R2, E2, X>): <R1, E1>(
    self: RequestExecutor<R1, E1, A>,
  ) => RequestExecutor<R1 | R2, E1 | E2, A>
  <R1, R2, E1, E2, A, X>(
    self: RequestExecutor<R1, E1, A>,
    f: (a: A) => Effect<R2, E2, X>,
  ): RequestExecutor<R1 | R2, E1 | E2, A>
} = dual(
  2,
  <R1, R2, E1, E2, A, X>(
      self: RequestExecutor<R1, E1, A>,
      f: (a: A) => Effect<R2, E2, X>,
    ): RequestExecutor<R1 | R2, E1 | E2, A> =>
    request =>
      self(request).tap(f),
)

/**
 * @tsplus fluent effect-http/client/RequestExecutor filterStatus
 */
export const filterStatus: {
  (f: (status: number) => boolean): <R, E>(
    self: RequestExecutor<R, E, Response>,
  ) => RequestExecutor<R, E | StatusCodeError, Response>
  <R, E>(
    self: RequestExecutor<R, E, Response>,
    f: (status: number) => boolean,
  ): RequestExecutor<R, E | StatusCodeError, Response>
} = dual(
  2,
  <R, E>(
      self: RequestExecutor<R, E, Response>,
      f: (status: number) => boolean,
    ): RequestExecutor<R, E | StatusCodeError, Response> =>
    request =>
      self(request).filterOrElseWith(
        _ => f(_.status),
        _ => Effect.fail(new StatusCodeError(_)),
      ),
)

/**
 * @tsplus getter effect-http/client/RequestExecutor filterStatusOk
 */
export const filterStatusOk = filterStatus(_ => _ >= 200 && _ < 300)

/**
 * @tsplus fluent effect-http/client/RequestExecutor filterOrElseWith
 */
export const filterOrElseWith: {
  <A, R2, E2, B>(f: Predicate<A>, orElse: (a: A) => Effect<R2, E2, B>): <R, E>(
    self: RequestExecutor<R, E, A>,
  ) => RequestExecutor<R2 | R, E2 | E, A | B>
  <R, E, A, R2, E2, B>(
    self: RequestExecutor<R, E, A>,
    f: Predicate<A>,
    orElse: (a: A) => Effect<R2, E2, B>,
  ): RequestExecutor<R2 | R, E2 | E, A | B>
} = dual(
  3,
  <R, E, A, R2, E2, B>(
      self: RequestExecutor<R, E, A>,
      f: Predicate<A>,
      orElse: (a: A) => Effect<R2, E2, B>,
    ): RequestExecutor<R2 | R, E2 | E, A | B> =>
    request =>
      self(request).filterOrElseWith(f, orElse),
)

/**
 * @tsplus fluent effect-http/client/RequestExecutor retry
 */
export const retry: {
  <R1, E extends E0, E0, B>(policy: Schedule<R1, E0, B>): <R, A>(
    self: RequestExecutor<R, E, A>,
  ) => RequestExecutor<R1 | R, E, A>
  <R, E extends E0, E0, A, R1, B>(
    self: RequestExecutor<R, E, A>,
    policy: Schedule<R1, E0, B>,
  ): RequestExecutor<R | R1, E, A>
} = dual(
  2,
  <R, E extends E0, E0, A, R1, B>(
      self: RequestExecutor<R, E, A>,
      policy: Schedule<R1, E0, B>,
    ): RequestExecutor<R | R1, E, A> =>
    request =>
      self(request).retry(policy),
)

/**
 * @tsplus fluent effect-http/client/RequestExecutor catchTag
 */
export const catchTag: {
  <E extends { _tag: string }, K extends E["_tag"] & string, R1, E1, A1>(
    tag: K,
    f: (e: Extract<E, { _tag: K }>) => Effect<R1, E1, A1>,
  ): <R, A>(
    self: RequestExecutor<R, E, A>,
  ) => RequestExecutor<R1 | R, E1 | Exclude<E, { _tag: K }>, A1 | A>
  <R, E extends { _tag: string }, A, K extends E["_tag"] & string, E1, R1, A1>(
    self: RequestExecutor<R, E, A>,
    tag: K,
    f: (e: Extract<E, { _tag: K }>) => Effect<R1, E1, A1>,
  ): RequestExecutor<R1 | R, E1 | Exclude<E, { _tag: K }>, A1 | A>
} = dual(
  3,
  <R, E extends { _tag: string }, A, K extends E["_tag"] & string, E1, R1, A1>(
      self: RequestExecutor<R, E, A>,
      tag: K,
      f: (e: Extract<E, { _tag: K }>) => Effect<R1, E1, A1>,
    ): RequestExecutor<R1 | R, E1 | Exclude<E, { _tag: K }>, A1 | A> =>
    request =>
      self(request).catchTag(tag, f),
)

/**
 * @tsplus fluent effect-http/client/RequestExecutor catchTags
 */
export const catchTags: {
  <
    E extends { _tag: string },
    Cases extends {
      [K in E["_tag"]]+?:
        | ((error: Extract<E, { _tag: K }>) => Effect<any, any, any>)
        | undefined
    },
  >(
    cases: Cases,
  ): <R, A>(
    self: RequestExecutor<R, E, A>,
  ) => RequestExecutor<
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
  >
  <
    R,
    E extends { _tag: string },
    A,
    Cases extends {
      [K in E["_tag"]]+?:
        | ((error: Extract<E, { _tag: K }>) => Effect<any, any, any>)
        | undefined
    },
  >(
    self: RequestExecutor<R, E, A>,
    cases: Cases,
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
  >
} = dual(
  2,
  <
      R,
      E extends { _tag: string },
      A,
      Cases extends {
        [K in E["_tag"]]+?:
          | ((error: Extract<E, { _tag: K }>) => Effect<any, any, any>)
          | undefined
      },
    >(
      self: RequestExecutor<R, E, A>,
      cases: Cases,
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
      self(request).catchTags(cases),
)

/**
 * @tsplus fluent effect-http/client/RequestExecutor catchAll
 */
export const catchAll: {
  <E, R2, E2, A2>(f: (e: E) => Effect<R2, E2, A2>): <R, A>(
    self: RequestExecutor<R, E, A>,
  ) => RequestExecutor<R | R2, E2, A2 | A>
  <R, E, A, R2, E2, A2>(
    self: RequestExecutor<R, E, A>,
    f: (e: E) => Effect<R2, E2, A2>,
  ): RequestExecutor<R | R2, E2, A2 | A>
} = dual(
  2,

  <R, E, A, R2, E2, A2>(
      self: RequestExecutor<R, E, A>,
      f: (e: E) => Effect<R2, E2, A2>,
    ): RequestExecutor<R | R2, E2, A2 | A> =>
    request =>
      self(request).catchAll(f),
)

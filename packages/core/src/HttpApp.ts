import type { HttpResponse } from "./Response.js"

/**
 * @tsplus pipeable effect-http/HttpApp map
 */
export const map =
  (f: (r: HttpResponse) => HttpResponse) =>
  <R, E>(self: HttpApp<R, E>): HttpApp<R, E> =>
  (request) =>
    self(request).map(f)

/**
 * @tsplus pipeable effect-http/HttpApp map
 */
export const mapEffect =
  <R2, E2>(f: (r: HttpResponse) => Effect<R2, E2, HttpResponse>) =>
  <R, E>(self: HttpApp<R, E>): HttpApp<R | R2, E | E2> =>
  (request) =>
    self(request).flatMap(f)

/**
 * @tsplus pipeable effect-http/HttpApp catchTag
 */
export const catchTag =
  <K extends E["_tag"] & string, E extends { _tag: string }, R1, E1>(
    tag: K,
    onError: (e: Extract<E, { _tag: K }>) => Effect<R1, E1, HttpResponse>,
  ) =>
  <R>(self: HttpApp<R, E>): HttpApp<R | R1, E1 | Exclude<E, { _tag: K }>> =>
  (request) =>
    self(request).catchTag(tag, onError)

/**
 * @tsplus pipeable effect-http/HttpApp catchAll
 */
export const catchAll =
  <E, R1, E1>(onError: (e: E) => Effect<R1, E1, HttpResponse>) =>
  <R>(self: HttpApp<R, E>): HttpApp<R | R1, E1> =>
  (request) =>
    self(request).catchAll(onError)
/**
 * @tsplus pipeable effect-http/HttpApp applyMiddleware
 * @tsplus pipeable-operator effect-http/HttpApp >>
 */
export const applyMiddleware =
  <R, E, R1, E1>(fa: Middleware<R, E, R1, E1>) =>
  (self: HttpApp<R, E>): HttpApp<R1, E1> =>
    fa(self)
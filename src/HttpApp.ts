/**
 * @tsplus pipeable effect-bun-http/HttpApp map
 */
export const map =
  (f: (r: Response) => Response) =>
  <R, E>(self: HttpApp<R, E>): HttpApp<R, E> =>
  (url, request) =>
    self(url, request).map(f)

/**
 * @tsplus pipeable effect-bun-http/HttpApp map
 */
export const mapEffect =
  <R2, E2>(f: (r: Response) => Effect<R2, E2, Response>) =>
  <R, E>(self: HttpApp<R, E>): HttpApp<R | R2, E | E2> =>
  (url, request) =>
    self(url, request).flatMap(f)

/**
 * @tsplus pipeable effect-bun-http/HttpApp catchTag
 */
export const catchTag =
  <K extends E["_tag"] & string, E extends { _tag: string }, R1, E1>(
    tag: K,
    onError: (e: Extract<E, { _tag: K }>) => Effect<R1, E1, Response>,
  ) =>
  <R>(self: HttpApp<R, E>): HttpApp<R | R1, E1 | Exclude<E, { _tag: K }>> =>
  (url, request) =>
    self(url, request).catchTag(tag, onError)

/**
 * @tsplus pipeable effect-bun-http/HttpApp catchAll
 */
export const catchAll =
  <E, R1, E1>(onError: (e: E) => Effect<R1, E1, Response>) =>
  <R>(self: HttpApp<R, E>): HttpApp<R | R1, E1> =>
  (url, request) =>
    self(url, request).catchAll(onError)
/**
 * @tsplus pipeable effect-bun-http/HttpApp applyMiddleware
 * @tsplus pipeable-operator effect-bun-http/HttpApp >>
 */
export const applyMiddleware =
  <R, E, R1, E1>(fa: Middleware<R, E, R1, E1>) =>
  (self: HttpApp<R, E>): HttpApp<R1, E1> =>
    fa(self)

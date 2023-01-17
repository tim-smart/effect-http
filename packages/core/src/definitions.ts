import type { HTTPMethod } from "find-my-way"
import type { HttpRequest } from "./Request.js"
import type { HttpResponse } from "./Response.js"

/**
 * @tsplus type effect-http/HttpApp
 */
export interface HttpApp<R, E> {
  (request: HttpRequest): Effect<R, E, HttpResponse>
}

/**
 * @tsplus type effect-http/Middleware
 * @tsplus companion effect-http/Middleware.Ops
 */
export interface Middleware<RIn, EIn, ROut, EOut> {
  (self: HttpApp<RIn, EIn>): HttpApp<ROut, EOut>
}

/**
 * @tsplus static effect-http/Middleware.Ops make
 */
export const middleware = <RIn, EIn, ROut, EOut>(
  f: Middleware<RIn, EIn, ROut, EOut>,
): Middleware<RIn, EIn, ROut, EOut> => f

export class Route<R, E> {
  readonly _tag = "Route"

  constructor(
    readonly method: HTTPMethod,
    readonly path: string,
    readonly handler: Effect<RouteContext | R, E, HttpResponse>,
  ) {}
}

export class Concat<R, E> {
  readonly _tag = "Concat"
  constructor(readonly router: Router<R, E, any, any>) {}

  get routes() {
    return this.router.routes
  }

  get env() {
    return this.router.env
  }
}

export class ConcatWithPrefix<R, E> {
  readonly _tag = "ConcatWithPrefix"
  constructor(
    readonly router: Router<R, E, any, any>,
    readonly prefix: string,
  ) {}

  get routes() {
    return this.router.routes
  }

  get env() {
    return this.router.env
  }
}

export interface RouteContext {
  readonly request: HttpRequest
  readonly params: Record<string, string | undefined>
  readonly searchParams: Record<string, string>
}
export const RouteContext = Tag<RouteContext>()

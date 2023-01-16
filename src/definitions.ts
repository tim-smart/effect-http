import type { HTTPMethod } from "find-my-way"

/**
 * @tsplus type effect-bun-http/HttpApp
 */
export interface HttpApp<R, E> {
  (url: string, request: Request): Effect<R, E, Response>
}

/**
 * @tsplus type effect-bun-http/Middleware
 * @tsplus companion effect-bun-http/Middleware.Ops
 */
export interface Middleware<RIn, EIn, ROut, EOut> {
  (self: HttpApp<RIn, EIn>): HttpApp<ROut, EOut>
}

/**
 * @tsplus static effect-bun-http/Middleware.Ops make
 */
export const middleware = <RIn, EIn, ROut, EOut>(
  f: Middleware<RIn, EIn, ROut, EOut>,
): Middleware<RIn, EIn, ROut, EOut> => f

export class Route<R, E> {
  readonly _tag = "Route"

  constructor(
    readonly method: HTTPMethod,
    readonly path: string,
    readonly handler: Effect<RouteContext | R, E, Response>,
  ) {}

  // transform(f: (a: Effect<R, E, Response>) => Effect<R, E, Response>) {
  //   return new Route(this.method, this.path, f(this.handler as any))
  // }
}

export class Concat<R, E> {
  readonly _tag = "Concat"
  constructor(readonly router: Router<R, E, any, any>) {}

  get routes() {
    return this.router.routes
  }

  get layer() {
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

  get layer() {
    return this.router.env
  }
}

export interface RouteContext {
  request: Request
  params: Record<string, string | undefined>
  searchParams: Record<string, string>
}
export const RouteContext = Tag<RouteContext>()

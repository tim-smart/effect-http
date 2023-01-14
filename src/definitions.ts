import type { HTTPMethod } from "find-my-way"

export class Route<R, E> {
  readonly _tag = "Route"

  constructor(
    readonly method: HTTPMethod,
    readonly path: string,
    readonly handler: Effect<RouteContext | R, E, Response>,
    readonly env: Maybe<Effect<R, E, Context<any>>> = Maybe.none,
  ) {}

  provide(env: Effect<R, E, Context<any>>) {
    return new Route(
      this.method,
      this.path,
      this.handler,
      this.env.match(
        () => Maybe.some(env),
        (prevEnv) =>
          Maybe.some(
            prevEnv.flatMap((ctx) =>
              env.provideEnvironment(ctx).map((nextCtx) => ctx.merge(nextCtx)),
            ),
          ),
      ),
    )
  }

  maybeProvide(env: Maybe<Effect<R, E, Context<any>>>) {
    if (env._tag === "None") {
      return this
    }

    return this.provide(env.value)
  }

  get handlerWithEnv(): Effect<RouteContext | R, E, Response> {
    return this.env.match(
      () => this.handler,
      (env) =>
        env.flatMap((ctx) =>
          this.handler.provideSomeEnvironment((a) => a.merge(ctx)),
        ),
    )
  }

  transform(f: (a: Effect<R, E, Response>) => Effect<R, E, Response>) {
    return new Route(this.method, this.path, f(this.handler as any), this.env)
  }
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

export interface RouteContext {
  request: Request
  params: Record<string, string | undefined>
  searchParams: Record<string, string>
}
export const RouteContext = Tag<RouteContext>()

import type { HTTPMethod } from "find-my-way"

export type DefaultRequestEnv = RouteContext | RequestContext

export class Route<R, E> {
  readonly _tag = "Route"
  constructor(
    readonly method: HTTPMethod,
    readonly path: string,
    readonly handler: Effect<DefaultRequestEnv | R, E, Response>,
    readonly layer: Maybe<Layer<R, E, any>> = Maybe.none,
  ) {}

  provide(layer: Layer<R, E, any>) {
    return new Route(
      this.method,
      this.path,
      this.handler,
      this.layer.match(
        () => Maybe.some(layer),
        (prevLayer) => Maybe.some(layer.provideToAndMerge(prevLayer)),
      ),
    )
  }

  maybeProvide(layer: Maybe<Layer<R, E, any>>) {
    if (layer._tag === "None") {
      return this
    }

    return this.provide(layer.value)
  }

  get handlerWithEnv(): Effect<DefaultRequestEnv | R, E, Response> {
    return this.layer.match(
      () => this.handler,
      (layer) => this.handler.provideSomeLayer(layer),
    )
  }

  transform(f: (a: Effect<R, E, Response>) => Effect<R, E, Response>) {
    return new Route(this.method, this.path, f(this.handler as any), this.layer)
  }
}

export class Concat<R, E> {
  readonly _tag = "Concat"
  constructor(readonly router: Router<R, E>) {}

  get routes() {
    return this.router.routes
  }

  get layer() {
    return this.router.layer
  }
}

export interface RequestContext {
  request: Request
}
export const RequestContext = Tag<RequestContext>()

export interface RouteContext {
  params: Record<string, string | undefined>
  searchParams: Record<string, string>
}
export const RouteContext = Tag<RouteContext>()

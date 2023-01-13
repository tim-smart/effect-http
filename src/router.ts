import FindMyWay, { HTTPMethod } from "find-my-way"
import { catchTag } from "@effect/io/Effect"

export class Router<R = never, E = never, ReqR = never> {
  constructor(
    readonly routes: ReadonlyArray<Route<R, E> | Concat<R, E>> = [],
    readonly layer: Maybe<Layer<R, E, any>> = Maybe.none,
  ) {}

  combineWith<R2, E2>(
    router: Router<R2, E2, any>,
  ): Router<Exclude<R | R2, DefaultRequestEnv | ReqR>, E | E2, ReqR> {
    return new Router(
      [...this.routes, new Concat(router)] as any,
      this.layer as any,
    )
  }

  route<R2, E2>(
    method: HTTPMethod,
    path: string,
    handler: Effect<R2, E2, Response>,
  ) {
    return new Router<Exclude<R | R2, DefaultRequestEnv | ReqR>, E | E2, ReqR>(
      [...this.routes, new Route(method, path, handler)] as any,
      this.layer as any,
    )
  }

  provideRequestLayer<R2, E2, A>(layer: Layer<R2, E2, A>) {
    return new Router<
      Exclude<R | R2, DefaultRequestEnv | ReqR | A>,
      E | E2,
      ReqR | A
    >(
      this.routes as any,
      this.layer.match(
        () => Maybe.some(layer),
        (prevLayer) => Maybe.some(prevLayer.provideToAndMerge(layer)),
      ) as any,
    )
  }

  provideRequestService<A>(tag: Tag<A>, service: A) {
    const layer = Layer.succeed(tag)(service)
    return this.provideRequestLayer(layer)
  }

  get routesWithLayer(): Route<R, E>[] {
    const allRoutes = this.routes.flatMap((a) =>
      a._tag === "Route" ? [a] : a.router.routesWithLayer,
    )

    return allRoutes.map((r) => r.maybeProvide(this.layer))
  }

  get handle(): Effect<RequestContext | R, E | RouteNotFound, Response> {
    const routes = this.routesWithLayer
    const router = FindMyWay()

    for (const route of routes) {
      router.on(route.method, route.path, () => route)
    }

    return Do(($) => {
      const { request } = $(Effect.service(RequestContext))
      const findResult = router.find(request.method as HTTPMethod, request.url)
      $(findResult ? Effect.unit() : Effect.fail(new RouteNotFound(request)))

      const handler = findResult!.handler as any
      const route = handler() as Route<R, E>

      return $(
        pipe(
          route.handlerWithEnv,
          Effect.provideService(RequestContext)({ request }),
          Effect.provideService(RouteContext)({
            params: findResult!.params,
            searchParams: findResult!.searchParams,
          }),
        ),
      )
    })
  }
}

export class RouteNotFound {
  readonly _tag = "RouteNotFound"
  readonly method: string
  readonly url: string

  constructor(readonly request: Request) {
    this.method = request.method
    this.url = request.url
  }
}

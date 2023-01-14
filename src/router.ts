import FindMyWay, { HTTPMethod } from "find-my-way"

export class Router<R = never, E = never, EnvR = never, ReqR = never> {
  constructor(
    readonly routes: ReadonlyArray<Route<R, E> | Concat<R, E>> = [],
    readonly env: Maybe<Effect<R, E, Context<ReqR>>> = Maybe.none,
  ) {}

  combineWith<R2, E2, EnvR2>(
    router: Router<R2, E2, EnvR2, any>,
  ): Router<R | Exclude<R2 | EnvR2, ReqR>, E | E2, EnvR, ReqR> {
    return new Router(
      [...this.routes, new Concat(router)] as any,
      this.env as any,
    )
  }

  route<R2, E2>(
    method: HTTPMethod,
    path: string,
    handler: Effect<R2, E2, Response>,
  ) {
    return new Router<R | Exclude<R2, RouteContext | ReqR>, E | E2, EnvR, ReqR>(
      [...this.routes, new Route(method, path, handler)] as any,
      this.env as any,
    )
  }

  provideService<A>(tag: Tag<A>) {
    return (service: A) =>
      this.provideServiceEffect(tag)(Effect.succeed(service))
  }

  provideServiceEffect<A>(tag: Tag<A>) {
    return <R2, E2>(service: Effect<R2, E2, A>) =>
      new Router<
        Exclude<R, A> | Exclude<R2, RouteContext | ReqR>,
        E | E2,
        EnvR | Exclude<R2, RouteContext | ReqR>,
        ReqR | A
      >(
        this.routes as any,
        this.env
          .map((prevEnv) =>
            prevEnv.flatMap((ctx) =>
              service
                .provideSomeEnvironment((a) => a.merge(ctx))
                .map((a) => pipe(ctx, Context.add(tag)(a))),
            ),
          )
          .orElseSucceed(() => service.map((a) => Context.make(tag)(a))) as any,
      )
  }

  get routesWithLayer(): Route<R, E>[] {
    const allRoutes = this.routes.flatMap((a) =>
      a._tag === "Route" ? [a] : a.router.routesWithLayer,
    )

    return allRoutes.map((r) => r.maybeProvide(this.env))
  }

  handle<R2, E2>(
    transform: (
      a: Effect<R | EnvR, E | RouteNotFound, Response>,
    ) => Effect<R2, E2, Response>,
  ): (request: Request) => Effect<R2, E2, Response> {
    const routes = this.routesWithLayer
    const router = FindMyWay()

    for (const route of routes) {
      router.on(route.method, route.path, () => route)
    }

    return (request) => {
      const findResult = router.find(request.method as HTTPMethod, request.url)

      if (!findResult) {
        return transform(Effect.fail(new RouteNotFound(request)))
      }

      const handler = findResult!.handler as any
      const route = handler() as Route<R, E>
      const routeCtx = Context.make(RouteContext)({
        request,
        params: findResult!.params,
        searchParams: findResult!.searchParams,
      })

      return transform(
        route.handlerWithEnv.provideSomeEnvironment((a) => a.merge(routeCtx)),
      )
    }
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

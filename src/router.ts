import FindMyWay, { HTTPMethod } from "find-my-way"

type RequestHandler<R, E> = (
  request: Request,
  urlOverride?: string,
) => Effect<R, E, Response>

export class Router<R = never, E = never, EnvR = never, ReqR = never> {
  constructor(
    readonly routes: ReadonlyArray<Route<R, E> | Concat<R, E>> = [],
    readonly env: Maybe<Effect<R, E, Context<ReqR>>> = Maybe.none,
    readonly mounts: HashMap<string, RequestHandler<R, E>> = HashMap.empty(),
  ) {}

  combineWith<R2, E2, EnvR2>(
    router: Router<R2, E2, EnvR2, any>,
  ): Router<R | Exclude<R2 | EnvR2, ReqR>, E | E2, EnvR, ReqR> {
    return new Router(
      [...this.routes, new Concat(router)] as any,
      this.env as any,
      this.mounts,
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
      this.mounts,
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
        this.mounts as any,
      )
  }

  get routesWithEnv(): Route<R, E>[] {
    const allRoutes = this.routes.flatMap((a) =>
      a._tag === "Route" ? [a] : a.router.routesWithEnv,
    )

    return allRoutes.map((r) => r.maybeProvide(this.env))
  }

  mount<R2, E2>(path: string, handler: RequestHandler<R2, E2>) {
    path = path.endsWith("/") ? path.slice(0, -1) : path

    return new Router<R, E | Exclude<E2, RouteNotFound>, EnvR | R2, ReqR>(
      this.routes,
      this.env,
      this.mounts.set(path, handler as any),
    )
  }

  mountRouter<R2, E2, EnvR2>(
    path: string,
    router: Router<R2, E2, EnvR2, any> | Router<R2, E2, EnvR2, never>,
  ) {
    return this.mount(path, router.handle(identity))
  }

  handle<R2, E2>(
    transform: (
      a: Effect<R | EnvR, E | RouteNotFound, Response>,
    ) => Effect<R2, E2, Response>,
  ): RequestHandler<R2, E2> {
    const routes = this.routesWithEnv
    const router = FindMyWay()

    for (const route of routes) {
      const handler = route.handlerWithEnv
      router.on(route.method, route.path, () => handler)
    }

    const hasMounts = !this.mounts.isEmpty()
    const mounts = [...this.mounts]
    const mountsLength = mounts.length

    return (request, urlOverride) => {
      if (hasMounts) {
        const url = new URL(urlOverride ?? request.url)
        for (var i = 0; i < mountsLength; i++) {
          const [path, handler] = mounts[i]
          if (!(url.pathname === path || url.pathname.startsWith(`${path}/`))) {
            continue
          }

          url.pathname = url.pathname.slice(path.length)

          return transform(handler(request, url.toString()))
        }
      }

      const findResult = router.find(
        request.method as HTTPMethod,
        urlOverride ?? request.url,
      )

      if (!findResult) {
        return transform(Effect.fail(new RouteNotFound(request)))
      }

      const handler = findResult!.handler as any
      const routeHandler = handler() as Effect<R | RouteContext, E, Response>

      return transform(
        Effect.provideService(RouteContext)({
          request,
          params: findResult!.params,
          searchParams: findResult!.searchParams,
        })(routeHandler),
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

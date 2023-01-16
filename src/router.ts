import FindMyWay, { HTTPMethod } from "find-my-way"

export class Router<R = never, E = never, EnvR = never, ReqR = never> {
  constructor(
    readonly routes: ReadonlyArray<
      Route<R, E> | Concat<R, E> | ConcatWithPrefix<R, E>
    > = [],
    readonly env: Maybe<Effect<R, E, Context<ReqR>>> = Maybe.none,
    readonly mounts: HashMap<string, HttpApp<R, E>> = HashMap.empty(),
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

  mount<R2, E2>(path: string, handler: HttpApp<R2, E2>) {
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
  ): Router<R | Exclude<R2 | EnvR2, ReqR>, E | E2, EnvR, ReqR> {
    return new Router(
      [...this.routes, new ConcatWithPrefix(router as any, path)],
      this.env as any,
      this.mounts,
    )
  }

  routesWithEnv(
    prefix?: string,
  ): (readonly [Route<R, E>, Maybe<Effect<R, E, Context<ReqR>>>])[] {
    let allRoutes = this.routes.flatMap((a) =>
      a._tag === "Route"
        ? [[a, this.env] as const]
        : a._tag === "ConcatWithPrefix"
        ? a.router.routesWithEnv(prefix ? `${a.prefix}${prefix}` : a.prefix)
        : a.router.routesWithEnv(prefix),
    )

    if (prefix) {
      allRoutes = allRoutes.map(([a, env]) => [
        new Route(
          a.method,
          a.path === "/" ? prefix : prefix + a.path,
          a.handler,
        ),
        env,
      ])
    }

    return allRoutes.map(([route, env]) => [
      route,
      this.env.match(
        () => env,
        (selfEnv) =>
          env.match(
            () => Maybe.some(selfEnv),
            (prevEnv) =>
              Maybe.some(
                selfEnv.flatMap((selfCtx) =>
                  prevEnv
                    .provideSomeEnvironment((a: Context<any>) =>
                      a.merge(selfCtx),
                    )
                    .map((prevCtx) => selfCtx.merge(prevCtx)),
                ),
              ),
          ),
      ),
    ])
  }

  toHttpApp(): HttpApp<R | EnvR, E | RouteNotFound> {
    const routes = this.routesWithEnv()
    const router = FindMyWay()

    for (const [route, env] of routes) {
      const handler = env.match(
        () => route.handler,
        (env) =>
          env.flatMap((ctx) =>
            route.handler.provideSomeEnvironment((a) => a.merge(ctx)),
          ),
      )
      router.on(route.method, route.path, () => handler)
    }

    const hasMounts = !this.mounts.isEmpty()
    const mounts = [...this.mounts]
    const mountsLength = mounts.length

    return (url, request) => {
      if (hasMounts) {
        const urlObj = new URL(url)

        for (var i = 0; i < mountsLength; i++) {
          const [path, handler] = mounts[i]
          if (
            !(
              urlObj.pathname === path || urlObj.pathname.startsWith(`${path}/`)
            )
          ) {
            continue
          }

          urlObj.pathname = urlObj.pathname.slice(path.length)

          return handler(urlObj.toString(), request)
        }
      }

      const findResult = router.find(request.method as HTTPMethod, url)

      if (!findResult) {
        return Effect.fail(new RouteNotFound(request))
      }

      const handler = findResult!.handler as any
      const routeHandler = handler() as Effect<R | RouteContext, E, Response>

      return Effect.provideService(RouteContext)({
        request,
        params: findResult.params,
        searchParams: findResult.searchParams,
      })(routeHandler)
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

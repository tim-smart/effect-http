export class DecodeError {
  readonly _tag = "DecodeError"
  constructor(
    readonly errors: NonEmptyReadonlyArray<ParseError>,
    readonly request: Request,
    readonly body: unknown,
  ) {}
}

export const decode = <A>(schema: Schema<A>) => {
  const decode = Parser.decode(schema)

  return Do(($) => {
    const { request, params, searchParams } = $(Effect.service(RouteContext))
    const allParams = { ...searchParams, ...params }
    const body = $(parseBody(request))
    const paramsWithBody =
      body._tag === "Some"
        ? {
            ...allParams,
            ...(body.value as any),
          }
        : allParams

    return $(
      Effect.fromEither(
        decode(paramsWithBody).mapLeft(
          (errors) => new DecodeError(errors, request, paramsWithBody),
        ),
      ),
    )
  })
}

export class BodyParseError {
  readonly _tag = "BodyParseError"
  constructor(readonly reason: unknown, readonly request: Request) {}
}

export const parseBody = (request: Request) => {
  const contentType = request.headers.get("content-type")?.toLowerCase()

  if (contentType?.includes("application/json")) {
    return jsonBody(request).asSome
  } else if (contentType?.includes("application/x-www-form-urlencoded")) {
    return queryStringBody(request).asSome
  }

  return Effect.succeed(Maybe.none)
}

export const jsonBody = (request: Request) =>
  Effect.tryCatchPromise(
    () => request.json<unknown>(),
    (reason) => new BodyParseError(reason, request),
  )

export const queryStringBody = (request: Request) =>
  Effect.tryCatchPromise(
    () => request.text(),
    (reason) => new BodyParseError(reason, request),
  ).flatMap((a) =>
    Effect.tryCatch(
      () => Object.fromEntries(new URLSearchParams(a).entries()),
      (reason) => new BodyParseError(reason, request),
    ),
  )

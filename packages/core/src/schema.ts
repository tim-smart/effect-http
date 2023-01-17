import type { HttpRequest } from "./Request.js"

export class DecodeSchemaError {
  readonly _tag = "DecodeSchemaError"
  constructor(
    readonly errors: NonEmptyReadonlyArray<ParseError>,
    readonly request: HttpRequest,
    readonly body: unknown,
  ) {}
}

export const decode = <A>(schema: Schema<A>) => {
  const decode = Parser.decode(schema)

  return Do(($) => {
    const ctx = $(Effect.service(RouteContext))
    const params = $(parseBodyWithParams(ctx))

    return $(
      Effect.fromEither(
        decode(params).mapLeft(
          (errors) => new DecodeSchemaError(errors, ctx.request, params),
        ),
      ),
    )
  })
}

export const parseBodyWithParams = ({
  request,
  params,
  searchParams,
}: RouteContext) =>
  Do(($): unknown => {
    const allParams = { ...searchParams, ...params }
    const body = $(parseBody(request))

    return body._tag === "Some"
      ? {
          ...allParams,
          ...(body.value as any),
        }
      : allParams
  })

export const parseBody = (request: HttpRequest) => {
  const contentType = request.headers.get("content-type")?.toLowerCase()

  if (contentType?.includes("application/json")) {
    return request.json.asSome
  } else if (contentType?.includes("application/x-www-form-urlencoded")) {
    return queryStringBody(request).asSome
  }

  return Effect.succeed(Maybe.none)
}

export const queryStringBody = (request: HttpRequest) =>
  request.text.flatMap((a) =>
    Effect.tryCatch(
      () => Object.fromEntries(new URLSearchParams(a).entries()),
      (reason) => new RequestBodyError(reason),
    ),
  )

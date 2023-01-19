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

export const decodeParams = <A>(schema: Schema<A>) => {
  const decode = Parser.decode(schema)

  return Do(($) => {
    const { request, params, searchParams } = $(Effect.service(RouteContext))

    return $(
      Effect.fromEither(
        decode({
          ...params,
          ...searchParams,
        }).mapLeft((errors) => new DecodeSchemaError(errors, request, params)),
      ),
    )
  })
}

export const decodeJsonFromFormData =
  <A>(schema: Schema<A>) =>
  (key: string, formData?: FormData) => {
    const decode = Parser.decode(schema)

    return Do(($) => {
      const { request } = $(Effect.service(RouteContext))
      const data = $(formData ? Effect.succeed(formData) : request.formData)

      const result = Either.fromNullable(
        new RequestBodyError(`decodeFormData: ${key} not found`),
      )(data.get(key))
        .flatMap((a) =>
          Either.fromThrowable(
            () => JSON.parse(a.toString()) as unknown,
            (reason) => new RequestBodyError(reason),
          ),
        )
        .flatMap((a) =>
          decode(a).mapLeft(
            (errors) => new DecodeSchemaError(errors, request, a),
          ),
        )
        .map((value) => [value, formData!] as const)

      return $(Effect.fromEither(result))
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

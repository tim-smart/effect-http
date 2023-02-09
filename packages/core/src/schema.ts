import type { HttpRequest } from "./Request.js"

export class DecodeSchemaError {
  readonly _tag = "DecodeSchemaError"
  constructor(
    readonly errors: NonEmptyReadonlyArray<ParseError>,
    readonly request: HttpRequest,
    readonly body: unknown,
  ) {}
}

const decodeEffect = <A>(schema: Schema<A>) => {
  const decode = Parser.decode(schema)

  return (input: unknown, request: HttpRequest) => {
    const result = decode(input)

    return result._tag === "Left"
      ? Effect.fail(new DecodeSchemaError(result.left, request, input))
      : Effect.succeed(result.right)
  }
}

export const decode = <A>(schema: Schema<A>) => {
  const decode = decodeEffect(schema)

  return Do($ => {
    const ctx = $(Effect.service(RouteContext))
    const params = $(parseBodyWithParams(ctx))

    return $(decode(params, ctx.request))
  })
}

export const decodeParams = <A>(schema: Schema<A>) => {
  const decode = decodeEffect(schema)

  return Do($ => {
    const { request, params, searchParams } = $(Effect.service(RouteContext))
    return $(decode({ ...params, ...searchParams }, request))
  })
}

export class FormDataKeyNotFound {
  readonly _tag = "FormDataKeyNotFound"
  constructor(readonly key: string) {}
}

const jsonParse = Either.liftThrowable(
  (_: string) => JSON.parse(_) as unknown,
  _ => new RequestBodyError(_),
)

export const decodeJsonFromFormData =
  <A>(schema: Schema<A>) =>
  (key: string, formData?: FormData) => {
    const decode = Parser.decode(schema)

    return Do($ => {
      const { request } = $(Effect.service(RouteContext))
      const data = $(formData ? Effect.succeed(formData) : request.formData)

      const result = Either.fromNullable(
        data.get(key),
        () => new RequestBodyError(new FormDataKeyNotFound(key)),
      )
        .flatMap(_ => jsonParse(_.toString()))
        .flatMap(_ => {
          const result = decode(_)
          return result._tag === "Left"
            ? Either.left(new DecodeSchemaError(result.left, request, _))
            : Either.right(result.right)
        })
        .map(value => [value, data] as const)

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

  return Effect.succeed(Maybe.none())
}

export const queryStringBody = (request: HttpRequest) =>
  request.text.flatMap(a =>
    Effect.tryCatch(
      () => Object.fromEntries(new URLSearchParams(a).entries()),
      reason => new RequestBodyError(reason),
    ),
  )

import BB from "busboy"
import type { Effect } from "@effect/io/Effect"
import { RequestBodyError } from "@effect-http/core/Request"
import { IncomingMessage } from "http"
import * as Stream from "@effect/stream/Stream"
import {
  FormDataField,
  FormDataFile,
  FormDataFileError,
  FormDataPart,
} from "@effect-http/core/multipart"
import * as OS from "os"
import * as NS from "stream/promises"
import * as Path from "path"
import * as NFS from "fs"
import * as Crypto from "crypto"
import { fromReadable, readableToString } from "./stream.js"

export interface MultipartOptions {
  limits: BB.Limits
  /**
   * Convert files with this MIME type to FormData fields instead of File's
   */
  multipartFieldTypes: string[]
}

export const fromRequest = (
  source: IncomingMessage,
  { limits, multipartFieldTypes }: MultipartOptions,
) => {
  const make = Effect(() => BB({ headers: source.headers, limits }))
    .acquireRelease(_ =>
      Effect(() => {
        _.removeAllListeners()

        if (!_.closed) {
          _.destroy()
        }
      }),
    )
    .map(bb =>
      Stream.async<never, RequestBodyError, FormDataPart>(emit => {
        bb.on("field", (name, value, info) => {
          emit.single(new FormDataField(name, info.mimeType, value))
        })

        bb.on("file", (name, stream, info) => {
          emit.single(
            new FormDataFile(
              name,
              info.filename,
              info.mimeType,
              fromReadable<Uint8Array>(() => stream).mapError(
                _ =>
                  new FormDataFileError(name, info.filename, info.mimeType, _),
              ),
              stream,
            ),
          )
        })

        bb.on("error", _ => {
          emit.fail(new RequestBodyError(_))
        })

        bb.on("finish", () => {
          emit.end()
        })

        source.pipe(bb)
      }).mapEffect(part =>
        part._tag === "FormDataFile" &&
        multipartFieldTypes.some(_ => part.contentType.includes(_))
          ? readableToString(part.source as any)
              .map(body => new FormDataField(part.key, part.contentType, body))
              .mapError(_ => new RequestBodyError(_))
          : Effect.succeed(part),
      ),
    )

  return Stream.unwrapScoped(make)
}

export const formData = (source: IncomingMessage, opts: MultipartOptions) =>
  fromRequest(source, opts).runFoldEffect(new FormData(), (formData, part) => {
    if (part._tag === "FormDataField") {
      formData.append(part.key, part.value)
      return Effect.succeed(formData)
    }

    return Do($ => {
      const dir = $(randomTmpDir.mapError(e => new RequestBodyError(e)))
      const path = Path.join(dir, part.name)

      formData.append(part.key, new Blob(), path)

      return $(
        Effect.attemptCatchPromise(
          () => NS.pipeline(part.source as any, NFS.createWriteStream(path)),
          reason => new RequestBodyError(reason),
        ).as(formData),
      )
    })
  })

const randomTmpDir = Effect.async<never, NodeJS.ErrnoException, string>(
  resume => {
    const random = Crypto.randomBytes(10).toString("hex")
    const dir = Path.join(OS.tmpdir(), random)

    NFS.mkdir(dir, err => {
      if (err) {
        resume(Effect.fail(err))
      } else {
        resume(Effect.succeed(dir))
      }
    })
  },
)

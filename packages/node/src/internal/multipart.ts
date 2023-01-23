import BB from "busboy"
import type { Effect } from "@effect/io/Effect"
import { RequestBodyError } from "@effect-http/core/Request"
import { IncomingMessage } from "http"
import { Readable } from "stream"
import * as Stream from "@effect/stream/Stream"
import {
  FormDataField,
  FormDataFile,
  FormDataPart,
} from "@effect-http/core/multipart"
import { flow } from "@fp-ts/data/Function"
import * as OS from "os"
import * as NS from "stream/promises"
import * as Path from "path"
import * as NFS from "fs"
import * as Crypto from "crypto"
import { readableToString } from "./stream.js"

export const fromRequest = (source: IncomingMessage, limits: BB.Limits) => {
  const make = Effect(BB({ headers: source.headers, limits }))
    .acquireRelease((_) =>
      Effect(() => {
        _.removeAllListeners()

        if (!_.closed) {
          _.destroy()
        }
      }),
    )
    .map((bb) =>
      Stream.async<never, RequestBodyError, FormDataPart>((emit) => {
        bb.on("field", (name, value, info) => {
          emit.single(new FormDataField(name, info.mimeType, value))
        })

        bb.on("file", (name, stream, info) => {
          emit.single(
            new FormDataFile(
              name,
              info.filename,
              info.mimeType,
              () => Readable.toWeb(stream) as any,
              stream,
            ),
          )
        })

        bb.on("error", (_) => {
          emit.fail(new RequestBodyError(_))
        })

        bb.on("finish", () => {
          emit.end()
        })

        source.pipe(bb)
      }),
    )

  return Stream.unwrapScoped(make)
}

const toFieldContentTypes = ["application/json"]

export const formData = flow(fromRequest, (_) =>
  _.runFoldEffect(new FormData(), (formData, part) => {
    if (part._tag === "FormDataField") {
      formData.append(part.key, part.value)
      return Effect.succeed(formData)
    } else if (toFieldContentTypes.some((_) => part.contentType.includes(_))) {
      return readableToString(part.source as any)
        .map((_) => {
          formData.append(part.key, _)
          return formData
        })
        .mapError((_) => new RequestBodyError(_))
    }

    return Do(($) => {
      const dir = $(randomTmpDir.mapError((e) => new RequestBodyError(e)))
      const path = Path.join(dir, part.name)

      formData.append(part.key, new Blob(), path)

      return $(
        Effect.tryCatchPromise(
          () => NS.pipeline(part.source as any, NFS.createWriteStream(path)),
          (reason) => new RequestBodyError(reason),
        ).as(formData),
      )
    })
  }),
)

const randomTmpDir = Effect.async<never, NodeJS.ErrnoException, string>(
  (resume) => {
    const random = Crypto.randomBytes(10).toString("hex")
    const dir = Path.join(OS.tmpdir(), random)

    NFS.mkdir(dir, (err) => {
      if (err) {
        resume(Effect.fail(err))
      } else {
        resume(Effect.succeed(dir))
      }
    })
  },
)

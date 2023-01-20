export type FormDataPart = FormDataField | FormDataFile

export class FormDataField {
  readonly _tag = "FormDataField"
  constructor(readonly key: string, readonly value: string) {}
}

export class FormDataFile {
  readonly _tag = "FormDataField"
  constructor(
    readonly name: string,
    readonly contentType: string,
    readonly size: number,
    readonly content: Stream<never, ReadableStreamError, Uint8Array>,
  ) {}
}

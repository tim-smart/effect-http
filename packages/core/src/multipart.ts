export type FormDataPart = FormDataField | FormDataFile

export class FormDataField {
  readonly _tag = "FormDataField"

  constructor(
    readonly key: string,
    readonly contentType: string,
    readonly value: string,
  ) {}
}

export class FormDataFileError {
  readonly _tag = "FormDataFileError"

  constructor(
    readonly key: string,
    readonly name: string,
    readonly contentType: string,
    readonly error: unknown,
  ) {}
}

export class FormDataFile {
  readonly _tag = "FormDataFile"

  constructor(
    readonly key: string,
    readonly name: string,
    readonly contentType: string,
    readonly content: Stream<never, FormDataFileError, Uint8Array>,
    readonly source?: unknown,
  ) {}
}

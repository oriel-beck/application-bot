/** Thrown by a handler to fail the current call with a BDFD-style error reason. */
export class FailSignal {
  constructor(readonly reason: string) {}
}

/** Thrown by a handler that can't evaluate this particular call (e.g. an unknown user ID). */
export class NotSimulatedSignal {
  constructor(readonly reason: string) {}
}

/** `$stop`: end execution, keeping what was output so far. */
export class StopSignal {}

/** `$onlyIf` / `$argsCheck` failure: the response becomes just this message. */
export class ResponseSignal {
  constructor(
    readonly content: string,
    readonly by: 'onlyIf' | 'argsCheck'
  ) {}
}

/** Control flow depends on a value the simulator can't compute, so it can't know what runs next. */
export class UnsupportedSignal {
  constructor(readonly reason: string) {}
}

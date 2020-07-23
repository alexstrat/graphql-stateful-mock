type Ref = {
  $ref: string,
};

export function isRef(maybeRef: unknown): maybeRef is Ref {
  return maybeRef && typeof maybeRef === 'object' && maybeRef.hasOwnProperty('$ref');
};

export function assertIsRef(maybeRef: unknown, message?: string): asserts maybeRef is Ref {
  if (!isRef(maybeRef)) {
    throw new Error(message || `Expected ${maybeRef} to be a valid Ref.`);
  }
};

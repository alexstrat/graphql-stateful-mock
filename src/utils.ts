import { Ref, KeyTypeConstraints } from "./types";

export function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    // eslint-disable-next-line eqeqeq
    const v = c == 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export const randomListLength = () => 1 + Math.round(Math.random() * 10);

export const takeRandom = <T>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

export function makeRef<KeyT extends KeyTypeConstraints = string>(typeName: string, key: KeyT): Ref<KeyT> {
  return { $ref: { key, typeName} };
}

export function isObject(thing: any) {
  return thing === Object(thing) && !Array.isArray(thing);
}

export function copyOwnPropsIfNotPresent(target: Record<string, any>, source: Record<string, any>) {
  Object.getOwnPropertyNames(source).forEach(prop => {
    if (!Object.getOwnPropertyDescriptor(target, prop)) {
      const propertyDescriptor = Object.getOwnPropertyDescriptor(source, prop);
      Object.defineProperty(target, prop, propertyDescriptor == null ? {} : propertyDescriptor);
    }
  });
}

export function copyOwnProps(target: Record<string, any>, ...sources: Array<Record<string, any>>) {
  sources.forEach(source => {
    let chain = source;
    while (chain != null) {
      copyOwnPropsIfNotPresent(target, chain);
      chain = Object.getPrototypeOf(chain);
    }
  });
  return target;
}

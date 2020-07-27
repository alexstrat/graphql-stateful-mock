import { Ref } from "./types";

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

export function makeRef<KeyT = string>(key: KeyT): Ref<KeyT> {
  return { $ref: key };
}

export interface AwsLocation {
  envName: string;
  account: string;
  region: string;
}

export type WrittenLocation = string & { readonly __brand: "WrittenLocation" };

export function createWrittenLocation<T extends string>(value: T): WrittenLocation & T {
  return value as WrittenLocation & T;
}

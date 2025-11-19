// export enum SourceLocation {
//   TARGET = "TARGET",
//   GLOBAL = "GLOBAL",
//   CENTRAL = "CENTRAL",
//   LOCAL = "LOCAL",
// } // TODO: this is still problematic. It needs to be extensible while maintaining strong types.

export interface AwsLocation {
  envName: string;
  account: string;
  region: string;
}

// export type WriterLocation = string;

/**
 * New stuff
 */
export type WrittenLocation = string & { readonly __brand: "WrittenLocation" };

export function createWrittenLocation<T extends string>(value: T): WrittenLocation & T {
  return value as WrittenLocation & T;
}

export enum SourceLocation {
  TARGET = "TARGET",
  GLOBAL = "GLOBAL",
  CENTRAL = "CENTRAL",
  LOCAL = "LOCAL",
}

export interface AwsLocation {
  envName: string;
  account: string;
  region: string;
}

export type WriterLocation = string;

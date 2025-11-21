import { Construct } from "constructs";
import { KeyDecorator } from "./key-decorator";
import { SourceLocation, WrittenLocation } from "./locations";
import { DependencySource } from "./source/dependency-source";

export interface Dependency {
  readonly constant: string[];
  construct: Construct;
  getKeyName(keyDecorator: KeyDecorator): string;
}

export interface Writer extends Dependency {
  dehydrate(scope: Construct, keyDecorator: KeyDecorator): void;
}

export interface Reader extends Dependency {
  writer: Writer;
  writerLocation: WrittenLocation;
  get value(): any;
  fetch(keyDecorator: KeyDecorator, sources: { [key in SourceLocation]: DependencySource }): any;
}

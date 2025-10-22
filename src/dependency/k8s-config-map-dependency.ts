import { KubeConfigMap } from "cdk8s-plus-28/lib/imports/k8s";
import { Construct } from "constructs";
import { join, kebabCase } from "lodash";
import { Dependency, Reader, Writer } from "./dependency-interface";
import { KeyDecorator } from "./key-decorator";
import { WriterLocation } from "./source-location";
import { DependencySource } from "./source/dependency-source";

export abstract class K8sConfigMapDependency implements Dependency {
  readonly constant: string[];
  public construct: KubeConfigMap;
  readonly decorator: { (...args: string[]): string };

  constructor(constant: string[], decorator: { (...args: string[]): string }) {
    this.constant = constant;
    this.decorator = decorator;
  }

  public getKeyName(keyDecorator: KeyDecorator): string {
    return this.decorator.call(keyDecorator, ...this.constant);
  }
}

export class K8sConfigMapStringWriter extends K8sConfigMapDependency implements Writer {
  protected _value: string;

  public set value(value: string) {
    this._value = value;
  }

  public get value(): string {
    if (this._value === undefined) {
      throw new Error(`A value for ${this.constant} hasn't been set yet. This is likely a bug.`);
    }

    return this._value;
  }

  public dehydrate(scope: Construct, keyDecorator: KeyDecorator) {
    const key = this.getKeyName(keyDecorator);
    const id = kebabCase(join(this.constant, "-"));

    if (this.construct !== undefined) {
      throw new Error(`A ConfigMap construct for ${key} already exists. Use cloneDeep() on your deps.`);
    }

    this.construct = new KubeConfigMap(scope, id, {
      metadata: {
        name: key,
        namespace: "default", // TODO: This should come from the Jig config objects
      },
      data: {
        value: this.value,
      },
    });
  }
}

export class K8sConfigMapStringReader extends K8sConfigMapDependency implements Reader {
  protected _value: string;
  public writer: K8sConfigMapStringWriter;
  readonly writerLocation: WriterLocation;

  constructor(writer: K8sConfigMapStringWriter, writerLocation: WriterLocation) {
    super(writer.constant, writer.decorator);
    this.writer = writer;
    this.writerLocation = writerLocation;
  }

  public get value(): string {
    if (this._value === undefined) {
      throw new Error(`A value for ${this.constant} hasn't been fetched yet. This is likely a bug.`);
    }

    return this._value;
  }

  public fetch(keyDecorator: KeyDecorator, sources: { [key: WriterLocation]: DependencySource }) {
    this._value = sources[this.writerLocation].getString(this.getKeyName(keyDecorator));

    return this._value;
  }
}

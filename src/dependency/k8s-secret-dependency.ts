import { KubeSecret } from "cdk8s-plus-28/lib/imports/k8s";
import { Construct } from "constructs";
import { join, kebabCase } from "lodash";
import { Dependency, Reader, Writer } from "./dependency-interface";
import { KeyDecorator } from "./key-decorator";
import { WrittenLocation } from "./source-location";
import { DependencySource } from "./source/dependency-source";

export abstract class K8sSecretDependency implements Dependency {
  readonly constant: string[];
  public construct: KubeSecret;
  readonly decorator: { (...args: string[]): string };

  constructor(constant: string[], decorator: { (...args: string[]): string }) {
    this.constant = constant;
    this.decorator = decorator;
  }

  public getKeyName(keyDecorator: KeyDecorator): string {
    return this.decorator.call(keyDecorator, ...this.constant);
  }
}

export class K8sSecretStringWriter extends K8sSecretDependency implements Writer {
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
      throw new Error(`A Secret construct for ${key} already exists. Use cloneDeep() on your deps.`);
    }

    this.construct = new KubeSecret(scope, id, {
      metadata: {
        name: key,
        namespace: "default", // TODO: Needs come from outside
      },
      type: "Opaque",
      data: {
        value: Buffer.from(this.value).toString("base64"),
      },
    });
  }
}

export class K8sSecretStringReader extends K8sSecretDependency implements Reader {
  protected _value: string;
  public writer: K8sSecretStringWriter;
  readonly writerLocation: WrittenLocation;

  constructor(writer: K8sSecretStringWriter, writerLocation: WrittenLocation) {
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

  public fetch(keyDecorator: KeyDecorator, sources: { [key: WrittenLocation]: DependencySource }) {
    this._value = sources[this.writerLocation].getSecret(this.getKeyName(keyDecorator));

    return this._value;
  }
}

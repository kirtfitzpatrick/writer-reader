import { Secret } from "aws-cdk-lib/aws-secretsmanager";
import { Construct } from "constructs";
import { join, kebabCase } from "lodash";
import { Dependency, Reader, Writer } from "./dependency-interface";
import { KeyDecorator } from "./key-decorator";
import { WrittenLocation } from "./locations";
import { DependencySource } from "./source/dependency-source";

export abstract class AwsSecretsManagerDependency implements Dependency {
  readonly constant: string[];
  public construct: Secret;
  readonly decorator: { (...args: string[]): string };

  constructor(constant: string[], decorator: { (...args: string[]): string }) {
    this.constant = constant;
    this.decorator = decorator;
  }

  public getKeyName(keyDecorator: KeyDecorator): string {
    return this.decorator.call(keyDecorator, ...this.constant);
  }
}

/**
 * String Writer / Readers
 */
export class AwsSecretsManagerStringWriter extends AwsSecretsManagerDependency implements Writer {
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
}

export class AwsSecretsManagerStringReader extends AwsSecretsManagerDependency implements Reader {
  protected _value: string;
  public writer: AwsSecretsManagerStringWriter;
  readonly writerLocation: WrittenLocation;

  constructor(writer: AwsSecretsManagerStringWriter, writerLocation: WrittenLocation) {
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

  /**
   * TODO: Implement tokenization for secret strings. I haven't had a use case for this yet.
   */
}

/**
 * Object Writer / Readers
 */
export class AwsSecretsManagerObjectWriter<TType> extends AwsSecretsManagerDependency implements Writer {
  protected _value: TType;

  public set value(value: TType) {
    this._value = value;
  }

  public get value(): TType {
    if (this._value === undefined) {
      throw new Error(`A value for ${this.constant} hasn't been set yet. This is likely a bug.`);
    }

    return this._value;
  }

  /**
   * In practice this should never be used and instead the secret construct should
   * be defined in the user's codebase and assigned to the construct property.
   * The writer class should be used to generate the key name correctly within their code.
   * TODO: why is this here? Oh, to implement the interface.
   *
   * @param scope
   * @param keyDecorator
   */
  public dehydrate(scope: Construct, keyDecorator: KeyDecorator) {
    const key = this.getKeyName(keyDecorator);
    const id = kebabCase(join(this.constant, "-"));

    if (this.construct === undefined) {
      throw new Error(
        `Secrets should be defined in your code using the getKeyName method to build the correct secretName. Hardcoding secrets into templates is unsafe.`
      );
    }
  }
}

export class AwsSecretsManagerObjectReader<TType> extends AwsSecretsManagerDependency implements Reader {
  protected _value: TType;
  public writer: AwsSecretsManagerObjectWriter<TType>;
  readonly writerLocation: WrittenLocation;

  constructor(writer: AwsSecretsManagerObjectWriter<TType>, writerLocation: WrittenLocation) {
    super(writer.constant, writer.decorator);
    this.writer = writer;
    this.writerLocation = writerLocation;
  }

  public get value(): TType {
    if (this._value === undefined) {
      throw new Error(`A value for ${this.constant} hasn't been fetched yet. This is likely a bug.`);
    }

    return this._value;
  }

  public fetch(keyDecorator: KeyDecorator, sources: { [key: WrittenLocation]: DependencySource }): TType {
    const json = sources[this.writerLocation].getSecret(this.getKeyName(keyDecorator));
    this._value = JSON.parse(json);

    return this._value;
  }
}

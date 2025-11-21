import { CfnParameter } from "aws-cdk-lib";
import { StringParameter } from "aws-cdk-lib/aws-ssm";
import { Construct } from "constructs";
import { join, kebabCase } from "lodash";
import { MacroStack } from "../cfn-token/macro-stack";
import { FgGray, FgIn, Reset } from "../lib/colors";
import { Dependency, Reader, Writer } from "./dependency-interface";
import { AWS_LOCAL, JigBaseStackProps } from "./jig-base";
import { KeyDecorator } from "./key-decorator";
import { AwsLocation, WrittenLocation } from "./locations";
import { DependencySource } from "./source/dependency-source";

export abstract class AwsParameterStoreDependency implements Dependency {
  readonly constant: string[];
  public construct: StringParameter;
  readonly decorator: { (...args: string[]): string };

  constructor(constant: string[], decorator: { (...args: string[]): string }) {
    this.constant = constant;
    this.decorator = decorator;
  }

  public getKeyName(keyDecorator: KeyDecorator): string {
    return this.decorator.call(keyDecorator, ...this.constant);
  }
}

export class AwsParameterStoreStringWriter extends AwsParameterStoreDependency implements Writer {
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
    const id = kebabCase(join(this.constant, "-")); // TODO: the public should be able to customize the naming scheme

    if (this.construct !== undefined) {
      throw new Error(`A ConfigMap construct for ${key} already exists. Use cloneDeep() on your deps.`);
    }

    this.construct = new StringParameter(scope, id, {
      parameterName: key,
      stringValue: this.value,
    });
  }
}

export class AwsParameterStoreStringReader extends AwsParameterStoreDependency implements Reader {
  protected _value: string;
  public writer: AwsParameterStoreStringWriter;
  readonly writerLocation: WrittenLocation;

  constructor(writer: AwsParameterStoreStringWriter, writerLocation: WrittenLocation) {
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
    this._value = sources[this.writerLocation].getString(this.getKeyName(keyDecorator));

    return this._value;
  }

  public tokenize(scope: Construct, props: JigBaseStackProps): string {
    if (this.writerLocation === props.jig.localLocation) {
      // CfnParameter
      return this.paramStoreCfnToken(scope, props.jig.getTargetDecorator());
    } else {
      // Fn::Transform / Macro
      return this.paramStoreTransformToken(props.jig.getTargetDecorator(), props.jig.getLocations());
    }
  }

  public paramStoreCfnToken(scope: Construct, decorator: KeyDecorator): string {
    const keyName = this.getKeyName(decorator);

    const cfnParam = new CfnParameter(scope, join(keyName, "CfnParameter"), {
      type: "AWS::SSM::Parameter::Value<String>",
      default: keyName,
    });

    console.log(`    ${FgIn}paramStoreCfnToken:${FgGray} ${keyName}, ${cfnParam.valueAsString}${Reset}`);

    return cfnParam.valueAsString;
  }

  public paramStoreTransformToken(
    decorator: KeyDecorator,
    locations: { [key in WrittenLocation]: AwsLocation }
  ): string {
    const parameterStoreKey = this.getKeyName(decorator);
    const writerLocation = locations[this.writerLocation];

    console.log(
      `    ${FgIn}paramStoreTransformToken:${FgGray} ${parameterStoreKey}, account: ${writerLocation.account}, region: ${writerLocation.region}${Reset}`
    );

    return MacroStack.macroValue(parameterStoreKey, {
      writingLocation: writerLocation,
      readingLocation: locations[AWS_LOCAL],
    });
  }
}

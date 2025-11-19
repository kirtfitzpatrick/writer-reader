import { CfnParameter } from "aws-cdk-lib";
import { StringParameter } from "aws-cdk-lib/aws-ssm";
import { Construct } from "constructs";
import { join, kebabCase } from "lodash";
import { MacroStack } from "../flex-dep/macro-stack";
import { FgGray, FgIn, Reset } from "../lib/colors";
import { Dependency, Reader, Writer } from "./dependency-interface";
import { JigStackProps } from "./jig";
import { KeyDecorator } from "./key-decorator";
import { AwsLocation, SourceLocation, WriterLocation } from "./source-location";
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
  readonly writerLocation: SourceLocation;

  constructor(writer: AwsParameterStoreStringWriter, writerLocation: SourceLocation) {
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

  public tokenize(scope: Construct, props: JigStackProps): string {
    if (this.writerLocation === props.jig.localLocation) {
      // CfnParameter
      return this.paramStoreCfnToken(scope, props.targetConf);
    } else {
      // TODO: Supposedly parameters can span accounts and regions now.
      //       We should check if this is available from within cloudformation.
      //       We could do away with the macro if that's the case.
      // Fn::Transform / Macro
      return this.paramStoreTransformToken(props.targetConf, props.jig.getLocations());
    }
  }

  public paramStoreCfnToken(scope: Construct, keyMaster: KeyDecorator): string {
    const keyName = this.getKeyName(keyMaster);

    const cfnParam = new CfnParameter(scope, join(keyName, "CfnParameter"), {
      type: "AWS::SSM::Parameter::Value<String>",
      default: keyName,
    });

    console.log(`    ${FgIn}paramStoreCfnToken:${FgGray} ${keyName}, ${cfnParam.valueAsString}${Reset}`);

    return cfnParam.valueAsString;
  }

  public paramStoreTransformToken(
    decorator: KeyDecorator,
    locations: { [key in SourceLocation]: AwsLocation }
  ): string {
    const parameterStoreKey = this.getKeyName(decorator);
    const writerLocation = locations[this.writerLocation];

    console.log(
      `    ${FgIn}paramStoreTransformToken:${FgGray} ${parameterStoreKey}, account: ${writerLocation.account}, region: ${writerLocation.region}${Reset}`
    );

    return MacroStack.macroValue(parameterStoreKey, {
      producingLocation: writerLocation,
      consumingLocation: locations[SourceLocation.LOCAL],
    });
  }
}

import { CfnMacro, Fn, IResolvable, Stack } from "aws-cdk-lib";
import { Role } from "aws-cdk-lib/aws-iam";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";
import { AwsLocation } from "../dependency/locations";
import { cfnLabel } from "../lib/labels";
import { AssumeRoleStack } from "./assume-role-stack";
import { JigStackProps } from "./jig";
import { MacroEventParams } from "./macro";
import { ReadAccessRoleStack } from "./read-access-role-stack";

export const PREFIX = "CfnToken"; // This should be configurable

export interface CfnTokenLocations {
  writingLocation: AwsLocation;
  readingLocation: AwsLocation;
}

export interface MacroStackProps extends JigStackProps, CfnTokenLocations {}

export class MacroStack extends Stack {
  public static lambdaArn(stack: Stack, props: CfnTokenLocations): string {
    return `arn:aws:lambda:${stack.region}:${stack.account}:function:${MacroStack.lambdaName(props)}`;
  }

  protected static lambdaName(props: CfnTokenLocations): string {
    return cfnLabel(PREFIX, props.writingLocation.envName, "MacroLambda");
  }

  public static macroName(props: CfnTokenLocations): string {
    return cfnLabel(PREFIX, props.writingLocation.envName, "Macro");
  }

  public static macroValue(parameterStoreKey: string, props: CfnTokenLocations): string {
    return MacroStack.transform(MacroStack.macroName(props), {
      parameterStoreRoleArn: ReadAccessRoleStack.roleArn(props),
      parameterStoreKey: parameterStoreKey,
      parameterStoreRegion: props.writingLocation.region,
    }).toString();
  }

  // A bit redundant but it was all I could think of to get strong types on the macro event params. Fn.transform loses all attempts at strong typing.
  private static transform(macroName: string, macroEventParams: MacroEventParams): IResolvable {
    return Fn.transform(macroName, {
      parameterStoreRoleArn: macroEventParams.parameterStoreRoleArn,
      parameterStoreKey: macroEventParams.parameterStoreKey,
      parameterStoreRegion: macroEventParams.parameterStoreRegion,
    });
  }

  constructor(scope: Construct, id: string, props: MacroStackProps) {
    super(scope, id, props);
    console.log(id, props.env);

    new NodejsFunction(this, "Lambda", {
      functionName: MacroStack.lambdaName(props),
      entry: "src/cfn-token/macro.ts",
      handler: "handler",
      role: Role.fromRoleArn(this, "Role", AssumeRoleStack.roleArn(props)),
      runtime: Runtime.NODEJS_22_X,
    });
    new CfnMacro(this, "Macro", {
      functionName: MacroStack.lambdaArn(this, props),
      name: MacroStack.macroName(props),
    });
  }
}

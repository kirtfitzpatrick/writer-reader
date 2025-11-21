import { Stack, StackProps, Stage } from "aws-cdk-lib";
import { Construct } from "constructs";
import { cfnLabel } from "../lib/labels";
import { AssumeRoleStack } from "./assume-role-stack";
import { AWS_GLOBAL, AWS_WRITER, Jig } from "./jig";
import { CfnTokenLocations, MacroStack } from "./macro-stack";
import { ReadAccessRoleStack } from "./read-access-role-stack";

export interface CfnMacrosStageProps extends StackProps, CfnTokenLocations {
  prefix?: string;
}

export class CfnMacrosStage extends Stage {
  public static oneWayName(props: CfnTokenLocations): string {
    return cfnLabel(
      props.readingLocation.envName, //
      "Read",
      props.writingLocation.envName
    );
  }

  public static oneWayStacks(scope: Construct, props: CfnMacrosStageProps): { [key: string]: Stack } {
    const writingJig = new Jig(props.writingLocation.envName, props.readingLocation.envName);
    const readingJig = new Jig(props.readingLocation.envName, props.writingLocation.envName);
    const prefix = props.prefix ?? CfnMacrosStage.oneWayName(props);
    let lastStacks: { [key: string]: Stack } = {};

    const readRoleStack = new ReadAccessRoleStack(scope, cfnLabel(prefix + "ReadRoleStack"), {
      ...writingJig.stackProps(AWS_GLOBAL),
      writingLocation: props.writingLocation,
      readingLocation: props.readingLocation,
    });
    const assumeRoleStack = new AssumeRoleStack(scope, cfnLabel(prefix + "AssumeRoleStack"), {
      ...readingJig.stackProps(AWS_GLOBAL),
      writingLocation: props.writingLocation,
      readingLocation: props.readingLocation,
    });
    readRoleStack.addDependency(assumeRoleStack);
    const macroStack = new MacroStack(scope, cfnLabel(prefix, "MacroStack", props.readingLocation.region), {
      ...readingJig.stackProps(AWS_WRITER),
      writingLocation: props.writingLocation,
      readingLocation: props.readingLocation,
    });
    macroStack.addDependency(assumeRoleStack);
    lastStacks[props.readingLocation.region] = macroStack;

    if (props.readingLocation.region !== "us-east-1") {
      const gMacroStack = new MacroStack(scope, cfnLabel(prefix, "MacroStack", "us-east-1"), {
        ...readingJig.stackProps(AWS_GLOBAL),
        writingLocation: props.writingLocation,
        readingLocation: props.readingLocation,
      });
      gMacroStack.addDependency(assumeRoleStack);
      lastStacks["us-east-1"] = gMacroStack;
    }

    return lastStacks;
  }

  constructor(scope: Construct, id: string, props: CfnMacrosStageProps) {
    super(scope, id, props);
    CfnMacrosStage.oneWayStacks(this, { ...props, prefix: "" });
  }
}

import { Stack, StackProps, Stage } from "aws-cdk-lib";
import { Construct } from "constructs";
import { AWS_GLOBAL, AWS_TARGET, Jig } from "../dependency/jig";
import { cfnLabel } from "../lib/labels";
import { AssumeRoleStack } from "./assume-role-stack";
import { FlexDepLocations, MacroStack } from "./macro-stack";
import { ReadAccessRoleStack } from "./read-access-role-stack";

export interface FlexDepStageProps extends StackProps, FlexDepLocations {
  prefix?: string;
}

export class FlexDepStage extends Stage {
  public static oneWayName(props: FlexDepLocations): string {
    return cfnLabel(
      props.readingLocation.envName, //
      "Read",
      props.writingLocation.envName
    );
  }

  public static oneWayStacks(scope: Construct, props: FlexDepStageProps): { [key: string]: Stack } {
    const writingJig = new Jig(props.writingLocation.envName);
    const readingJig = new Jig(props.readingLocation.envName);
    const prefix = props.prefix ?? FlexDepStage.oneWayName(props);
    let lastStacks: { [key: string]: Stack } = {};

    const readRoleStack = new ReadAccessRoleStack(scope, prefix + "ReadRoleStack", {
      ...writingJig.stackProps(AWS_GLOBAL),
      writingLocation: props.writingLocation,
      readingLocation: props.readingLocation,
    });
    const assumeRoleStack = new AssumeRoleStack(scope, prefix + "AssumeRoleStack", {
      ...readingJig.stackProps(AWS_GLOBAL),
      writingLocation: props.writingLocation,
      readingLocation: props.readingLocation,
    });
    readRoleStack.addDependency(assumeRoleStack);
    const macroStack = new MacroStack(scope, cfnLabel(prefix, "MacroStack", props.readingLocation.region), {
      ...readingJig.stackProps(AWS_TARGET),
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

  constructor(scope: Construct, id: string, props: FlexDepStageProps) {
    super(scope, id, props);
    FlexDepStage.oneWayStacks(this, { ...props, prefix: "" });
  }
}

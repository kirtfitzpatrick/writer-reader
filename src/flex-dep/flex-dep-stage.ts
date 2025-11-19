import { Stack, StackProps, Stage } from "aws-cdk-lib";
import { Construct } from "constructs";
import { Jig } from "../dependency/jig";
import { SourceLocation } from "../dependency/source-location";
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
      props.consumingLocation.envName, //
      "Read",
      props.producingLocation.envName
    );
  }

  public static oneWayStacks(scope: Construct, props: FlexDepStageProps): { [key: string]: Stack } {
    const producingHammer = new Jig(props.producingLocation.envName);
    const consumingHammer = new Jig(props.consumingLocation.envName);
    const prefix = props.prefix ?? FlexDepStage.oneWayName(props);
    let lastStacks: { [key: string]: Stack } = {};

    const readRoleStack = new ReadAccessRoleStack(scope, prefix + "ReadRoleStack", {
      ...producingHammer.stackProps(SourceLocation.GLOBAL),
      producingLocation: props.producingLocation,
      consumingLocation: props.consumingLocation,
    });
    const assumeRoleStack = new AssumeRoleStack(scope, prefix + "AssumeRoleStack", {
      ...consumingHammer.stackProps(SourceLocation.GLOBAL),
      producingLocation: props.producingLocation,
      consumingLocation: props.consumingLocation,
    });
    readRoleStack.addDependency(assumeRoleStack);
    const macroStack = new MacroStack(scope, cfnLabel(prefix, "MacroStack", props.consumingLocation.region), {
      ...consumingHammer.stackProps(SourceLocation.TARGET),
      producingLocation: props.producingLocation,
      consumingLocation: props.consumingLocation,
    });
    macroStack.addDependency(assumeRoleStack);
    lastStacks[props.consumingLocation.region] = macroStack;

    if (props.consumingLocation.region !== "us-east-1") {
      const gMacroStack = new MacroStack(scope, cfnLabel(prefix, "MacroStack", "us-east-1"), {
        ...consumingHammer.stackProps(SourceLocation.GLOBAL),
        producingLocation: props.producingLocation,
        consumingLocation: props.consumingLocation,
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

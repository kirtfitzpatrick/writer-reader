import { CfnParameter, Fn, Stack } from "aws-cdk-lib";
import { Construct } from "constructs";
import { MacroStack } from "../flex-dep/macro-stack";
import { cfnLabel } from "../label-functions";
import { CloudFormationDependency, CloudFormationStringInput } from "./cloud-formation-dependency";
import { HammerLocations, HammerProps, HammerSources, HammerStackProps } from "./hammer";
import { KeyMaster } from "./key-master";
import { ParamStoreDependency, ParamStoreStringDepIn, ParamStoreStringDepOut } from "./param-store-dependency";
import { DepIn, DepOut, Dependency } from "./product-consumable";
import { SecretsManagerDependency } from "./secrets-manager-dependency";
import { SourceLocation } from "./source-location";

export function tokenizeInputs(
  scope: Construct,
  inputs: { [key: string]: DepIn },
  props: HammerStackProps
): { [key: string]: DepIn } {
  for (const [key, input] of Object.entries(inputs)) {
    const output = input.output;

    switch (true) {
      case output instanceof SecretsManagerDependency:
        // TODO: Secrets should also tokenize in this function. But secrets don't tokenize in CF
        inputs[key].fetch(props.targetConf, props.sources);
        break;
      case output instanceof ParamStoreDependency:
        (inputs[key] as ParamStoreStringDepIn).tokenize(scope, props.targetConf, props.locations);
        break;
      case output instanceof CloudFormationDependency:
        (inputs[key] as CloudFormationStringInput).tokenize(props.targetConf);
        break;
      default:
        throw new Error(`Unknown Input type: ${input}`);
    }
  }

  return inputs;
}

export function tokenizeParamInput(scope: Construct, input: ParamStoreStringDepIn, props: HammerProps): string {
  const outputLocation = props.locations[input.outputLocation];
  const localLocation = props.locations[SourceLocation.LOCAL];

  if (outputLocation.account === localLocation.account && outputLocation.region === localLocation.region) {
    // CfnParameter
    return paramStoreCfnToken(scope, input, props.targetConf);
  } else {
    // TODO: Supposedly parameters can span accounts and regions now.
    //       We should check if this is available from within cloudformation.
    //       We could do away with the macro if that's the case.
    // Fn::Transform / Macro
    return paramStoreTransformToken(input, props.targetConf, props.locations);
  }
}

export function paramStoreCfnToken(scope: Construct, input: ParamStoreStringDepIn, keyMaster: KeyMaster): string {
  const keyName = input.getKeyName(keyMaster);

  const cfnParam = new CfnParameter(scope, cfnLabel(keyName, "CfnParameter"), {
    type: "AWS::SSM::Parameter::Value<String>",
    default: keyName,
  });

  return cfnParam.valueAsString;
}

export function paramStoreTransformToken(
  input: ParamStoreStringDepIn,
  keyMaster: KeyMaster,
  locations: HammerLocations
): string {
  const parameterStoreKey = input.getKeyName(keyMaster);
  const outputLocation = locations[input.outputLocation];

  return MacroStack.macroValue(parameterStoreKey, {
    producingLocation: outputLocation,
    consumingLocation: locations[SourceLocation.LOCAL],
  });
}

// TODO: Might be able to do this with HammerProps instead but need to look
//       around more to see if targetConf is always the correct KeyMaster.
export function fetchInputs(
  keyMaster: KeyMaster,
  sources: HammerSources,
  inputs: { [key: string]: DepIn }
): { [key: string]: DepIn } {
  for (const [key, input] of Object.entries(inputs)) {
    inputs[key].fetch(keyMaster, sources);
  }

  return inputs;
}

export function dehydrateOutputs(scope: Construct, keyMaster: KeyMaster, outputs: { [name: string]: DepOut }) {
  let name: keyof typeof outputs;

  for (const [name, output] of Object.entries(outputs)) {
    output.dehydrate(scope, keyMaster);
  }
}

/**
 * @deprecated Using this with ParamStoreInputs is deprecated.
 * It should be replaced with a tokenize method on a StackExportInput.
 */
export function flexImport(dep: Dependency, keyMaster: KeyMaster): string {
  const exportName = cfnLabel(dep.getKeyName(keyMaster));
  const fnImport = Fn.importValue(exportName);

  return Fn.importValue(exportName);
}

/**
 * @deprecated Using this with ParamStoreInputs is deprecated.
 * It should be replaced with a tokenize method on a StackExportInput.
 */
export function flexExport(stack: Stack, output: ParamStoreStringDepOut, keyMaster: KeyMaster): string {
  const exportName = cfnLabel(output.getKeyName(keyMaster));
  const exportStringValue = output.value;

  return stack.exportValue(exportStringValue, {
    name: exportName,
  });
}

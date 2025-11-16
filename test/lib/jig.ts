/**
 * What this needs to do:
 * - locations
 * - setup sources
 * - setup key decorators
 */

import { WriterLocation } from "../../src/dependency/source-location";
import { AwsCliSource } from "../../src/dependency/source/aws-cli-source";
import { DependencySource } from "../../src/dependency/source/dependency-source";
import { KubectlSource } from "../../src/dependency/source/kubectl-source";
import { Config } from "./config";

export type KeyDecoratorConstant = string;
export const TargetKeyDecorator: KeyDecoratorConstant = "target";
export const CentralKeyDecorator: KeyDecoratorConstant = "central";

export const K8sTargetLocation: WriterLocation = "K8S_TARGET";
export const K8sCentralLocation: WriterLocation = "K8S_CENTRAL";
export const AwsTargetLocation: WriterLocation = "AWS_TARGET";
export const AwsCentralLocation: WriterLocation = "AWS_CENTRAL";

export class Jig {
  public KeyDecoratorDict: { [key in WriterLocation]: Config };
  public WriterLocationDict: { [key in WriterLocation]: DependencySource }; // SourceDict?

  constructor(name: string) {
    // Load up the two key decorators from their config files
    this.KeyDecoratorDict = {
      [CentralKeyDecorator]: Config.load("central"),
      [TargetKeyDecorator]: Config.load(name),
    };
    // Create the sources for all the different locations we'll test
    this.WriterLocationDict = {
      [K8sCentralLocation]: new KubectlSource(
        this.KeyDecoratorDict[CentralKeyDecorator].namespace,
        this.KeyDecoratorDict[CentralKeyDecorator].context
      ),
      [K8sTargetLocation]: new KubectlSource(
        this.KeyDecoratorDict[TargetKeyDecorator].namespace,
        this.KeyDecoratorDict[TargetKeyDecorator].context
      ),
      [AwsCentralLocation]: new AwsCliSource(
        this.KeyDecoratorDict[CentralKeyDecorator].profile,
        this.KeyDecoratorDict[CentralKeyDecorator].region
      ),
      [AwsTargetLocation]: new AwsCliSource(
        this.KeyDecoratorDict[TargetKeyDecorator].profile,
        this.KeyDecoratorDict[TargetKeyDecorator].region
      ),
    };
  }

  public getKeyDecorator(keyMasterKey: KeyDecoratorConstant): Config {
    return this.KeyDecoratorDict[keyMasterKey];
  }

  public sources(): { [key in WriterLocation]: DependencySource } {
    return this.WriterLocationDict;
  }

  public getSource(location: WriterLocation): DependencySource {
    return this.WriterLocationDict[location];
  }
}

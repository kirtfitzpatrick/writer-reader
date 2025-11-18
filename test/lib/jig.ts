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
export const TARGET: KeyDecoratorConstant = "target";
export const CENTRAL: KeyDecoratorConstant = "central";

export const K8sTargetLocation: WriterLocation = "K8S_TARGET";
export const K8sCentralLocation: WriterLocation = "K8S_CENTRAL";
export const AwsTargetLocation: WriterLocation = "AWS_TARGET";
export const AwsCentralLocation: WriterLocation = "AWS_CENTRAL";

export class Jig {
  public decorators: { [key in WriterLocation]: Config }; // Decorators are usually configs
  public sources: { [key in WriterLocation]: DependencySource }; // SourceDict?

  constructor(name: string) {
    // Load up the two key decorators from their config files
    this.decorators = {
      [CENTRAL]: Config.load("central"),
      [TARGET]: Config.load(name),
    };
    // Create the sources for all the different locations we'll test
    this.sources = {
      [K8sCentralLocation]: new KubectlSource(this.decorators[CENTRAL].namespace, this.decorators[CENTRAL].context),
      [K8sTargetLocation]: new KubectlSource(this.decorators[TARGET].namespace, this.decorators[TARGET].context),
      [AwsCentralLocation]: new AwsCliSource(this.decorators[CENTRAL].profile, this.decorators[CENTRAL].region, {
        debug: true,
      }),
      [AwsTargetLocation]: new AwsCliSource(this.decorators[TARGET].profile, this.decorators[TARGET].region, {
        debug: true,
      }),
    };
  }

  public getKeyDecorator(keyMasterKey: KeyDecoratorConstant): Config {
    return this.decorators[keyMasterKey];
  }

  public getSources(): { [key in WriterLocation]: DependencySource } {
    return this.sources;
  }

  public getSource(location: WriterLocation): DependencySource {
    return this.sources[location];
  }
}

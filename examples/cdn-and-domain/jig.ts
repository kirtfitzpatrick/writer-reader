/**
 * What this needs to do:
 * - locations
 * - setup sources
 * - setup key decorators
 */

import { StackProps } from "aws-cdk-lib";
import { SourceLocation, WriterLocation } from "../../src/dependency/source-location";
import { AwsCliSource } from "../../src/dependency/source/aws-cli-source";
import { DependencySource } from "../../src/dependency/source/dependency-source";
import { KubectlSource } from "../../src/dependency/source/kubectl-source";
import { Config } from "./config";

export interface JigStackProps extends StackProps {
  jig: Jig;
  targetConf: Config;
  centralConf: Config;
}

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
  // public targetConf: Config;
  // public centralConf: Config;

  constructor(name: string) {
    // Load up the two key decorators from their config files
    this.decorators = {
      [CENTRAL]: Config.load("central"),
      [TARGET]: Config.load(name),
    };

    // this.targetConf = this.decorators[TARGET];
    // this.centralConf = this.decorators[CENTRAL];
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

  public getSource(location: WriterLocation): DependencySource {
    return this.sources[location];
  }

  public stackProps(location: SourceLocation): JigStackProps {
    switch (location) {
      case SourceLocation.CENTRAL:
        return {
          env: {
            account: this.decorators[CENTRAL].account,
            region: this.decorators[CENTRAL].region,
          },
          jig: this,
          targetConf: this.decorators[TARGET],
          centralConf: this.decorators[CENTRAL],
        };
      case SourceLocation.TARGET:
        return {
          env: {
            account: this.decorators[TARGET].account,
            region: this.decorators[TARGET].region,
          },
          jig: this,
          targetConf: this.decorators[TARGET],
          centralConf: this.decorators[CENTRAL],
        };
      case SourceLocation.GLOBAL:
        return {
          env: {
            account: this.decorators[TARGET].account,
            region: "us-east-1",
          },
          jig: this,
          targetConf: this.decorators[TARGET],
          centralConf: this.decorators[CENTRAL],
        };
      default:
        throw new Error(`Unsupported location for stack props: ${location}`);
    }
  }
}

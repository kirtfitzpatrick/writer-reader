/**
 * What this needs to do:
 * - locations
 * - setup sources
 * - setup key decorators
 * this needs to be abstracted into an interface
 */

import { StackProps } from "aws-cdk-lib";
import { AwsCliSource } from "../../src/dependency/source/aws-cli-source";
import { DependencySource } from "../../src/dependency/source/dependency-source";
import { KubectlSource } from "../../src/dependency/source/kubectl-source";
import { Config } from "./config";
import { AwsLocation, SourceLocation, WriterLocation, WrittenLocation } from "./source-location";

export interface JigStackProps extends StackProps {
  jig: Jig;
  targetConf: Config;
  centralConf: Config;
}

export type KeyDecoratorConstant = string;
export const TARGET_CONF: KeyDecoratorConstant = "target";
export const CENTRAL_CONF: KeyDecoratorConstant = "central";

export const K8sTargetLocation: WriterLocation = "K8S_TARGET";
export const K8sCentralLocation: WriterLocation = "K8S_CENTRAL";
export const AwsTargetLocation: WriterLocation = "AWS_TARGET";
export const AwsCentralLocation: WriterLocation = "AWS_CENTRAL";

/**
 * New Location stuff
 */
import { createWrittenLocation } from "./source-location";

export const TARGET = createWrittenLocation("TARGET");
export const GLOBAL = createWrittenLocation("GLOBAL");
export const CENTRAL = createWrittenLocation("CENTRAL");
export const LOCAL = createWrittenLocation("LOCAL");

export function doSomethingAtLocation(loc: WrittenLocation) {
  /* ... */
}
doSomethingAtLocation(TARGET); // ✅
// doSomethingAtLocation("NEW_REMOTE");    // ❌ not branded

/**
 * end of new stuff
 */

export class Jig {
  public decorators: { [key in WriterLocation]: Config }; // Decorators are usually configs
  public sources: { [key in WriterLocation]: DependencySource }; // SourceDict?
  public localLocation: SourceLocation;

  constructor(name: string) {
    // Load up the two key decorators from their config files
    this.decorators = {
      [CENTRAL_CONF]: Config.load("central"),
      [TARGET_CONF]: Config.load(name),
    };

    // Create the sources for all the different locations we'll test
    this.sources = {
      [K8sCentralLocation]: new KubectlSource(
        this.decorators[CENTRAL_CONF].namespace,
        this.decorators[CENTRAL_CONF].context
      ),
      [K8sTargetLocation]: new KubectlSource(
        this.decorators[TARGET_CONF].namespace,
        this.decorators[TARGET_CONF].context
      ),
      [AwsCentralLocation]: new AwsCliSource(
        this.decorators[CENTRAL_CONF].profile,
        this.decorators[CENTRAL_CONF].region,
        {
          debug: true,
        }
      ),
      [AwsTargetLocation]: new AwsCliSource(this.decorators[TARGET_CONF].profile, this.decorators[TARGET_CONF].region, {
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

  // needed by cloudformation macros
  public getLocations(): { [key in SourceLocation]: AwsLocation } {
    // public getLocations(): { [key in WrittenLocation]: AwsLocation } {
    let locations = {
      [SourceLocation.TARGET]: {
        envName: this.decorators[TARGET_CONF].name,
        account: this.decorators[TARGET_CONF].account,
        region: this.decorators[TARGET_CONF].region,
      },
      [SourceLocation.CENTRAL]: {
        envName: this.decorators[CENTRAL_CONF].name,
        account: this.decorators[CENTRAL_CONF].account,
        region: this.decorators[CENTRAL_CONF].region,
      },
      [SourceLocation.GLOBAL]: {
        envName: this.decorators[TARGET_CONF].name,
        account: this.decorators[TARGET_CONF].account,
        region: "us-east-1",
      },
      [SourceLocation.LOCAL]: {
        envName: "",
        account: "",
        region: "",
      },
    };
    locations[SourceLocation.LOCAL] = locations[this.localLocation];

    return locations;
  }

  public stackProps(location: SourceLocation): JigStackProps {
    this.localLocation = location;
    switch (location) {
      case SourceLocation.CENTRAL:
        return {
          env: {
            account: this.decorators[CENTRAL_CONF].account,
            region: this.decorators[CENTRAL_CONF].region,
          },
          jig: this,
          targetConf: this.decorators[TARGET_CONF],
          centralConf: this.decorators[CENTRAL_CONF],
        };
      case SourceLocation.TARGET:
        return {
          env: {
            account: this.decorators[TARGET_CONF].account,
            region: this.decorators[TARGET_CONF].region,
          },
          jig: this,
          targetConf: this.decorators[TARGET_CONF],
          centralConf: this.decorators[CENTRAL_CONF],
        };
      case SourceLocation.GLOBAL:
        return {
          env: {
            account: this.decorators[TARGET_CONF].account,
            region: "us-east-1",
          },
          jig: this,
          targetConf: this.decorators[TARGET_CONF],
          centralConf: this.decorators[CENTRAL_CONF],
        };
      default:
        throw new Error(`Unsupported location for stack props: ${location}`);
    }
  }
}

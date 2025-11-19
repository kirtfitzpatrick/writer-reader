import { StackProps } from "aws-cdk-lib";
import { AwsCliSource } from "../../src/dependency/source/aws-cli-source";
import { DependencySource } from "../../src/dependency/source/dependency-source";
import { KubectlSource } from "../../src/dependency/source/kubectl-source";
import { Config } from "./config";
import { AwsLocation, WrittenLocation, createWrittenLocation } from "./source-location";

export interface JigStackProps extends StackProps {
  jig: Jig;
  targetConf: Config;
  centralConf: Config;
}

export type KeyDecoratorConstant = string;
export const TARGET_CONF: KeyDecoratorConstant = "target";
export const CENTRAL_CONF: KeyDecoratorConstant = "central";

/**
 * New Location stuff
 */
export const K8S_TARGET = createWrittenLocation("K8S_TARGET");
export const K8S_CENTRAL = createWrittenLocation("K8S_CENTRAL");
export const AWS_TARGET = createWrittenLocation("AWS_TARGET");
export const AWS_GLOBAL = createWrittenLocation("AWS_GLOBAL");
export const AWS_CENTRAL = createWrittenLocation("AWS_CENTRAL");
export const AWS_LOCAL = createWrittenLocation("AWS_LOCAL");
export const AWS_GLOBAL_REGION = "us-east-1";
/**
 * end of new stuff
 */

export class Jig {
  public decorators: { [key in KeyDecoratorConstant]: Config }; // Decorators are usually configs
  public sources: { [key in WrittenLocation]: DependencySource }; // SourceDict?
  public localLocation: WrittenLocation;

  constructor(name: string) {
    // Load up the two key decorators from their config files
    this.decorators = {
      [TARGET_CONF]: Config.load(name),
      [CENTRAL_CONF]: Config.load("central"),
    };

    // Create the sources for all the different locations we'll test
    this.sources = {
      [K8S_TARGET]: new KubectlSource(this.decorators[TARGET_CONF].namespace, this.decorators[TARGET_CONF].context),
      [K8S_CENTRAL]: new KubectlSource(this.decorators[CENTRAL_CONF].namespace, this.decorators[CENTRAL_CONF].context),
      [AWS_TARGET]: new AwsCliSource(this.decorators[TARGET_CONF].profile, this.decorators[TARGET_CONF].region, {
        debug: true,
      }),
      [AWS_GLOBAL]: new AwsCliSource(this.decorators[TARGET_CONF].profile, AWS_GLOBAL_REGION, { debug: true }),
      [AWS_CENTRAL]: new AwsCliSource(this.decorators[CENTRAL_CONF].profile, this.decorators[CENTRAL_CONF].region, {
        debug: true,
      }),
    };
  }

  public getKeyDecorator(key: KeyDecoratorConstant): Config {
    return this.decorators[key];
  }

  public getSource(location: WrittenLocation): DependencySource {
    return this.sources[location];
  }

  // needed by cloudformation macros
  // public getLocations(): { [key in SourceLocation]: AwsLocation } {
  public getLocations(): { [key in WrittenLocation]: AwsLocation } {
    let locations = {
      [AWS_TARGET]: {
        envName: this.decorators[TARGET_CONF].name,
        account: this.decorators[TARGET_CONF].account,
        region: this.decorators[TARGET_CONF].region,
      },
      [AWS_CENTRAL]: {
        envName: this.decorators[CENTRAL_CONF].name,
        account: this.decorators[CENTRAL_CONF].account,
        region: this.decorators[CENTRAL_CONF].region,
      },
      [AWS_GLOBAL]: {
        envName: this.decorators[TARGET_CONF].name,
        account: this.decorators[TARGET_CONF].account,
        region: "us-east-1",
      },
      [AWS_LOCAL]: {
        envName: "",
        account: "",
        region: "",
      },
    };
    locations[AWS_LOCAL] = locations[this.localLocation];

    return locations;
  }

  public stackProps(location: WrittenLocation): JigStackProps {
    this.localLocation = location;

    switch (location) {
      case AWS_TARGET:
        return {
          env: {
            account: this.decorators[TARGET_CONF].account.toString(),
            region: this.decorators[TARGET_CONF].region,
          },
          jig: this,
          targetConf: this.decorators[TARGET_CONF],
          centralConf: this.decorators[CENTRAL_CONF],
        };
      case AWS_GLOBAL:
        return {
          env: {
            account: this.decorators[TARGET_CONF].account.toString(),
            region: AWS_GLOBAL_REGION,
          },
          jig: this,
          targetConf: this.decorators[TARGET_CONF],
          centralConf: this.decorators[CENTRAL_CONF],
        };
      case AWS_CENTRAL:
        return {
          env: {
            account: this.decorators[CENTRAL_CONF].account.toString(),
            region: this.decorators[CENTRAL_CONF].region,
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

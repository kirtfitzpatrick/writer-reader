import { AWS_LOCAL, JigBase, JigBaseStackProps } from "../../src/dependency/jig-base";
import { KeyDecorator } from "../../src/dependency/key-decorator";
import { AwsLocation, WrittenLocation, createWrittenLocation } from "../../src/dependency/locations";
import { AwsCliSource } from "../../src/dependency/source/aws-cli-source";
import { DependencySource } from "../../src/dependency/source/dependency-source";
import { KubectlSource } from "../../src/dependency/source/kubectl-source";
import { Config } from "./config";

export interface JigStackProps extends JigBaseStackProps {
  jig: Jig;
  targetConf: Config;
  centralConf: Config;
}

export const AWS_GLOBAL_REGION = "us-east-1";
export const CENTRAL_CONF_NAME = "central";

export const K8S_TARGET = createWrittenLocation("K8S_TARGET");
export const K8S_CENTRAL = createWrittenLocation("K8S_CENTRAL");
export const AWS_TARGET = createWrittenLocation("AWS_TARGET");
export const AWS_GLOBAL = createWrittenLocation("AWS_GLOBAL");
export const AWS_CENTRAL = createWrittenLocation("AWS_CENTRAL");

export class Jig extends JigBase {
  public sources: { [key in WrittenLocation]: DependencySource };
  public localLocation: WrittenLocation;
  public targetConf: Config;
  public centralConf: Config;

  constructor(name: string) {
    super();
    // Load up the two key decorators from their config files
    this.targetConf = Config.load(name);
    this.centralConf = Config.load(CENTRAL_CONF_NAME);
    // Create the sources for all the different locations we'll need
    this.sources = {
      [K8S_TARGET]: new KubectlSource(this.targetConf.namespace, this.targetConf.context),
      [K8S_CENTRAL]: new KubectlSource(this.centralConf.namespace, this.centralConf.context),
      [AWS_TARGET]: new AwsCliSource(this.targetConf.profile, this.targetConf.region, { debug: true }),
      [AWS_GLOBAL]: new AwsCliSource(this.targetConf.profile, AWS_GLOBAL_REGION, { debug: true }),
      [AWS_CENTRAL]: new AwsCliSource(this.centralConf.profile, this.centralConf.region, { debug: true }),
    };
  }

  public getTargetDecorator(): KeyDecorator {
    return this.targetConf;
  }

  public getSource(location: WrittenLocation): DependencySource {
    return this.sources[location];
  }

  // needed by cloudformation macros
  public getLocations(): { [key in WrittenLocation]: AwsLocation } {
    let locations = {
      [AWS_TARGET]: {
        envName: this.targetConf.name,
        account: this.targetConf.account,
        region: this.targetConf.region,
      },
      [AWS_GLOBAL]: {
        envName: this.targetConf.name,
        account: this.targetConf.account,
        region: AWS_GLOBAL_REGION,
      },
      [AWS_CENTRAL]: {
        envName: this.centralConf.name,
        account: this.centralConf.account,
        region: this.centralConf.region,
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
            account: this.targetConf.account.toString(),
            region: this.targetConf.region,
          },
          jig: this,
          targetConf: this.targetConf,
          centralConf: this.centralConf,
        };
      case AWS_GLOBAL:
        return {
          env: {
            account: this.targetConf.account.toString(),
            region: AWS_GLOBAL_REGION,
          },
          jig: this,
          targetConf: this.targetConf,
          centralConf: this.centralConf,
        };
      case AWS_CENTRAL:
        return {
          env: {
            account: this.centralConf.account.toString(),
            region: this.centralConf.region,
          },
          jig: this,
          targetConf: this.targetConf,
          centralConf: this.centralConf,
        };
      default:
        throw new Error(`Unsupported location for stack props: ${location}`);
    }
  }
}

import { JigBase, JigBaseStackProps } from "../../src/dependency/jig-base";
import { KeyDecorator } from "../../src/dependency/key-decorator";
import { AwsLocation, WrittenLocation, createWrittenLocation } from "../../src/dependency/locations";
import { AwsCliSource } from "../../src/dependency/source/aws-cli-source";
import { DependencySource } from "../../src/dependency/source/dependency-source";
import { Config } from "./config";

/**
 * Implementing the Jig abstraction is what makes keeping track of all the
 * multi-region, multi-account details simple. Though it looks complex to
 * implement it's fairly repetitive once you know the pattern. Every system can
 * vary wildly so this has to be left as an exercise for the implementer. But
 * you can get a pretty good handle on the basics of the pattern here.
 */
export interface JigStackProps extends JigBaseStackProps {
  jig: Jig;
  targetConf: Config;
  centralConf: Config;
}

export const AWS_GLOBAL_REGION = "us-east-1";
export const CENTRAL_CONF_NAME = "central";

// There can be as many WrittenLocation types as your system needs.
// but think in terms of reuse. dev, staging, prod-us, and prod-eu are probably
// all targets rather than separate locations. The configuration should happen
// on the command line.
export const AWS_TARGET = createWrittenLocation("AWS_TARGET"); // Target is usually the primary location or config of the thing being deployed.
export const AWS_GLOBAL = createWrittenLocation("AWS_GLOBAL"); // Since us-east-1 is special in AWS there is often need for a target account but in the "global" us-east-1 region.
export const AWS_CENTRAL = createWrittenLocation("AWS_CENTRAL"); // Often there are many services that are 1 of 1 within an organization. So a central account/region is common.
export const AWS_LOCAL = createWrittenLocation("AWS_LOCAL"); // Local is wherever the thing being deployed right now is. It's used internally for shortcuts.

export class Jig extends JigBase {
  public sources: { [key in WrittenLocation]: DependencySource };
  public localLocation: WrittenLocation;
  public targetConf: Config;
  public centralConf: Config;

  constructor(name: string) {
    super();
    // Load up the two key decorators this app requires
    this.targetConf = Config.load(name);
    this.centralConf = Config.load(CENTRAL_CONF_NAME);
    // Create the sources for all the different locations we'll need
    this.sources = {
      [AWS_TARGET]: new AwsCliSource(this.targetConf.profile, this.targetConf.region, { debug: true }),
      [AWS_GLOBAL]: new AwsCliSource(this.targetConf.profile, AWS_GLOBAL_REGION, { debug: true }),
      [AWS_CENTRAL]: new AwsCliSource(this.centralConf.profile, this.centralConf.region, { debug: true }),
    };
  }

  // There is always a target. Everything belongs to something.
  public getTargetDecorator(): KeyDecorator {
    return this.targetConf;
  }

  public getSource(location: WrittenLocation): DependencySource {
    return this.sources[location];
  }

  // needed by cloudformation macros
  // this is generally called long after the stack has begin processing and the
  // localLocation property has been set.
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

  // It is not a requirement to have a method like this but it makes life a
  // whole lot easier if you do. Every stack should have an env and if you're
  // using this dependency system then every stack is gonna need your decorators.
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

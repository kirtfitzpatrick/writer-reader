import { AWS_LOCAL, JigBase, JigBaseStackProps } from "../../src/dependency/jig-base";
import { KeyDecorator } from "../../src/dependency/key-decorator";
import { AwsCliSource } from "../../src/dependency/source/aws-cli-source";
import { DependencySource } from "../../src/dependency/source/dependency-source";
import { AwsLocation, WrittenLocation, createWrittenLocation } from "../dependency/locations";
import { Config } from "./config";

export interface JigStackProps extends JigBaseStackProps {
  jig: Jig;
  writerConf: Config;
  readerConf: Config;
}

export const AWS_GLOBAL_REGION = "us-east-1";

export const AWS_WRITER = createWrittenLocation("AWS_WRITER");
export const AWS_GLOBAL = createWrittenLocation("AWS_GLOBAL");
export const AWS_READER = createWrittenLocation("AWS_READER");

export class Jig extends JigBase {
  public sources: { [key in WrittenLocation]: DependencySource };
  public localLocation: WrittenLocation;
  public writerConf: Config;
  public readerConf: Config;

  constructor(writer: string, reader: string) {
    super();
    this.writerConf = Config.load(writer);
    this.readerConf = Config.load(reader);
    this.sources = {
      [AWS_WRITER]: new AwsCliSource(this.writerConf.profile, this.writerConf.region),
      [AWS_GLOBAL]: new AwsCliSource(this.writerConf.profile, AWS_GLOBAL_REGION),
      [AWS_READER]: new AwsCliSource(this.readerConf.profile, this.readerConf.region),
    };
  }

  public getTargetDecorator(): KeyDecorator {
    return this.writerConf;
  }

  public getSource(location: WrittenLocation): DependencySource {
    return this.sources[location];
  }

  // needed by cloudformation macros
  public getLocations(): { [key in WrittenLocation]: AwsLocation } {
    let locations = {
      [AWS_WRITER]: {
        envName: this.writerConf.name,
        account: this.writerConf.account,
        region: this.writerConf.region,
      },
      [AWS_READER]: {
        envName: this.readerConf.name,
        account: this.readerConf.account,
        region: this.readerConf.region,
      },
      [AWS_GLOBAL]: {
        envName: this.writerConf.name,
        account: this.writerConf.account,
        region: AWS_GLOBAL_REGION,
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
      case AWS_WRITER:
        return {
          env: {
            account: this.writerConf.account.toString(),
            region: this.writerConf.region,
          },
          jig: this,
          writerConf: this.writerConf,
          readerConf: this.readerConf,
        };
      case AWS_GLOBAL:
        return {
          env: {
            account: this.writerConf.account.toString(),
            region: AWS_GLOBAL_REGION,
          },
          jig: this,
          writerConf: this.writerConf,
          readerConf: this.readerConf,
        };
      case AWS_READER:
        return {
          env: {
            account: this.readerConf.account.toString(),
            region: this.readerConf.region,
          },
          jig: this,
          writerConf: this.writerConf,
          readerConf: this.readerConf,
        };
      default:
        throw new Error(`Unsupported location for stack props: ${location}`);
    }
  }
}

import { Stack } from "aws-cdk-lib";
import { IpAddresses, Vpc } from "aws-cdk-lib/aws-ec2";
import { Construct } from "constructs";
import { cloneDeep } from "lodash";
import { AwsParameterStoreStringWriter } from "../../src/dependency/aws-parameter-store-dependency";
import { ConfigKeyDecorator } from "./config";
import { JigStackProps } from "./jig";

export const VpcStackWriters = {
  vpcId: new AwsParameterStoreStringWriter(["vpc-id"], ConfigKeyDecorator),
} as const;

// Vpc is deployed in the target account/region
export class VpcStack extends Stack {
  constructor(scope: Construct, id: string, props: JigStackProps) {
    super(scope, id, props);
    console.log(id, props.env);

    const vpc = new Vpc(this, "Vpc", {
      ipAddresses: IpAddresses.cidr("10.0.0.0/16"),
    });

    const writers = cloneDeep(VpcStackWriters);
    writers.vpcId.value = vpc.vpcId;
    writers.vpcId.dehydrate(this, props.targetConf);
  }
}

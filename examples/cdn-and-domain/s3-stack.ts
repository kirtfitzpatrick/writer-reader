import { RemovalPolicy, Stack } from "aws-cdk-lib";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";
import { cloneDeep } from "lodash";
import { AwsParameterStoreStringWriter } from "../../src/dependency/aws-parameter-store-dependency";
import { ConfigKeyDecorator } from "./config";
import { JigStackProps } from "./jig";

export const S3StackWriters = {
  bucketArn: new AwsParameterStoreStringWriter(["bucket-arn"], ConfigKeyDecorator),
} as const;

export class S3Stack extends Stack {
  constructor(scope: Construct, id: string, props: JigStackProps) {
    super(scope, id, props);

    const bucket = new Bucket(this, "Bucket", {
      bucketName: "origin-bucket",
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const writers = cloneDeep(S3StackWriters);
    writers.bucketArn.value = bucket.bucketArn;
    writers.bucketArn.dehydrate(this, props.targetConf);
  }
}

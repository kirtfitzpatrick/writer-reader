import { Stack } from "aws-cdk-lib";
import { Distribution } from "aws-cdk-lib/aws-cloudfront";
import { S3BucketOrigin } from "aws-cdk-lib/aws-cloudfront-origins";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";
import { cloneDeep } from "lodash";
import {
  AwsParameterStoreStringReader,
  AwsParameterStoreStringWriter,
} from "../../src/dependency/aws-parameter-store-dependency";
import { AWS_TARGET, JigStackProps } from "../../src/dependency/jig";
import { ConfigKeyDecorator } from "./config";
import { S3StackWriters } from "./s3-stack";

export const CdnStackWriters = {
  distributionId: new AwsParameterStoreStringWriter(["distribution-id"], ConfigKeyDecorator),
} as const;

export const CdnStackReaders = {
  bucketArn: new AwsParameterStoreStringReader(S3StackWriters.bucketArn, AWS_TARGET),
} as const;

export class CdnStack extends Stack {
  constructor(scope: Construct, id: string, props: JigStackProps) {
    super(scope, id, props);
    console.log(id, props.env);

    const bucketArnToken = CdnStackReaders.bucketArn.tokenize(this, props);

    const bucket = Bucket.fromBucketArn(this, "OriginBucket", bucketArnToken);
    const distribution = new Distribution(this, "Distribution", {
      defaultBehavior: {
        origin: S3BucketOrigin.withOriginAccessControl(bucket), // darn circular dependency again. Wish they'd fix that
      },
    });

    // Save the distribution ID
    const writers = cloneDeep(CdnStackWriters);
    writers.distributionId.value = distribution.distributionId;
    writers.distributionId.dehydrate(this, props.targetConf);
  }
}

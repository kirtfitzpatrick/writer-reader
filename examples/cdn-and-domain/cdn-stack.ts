/**
 * Assume a CloudFront Distribution needs to be created in an environment
 * account in the global region, because that's where CloudFront is managed from.
 * Once created a subdomain off the master domain in the central account needs
 * to point to the distribution ID,
 */
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
import { SourceLocation } from "../../src/dependency/source-location";
import { ConfigKeyDecorator } from "./config";
import { JigStackProps } from "./jig";
import { S3StackWriters } from "./s3-stack";

export const CdnStackWriters = {
  distributionId: new AwsParameterStoreStringWriter(["distribution-id"], ConfigKeyDecorator),
} as const;

export const CdnStackReaders = {
  bucketArn: new AwsParameterStoreStringReader(S3StackWriters.bucketArn, SourceLocation.TARGET),
} as const;

export class CdnStack extends Stack {
  constructor(scope: Construct, id: string, props: JigStackProps) {
    super(scope, id, props);

    // fetch the arn via the command line, which won't work... Need to import the tokenization functions
    CdnStackReaders.bucketArn.fetch(props.targetConf, props.jig.sources);
    const bucket = Bucket.fromBucketArn(this, "OriginBucket", CdnStackReaders.bucketArn.value);
    const distribution = new Distribution(this, "Distribution", {
      defaultBehavior: {
        origin: S3BucketOrigin.withOriginAccessControl(bucket),
      },
    });

    // Save the distribution ID
    const writers = cloneDeep(CdnStackWriters);
    writers.distributionId.value = distribution.distributionId;
    writers.distributionId.dehydrate(this, props.targetConf);
  }
}

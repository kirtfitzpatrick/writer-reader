import { Stack } from "aws-cdk-lib";
import { CnameRecord, HostedZone } from "aws-cdk-lib/aws-route53";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";
import { cloneDeep } from "lodash";
import { AwsParameterStoreStringReader } from "../../src/dependency/aws-parameter-store-dependency";
import { AWS_TARGET, JigStackProps } from "../../src/dependency/jig";
import { S3StackWriters } from "./s3-stack";

export const TLD = "tintopcamper.com";

export const DomainStackReaders = {
  originBucketArn: new AwsParameterStoreStringReader(S3StackWriters.bucketArn, AWS_TARGET),
} as const;

// Deployed to the central account
export class DomainStack extends Stack {
  constructor(scope: Construct, id: string, props: JigStackProps) {
    super(scope, id, props);
    console.log(id, props.env);

    const hostedZone = HostedZone.fromLookup(this, "HostedZone", {
      domainName: TLD,
    });

    const readers = cloneDeep(DomainStackReaders);
    const originBucketArn = readers.originBucketArn.tokenize(this, props);
    const iBucket = Bucket.fromBucketArn(this, "OriginBucket", originBucketArn);

    const record = new CnameRecord(this, "CnameRecord", {
      zone: hostedZone,
      recordName: "hello",
      domainName: iBucket.bucketWebsiteDomainName,
    });
  }
}

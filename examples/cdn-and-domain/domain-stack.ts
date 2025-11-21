import { Duration, Stack } from "aws-cdk-lib";
import { CnameRecord, HostedZone } from "aws-cdk-lib/aws-route53";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";
import { cloneDeep } from "lodash";
import { AwsParameterStoreStringReader } from "../../src/dependency/aws-parameter-store-dependency";
import { AWS_TARGET, JigStackProps } from "./jig";
import { S3StackWriters } from "./s3-stack";

export const TLD = "tintopcamper.com";
export const SUBDOMAIN = "hello";
export const FULL_DOMAIN = SUBDOMAIN + "." + TLD;

export const DomainStackReaders = {
  originBucketArn: new AwsParameterStoreStringReader(S3StackWriters.bucketArn, AWS_TARGET),
} as const;

// DomainStack is deployed to the central account and us-east-1 region
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

    const domainName = iBucket.bucketWebsiteDomainName.replace(
      props.env?.region || "us-east-1",
      props.targetConf.region
    );
    console.log("Domain name for origin bucket website:", domainName);
    const record = new CnameRecord(this, "CnameRecord", {
      zone: hostedZone,
      recordName: "hello",
      domainName: domainName,
      ttl: Duration.seconds(60),
    });
  }
}

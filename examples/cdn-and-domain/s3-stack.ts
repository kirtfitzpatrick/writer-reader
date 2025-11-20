import { RemovalPolicy, Stack } from "aws-cdk-lib";
import { BlockPublicAccess, Bucket } from "aws-cdk-lib/aws-s3";
import { BucketDeployment, Source } from "aws-cdk-lib/aws-s3-deployment";
import { Construct } from "constructs";
import { cloneDeep } from "lodash";
import { AwsParameterStoreStringWriter } from "../../src/dependency/aws-parameter-store-dependency";
import { JigStackProps } from "../../src/dependency/jig";
import { cfnLabel } from "../../src/lib/labels";
import { ConfigKeyDecorator } from "./config";

export const S3StackWriters = {
  bucketArn: new AwsParameterStoreStringWriter(["origin-bucket-arn"], ConfigKeyDecorator),
} as const;

export class S3Stack extends Stack {
  constructor(scope: Construct, id: string, props: JigStackProps) {
    super(scope, id, props);
    console.log(id, props.env);

    const bucket = new Bucket(this, "Bucket", {
      versioned: true,
      bucketName: cfnLabel(props.targetConf.name, "origin-bucket"),
      websiteIndexDocument: "index.html",
      publicReadAccess: true,
      blockPublicAccess: BlockPublicAccess.BLOCK_ACLS_ONLY,
      autoDeleteObjects: true,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    new BucketDeployment(this, "BucketDeployment", {
      sources: [Source.asset("./assets")],
      destinationBucket: bucket,
      prune: false,
    });

    const writers = cloneDeep(S3StackWriters);
    writers.bucketArn.value = bucket.bucketArn;
    writers.bucketArn.dehydrate(this, props.targetConf);
  }
}

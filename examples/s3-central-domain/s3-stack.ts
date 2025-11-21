import { RemovalPolicy, Stack } from "aws-cdk-lib";
import { BlockPublicAccess, Bucket } from "aws-cdk-lib/aws-s3";
import { BucketDeployment, Source } from "aws-cdk-lib/aws-s3-deployment";
import { Construct } from "constructs";
import { cloneDeep } from "lodash";
import { join } from "path";
import { AwsParameterStoreStringWriter } from "../../src/dependency/aws-parameter-store-dependency";
import { ConfigKeyDecorator } from "./config";
import { FULL_DOMAIN } from "./domain-stack";
import { JigStackProps } from "./jig";

export const S3StackWriters = {
  bucketArn: new AwsParameterStoreStringWriter(["origin-bucket-arn"], ConfigKeyDecorator),
} as const;

// S3 bucket is deployed to the target account/region
export class S3Stack extends Stack {
  constructor(scope: Construct, id: string, props: JigStackProps) {
    super(scope, id, props);
    console.log(id, props.env);

    const bucket = new Bucket(this, "Bucket", {
      versioned: true,
      bucketName: FULL_DOMAIN, // needed for auto routing under custom domain
      websiteIndexDocument: "index.html",
      publicReadAccess: true,
      blockPublicAccess: BlockPublicAccess.BLOCK_ACLS_ONLY,
      autoDeleteObjects: true,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    new BucketDeployment(this, "BucketDeployment", {
      sources: [Source.asset(join(__dirname, "assets"))],
      destinationBucket: bucket,
      prune: false,
    });

    const writers = cloneDeep(S3StackWriters);
    writers.bucketArn.value = bucket.bucketArn;
    writers.bucketArn.dehydrate(this, props.targetConf);
  }
}

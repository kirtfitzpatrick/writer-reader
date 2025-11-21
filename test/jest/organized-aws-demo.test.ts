import { DescribeStacksCommand } from "@aws-sdk/client-cloudformation";
import { App, RemovalPolicy, Stack } from "aws-cdk-lib";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { split } from "lodash";
import { cfnClient, deleteStack, deployTemplate, getAwsProfileCredentials } from "../lib/aws-functions";

jest.setTimeout(30 * 60 * 1000); // 30 minutes

const STACK_NAME = "cdk-jest-demo-stack";
const AWS_REGION = process.env.AWS_REGION || process.env.CDK_DEFAULT_REGION || "us-west-2";
const AWS_ACCOUNT = split(process.env.AWS_PROFILE, "_")[0];

function createTestStack(): { app: App; stack: Stack } {
  const app = new App();
  const stack = new Stack(app, "JestDeployedStack", {
    env: {
      account: AWS_ACCOUNT,
      region: AWS_REGION,
    },
  });

  new Bucket(stack, "IntegrationTestBucket", {
    bucketName: "blah-integration-test-bucket",
    versioned: true,
    removalPolicy: RemovalPolicy.DESTROY,
  });

  return { app, stack };
}

const creds = getAwsProfileCredentials(process.env.AWS_PROFILE || "default");
const cfn = cfnClient(
  creds.accessKeyId,
  creds.secretAccessKey,
  creds.sessionToken,
  process.env.AWS_REGION || "us-west-2"
);

describe("CDK stack deployment (AWS SDK v3)", () => {
  afterAll(async () => {
    await deleteStack(cfn, STACK_NAME);
  });

  it("synthesizes and deploys the stack to AWS", async () => {
    const { app, stack } = createTestStack();

    const assembly = app.synth();
    const artifact = assembly.getStackArtifact(stack.artifactId);
    const template = artifact.template;

    await deployTemplate(cfn, STACK_NAME, template);

    const result = await cfn.send(new DescribeStacksCommand({ StackName: STACK_NAME }));

    const status = result.Stacks?.[0]?.StackStatus;
    expect(status).toMatch(/_COMPLETE$/);
  });
});

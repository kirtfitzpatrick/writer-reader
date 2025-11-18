import { DescribeStacksCommand } from "@aws-sdk/client-cloudformation";
import { App, RemovalPolicy, Stack, StackProps } from "aws-cdk-lib";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { cloneDeep, split } from "lodash";
import { AwsParameterStoreStringWriter } from "../../src/dependency/aws-parameter-store-dependency";
import { cfnClient, deleteStack, deployTemplate, getAwsProfileCredentials } from "../lib/aws-functions";
import { ConfigKeyDecorator } from "../lib/config";
import { Jig, TargetKeyDecorator } from "../lib/jig";
// import { AwsParameterStoreWriterStack } from "../stacks/aws-parameter-store-writer-stack";

/**
 * Writer Stack
 */
export interface AwsParameterStoreWriterStackProps extends StackProps {
  jig: Jig;
}

export const AwsParameterStoreWriterStackWriters = {
  awsParameterStoreString: new AwsParameterStoreStringWriter(["parameter-store-string"], ConfigKeyDecorator),
} as const;

export class AwsParameterStoreWriterStack extends Stack {
  constructor(app: App, id: string, props: AwsParameterStoreWriterStackProps) {
    super(app, id);
    const writers = cloneDeep(AwsParameterStoreWriterStackWriters);
    writers.awsParameterStoreString.value = "I am the string you seek";
    writers.awsParameterStoreString.dehydrate(this, props.jig.getKeyDecorator(TargetKeyDecorator));
  }
}

/**
 * Reader Stack
 */
// export const AwsParameterStoreReaderStackReaders = {
//   awsParameterStoreString: new AwsParameterStoreStringReader(
//     AwsParameterStoreWriterStackWriters.awsParameterStoreString,
//     AwsTargetLocation
//   ),
// } as const;

// export class AwsParameterStoreReaderStack extends Stack {
//   constructor(app: App, id: string, jig: Jig) {
//     super(app, id);
//     const readers = cloneDeep(AwsParameterStoreReaderStackReaders);
//     readers.awsParameterStoreString.fetch(jig.getKeyDecorator(TargetKeyDecorator), jig.sources());

//     new StringParameter(this, "retrieved-value", {
//       parameterName: "retrieved-value",
//       stringValue: readers.awsParameterStoreString.value,
//     });
//   }
// }

const writerStackName = "param-store-writer-stack";
// const STACK_NAME = "cdk-jest-demo-stack";
const STACK_NAME = writerStackName;

function createTestStack(): { app: App; stack: Stack } {
  const app = new App();
  const stack = new Stack(app, "JestDeployedStack", {
    // const stack = new Stack(app, writerStackName, {
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

/**
 * Test
 */
jest.setTimeout(60_000);
const AWS_ACCOUNT = split(process.env.AWS_PROFILE, "_")[0];
const AWS_REGION = process.env.AWS_REGION || process.env.CDK_DEFAULT_REGION || "us-west-2";

const creds = getAwsProfileCredentials(process.env.AWS_PROFILE || "default");
const cfn = cfnClient(creds.accessKeyId, creds.secretAccessKey, creds.sessionToken, AWS_REGION);

// const readerStackName = "reader-stack-" + Date.now();

describe("Retrieve param store string from one stack to use somewhere else", () => {
  afterAll(async () => {
    await deleteStack(cfn, STACK_NAME);
    // await deleteStack(cfn, writerStackName);
    // await deleteStack(cfn, readerStackName);
  });

  it("synthesizes and deploys to an AWS account", async () => {
    const jig = new Jig("sigma");

    // const { app, stack } = createTestStack();
    const writerApp = new App();
    const writerStack = new AwsParameterStoreWriterStack(writerApp, STACK_NAME, {
      env: { account: AWS_ACCOUNT, region: AWS_REGION },
      jig: jig,
    });

    const writerAssembly = writerApp.synth();
    const writerArtifact = writerAssembly.getStackArtifact(writerStack.artifactId);
    const writerTemplate = writerArtifact.template;

    // console.log(template);

    await deployTemplate(cfn, STACK_NAME, writerTemplate);

    const result = await cfn.send(new DescribeStacksCommand({ StackName: STACK_NAME }));

    const status = result.Stacks?.[0]?.StackStatus;
    expect(status).toMatch(/_COMPLETE$/);

    // const app = new App();
    // const stack = new AwsParameterStoreWriterStack(app, writerStackName, {
    //   env: { account: AWS_ACCOUNT, region: AWS_REGION },
    //   jig: jig,
    // });
    // const assembly = app.synth();
    // const artifact = assembly.getStackArtifact(stack.artifactId);
    // const template = artifact.template;
    // // console.log(template);

    // deployTemplate(cfn, writerStackName, template);

    // const result = await cfn.send(new DescribeStacksCommand({ StackName: writerStackName }));

    // const status = result.Stacks?.[0]?.StackStatus;
    // expect(status).toMatch(/_COMPLETE$/);

    // const readerApp = new App();
    // const readerStack = new AwsParameterStoreReaderStack(readerApp, readerStackName, jig);
    // const readerAssembly = readerApp.synth();
    // const readerArtifact = readerAssembly.getStackArtifact(readerStack.artifactId);
    // expect(readerArtifact.template).toMatch(/I am the string you seek/);
    // await deployTemplate(cfn, readerStackName, readerArtifact.template);
    // const readerResult = await cfn.send(new DescribeStacksCommand({ StackName: readerStackName }));
    // const readerStatus = readerResult.Stacks?.[0]?.StackStatus;
    // expect(readerStatus).toMatch(/_COMPLETE$/);
  });
});

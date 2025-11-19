import { DescribeStacksCommand } from "@aws-sdk/client-cloudformation";
import { App, Stack, StackProps } from "aws-cdk-lib";
import { StringParameter } from "aws-cdk-lib/aws-ssm";
import { cloneDeep } from "lodash";
import {
  AwsParameterStoreStringReader,
  AwsParameterStoreStringWriter,
} from "../../src/dependency/aws-parameter-store-dependency";
import { cfnClient, deleteStack, deployTemplate, getAwsProfileCredentials } from "../lib/aws-functions";
import { ConfigKeyDecorator } from "../lib/config";
import { AwsCentralLocation, CENTRAL, Jig, TARGET } from "../lib/jig";
/**
 * - two stacks both part of the sigma app so all labels reflect this.
 * - one stack needs to be deployed to the central account and the other to sigma
 * - the sigma stack needs information from the central stack
 * - so the central account stores this info in a properly named parameter
 */

/**
 * Writer Stack - deployed to central location
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
    writers.awsParameterStoreString.dehydrate(this, props.jig.getKeyDecorator(TARGET));
  }
}

/**
 * Reader Stack - deployed to target location
 */

interface AwsParameterStoreReaderStackProps extends StackProps {
  jig: Jig;
}

export const AwsParameterStoreReaderStackReaders = {
  awsParameterStoreString: new AwsParameterStoreStringReader(
    AwsParameterStoreWriterStackWriters.awsParameterStoreString,
    AwsCentralLocation
  ),
} as const;

export class AwsParameterStoreReaderStack extends Stack {
  constructor(app: App, id: string, props: AwsParameterStoreReaderStackProps) {
    super(app, id);
    const readers = cloneDeep(AwsParameterStoreReaderStackReaders);
    readers.awsParameterStoreString.fetch(props.jig.getKeyDecorator(TARGET), props.jig.sources);

    new StringParameter(this, "retrieved-value", {
      parameterName: "retrieved-value",
      stringValue: readers.awsParameterStoreString.value,
    });
  }
}

const writerStackName = "param-store-writer-stack";
const readerStackName = "param-store-reader-stack";

/**
 * Test
 */
jest.setTimeout(60_000);

const jig = new Jig("sigma");

const centralConf = jig.decorators[CENTRAL];
const writerCreds = getAwsProfileCredentials(centralConf.profile);
const writerCfn = cfnClient(
  writerCreds.accessKeyId,
  writerCreds.secretAccessKey,
  writerCreds.sessionToken,
  centralConf.region
);
const targetConf = jig.decorators[TARGET];
const readerCreds = getAwsProfileCredentials(targetConf.profile);
const readerCfn = cfnClient(
  readerCreds.accessKeyId,
  readerCreds.secretAccessKey,
  readerCreds.sessionToken,
  targetConf.region
);

describe("Retrieve param store string from one stack to use somewhere else", () => {
  afterAll(async () => {
    if (!process.env.DEBUG || process.env.DEBUG !== "true") {
      await deleteStack(writerCfn, writerStackName);
      await deleteStack(readerCfn, readerStackName);
    }
  });

  it("synthesizes and deploys to an AWS account", async () => {
    // First deploy the writer stack in the central account
    const writerApp = new App();
    const writerStack = new AwsParameterStoreWriterStack(writerApp, writerStackName, {
      env: { account: centralConf.account, region: centralConf.region }, // these aren't used since we bypass cdk for tests and instead use the CfnClient connection
      jig: jig,
    });
    const writerAssembly = writerApp.synth();
    const writerArtifact = writerAssembly.getStackArtifact(writerStack.artifactId);
    const writerTemplate = writerArtifact.template;
    const writerStrTemplate = JSON.stringify(writerTemplate);
    expect(writerStrTemplate).toMatch(/sigma-parameter-store-string/);
    expect(writerStrTemplate).toMatch(/I am the string you seek/);

    await deployTemplate(writerCfn, writerStackName, writerTemplate);
    const writerResult = await writerCfn.send(new DescribeStacksCommand({ StackName: writerStackName }));
    const writerStatus = writerResult.Stacks?.[0]?.StackStatus;
    expect(writerStatus).toMatch(/_COMPLETE$/);

    // Now deploy the reader stack in the target account
    const readerApp = new App();
    const readerStack = new AwsParameterStoreReaderStack(readerApp, readerStackName, {
      env: { account: targetConf.account, region: targetConf.region }, // these aren't used since we bypass cdk for tests and instead use the CfnClient connection
      jig: jig,
    });
    const readerAssembly = readerApp.synth();
    const readerArtifact = readerAssembly.getStackArtifact(readerStack.artifactId);
    const readerTemplate = readerArtifact.template;
    const readerStrTemplate = JSON.stringify(readerTemplate);
    expect(readerStrTemplate).toMatch(/I am the string you seek/);

    await deployTemplate(readerCfn, readerStackName, readerArtifact.template);
    const readerResult = await readerCfn.send(new DescribeStacksCommand({ StackName: readerStackName }));
    const readerStatus = readerResult.Stacks?.[0]?.StackStatus;
    expect(readerStatus).toMatch(/_COMPLETE$/);
  });
});

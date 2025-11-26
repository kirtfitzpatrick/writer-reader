import { DescribeStacksCommand } from "@aws-sdk/client-cloudformation";
import { App, Stack } from "aws-cdk-lib";
import { StringParameter } from "aws-cdk-lib/aws-ssm";
import { cloneDeep } from "lodash";
import {
  AwsParameterStoreObjectReader,
  AwsParameterStoreObjectWriter,
} from "../../src/dependency/aws-parameter-store-dependency";
import { cfnClient, deleteStack, deployTemplate, getAwsProfileCredentials } from "../lib/aws-functions";
import { ENV_DECORATOR } from "../lib/config";
import { AWS_CENTRAL, AWS_TARGET, Jig, JigStackProps } from "../lib/jig";

/**
 * - two stacks both part of the sigma app so all labels reflect this.
 * - one stack needs to be deployed to the central account and the other to sigma
 * - the sigma stack needs information from the central stack
 * - so the central account stores this info in a properly named parameter by means of a writer dependency
 * - the sigma stack retrieves this info by means of a reader dependency
 */

const WRITTEN_VALUE = "I am the string you seek";
interface TestType {
  propertyOne: string;
  propertyTwo: number;
}

/**
 * Writer Stack - deployed to central location
 */
export const AwsParameterStoreWriterStackWriters = {
  awsParameterStoreObject: new AwsParameterStoreObjectWriter<TestType>("parameter-store-object", ENV_DECORATOR),
} as const;

export class AwsParameterStoreWriterStack extends Stack {
  constructor(app: App, id: string, props: JigStackProps) {
    super(app, id);
    const writers = cloneDeep(AwsParameterStoreWriterStackWriters);
    writers.awsParameterStoreObject.value = {
      propertyOne: WRITTEN_VALUE,
      propertyTwo: 42,
    };
    writers.awsParameterStoreObject.dehydrate(this, props.targetConf);
  }
}

/**
 * Reader Stack - deployed to target location
 */
export const AwsParameterStoreReaderStackReaders = {
  awsParameterStoreObject: new AwsParameterStoreObjectReader<TestType>(
    AwsParameterStoreWriterStackWriters.awsParameterStoreObject,
    AWS_CENTRAL
  ),
} as const;

export class AwsParameterStoreReaderStack extends Stack {
  constructor(app: App, id: string, props: JigStackProps) {
    super(app, id);
    const readers = cloneDeep(AwsParameterStoreReaderStackReaders);
    readers.awsParameterStoreObject.fetch(props.targetConf, props.jig.sources);

    new StringParameter(this, "retrieved-object", {
      parameterName: "retrieved-object",
      stringValue: JSON.stringify(readers.awsParameterStoreObject.value),
    });
  }
}

const writerStackName = "param-store-object-writer-stack";
const readerStackName = "param-store-object-reader-stack";

/**
 * Test
 */
jest.setTimeout(80_000);

const jig = new Jig("sigma");

const centralConf = jig.centralConf;
const writerCreds = getAwsProfileCredentials(centralConf.profile);
const writerCfn = cfnClient(
  writerCreds.accessKeyId,
  writerCreds.secretAccessKey,
  writerCreds.sessionToken,
  centralConf.region
);
const targetConf = jig.targetConf;
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
    const writerStack = new AwsParameterStoreWriterStack(writerApp, writerStackName, jig.stackProps(AWS_CENTRAL));
    const writerAssembly = writerApp.synth();
    const writerArtifact = writerAssembly.getStackArtifact(writerStack.artifactId);
    const writerTemplate = writerArtifact.template;
    const writerStrTemplate = JSON.stringify(writerTemplate);
    expect(writerStrTemplate).toMatch(/sigma-parameter-store-object/);
    expect(writerStrTemplate).toMatch(new RegExp(WRITTEN_VALUE));
    expect(writerStrTemplate).toMatch(new RegExp(`${42}`));

    await deployTemplate(writerCfn, writerStackName, writerTemplate);
    const writerResult = await writerCfn.send(new DescribeStacksCommand({ StackName: writerStackName }));
    const writerStatus = writerResult.Stacks?.[0]?.StackStatus;
    expect(writerStatus).toMatch(/_COMPLETE$/);

    // Now deploy the reader stack in the target account
    const readerApp = new App();
    const readerStack = new AwsParameterStoreReaderStack(readerApp, readerStackName, jig.stackProps(AWS_TARGET));
    const readerAssembly = readerApp.synth();
    const readerArtifact = readerAssembly.getStackArtifact(readerStack.artifactId);
    const readerTemplate = readerArtifact.template;
    const readerStrTemplate = JSON.stringify(readerTemplate);
    expect(readerStrTemplate).toMatch(new RegExp(WRITTEN_VALUE));

    await deployTemplate(readerCfn, readerStackName, readerArtifact.template);
    const readerResult = await readerCfn.send(new DescribeStacksCommand({ StackName: readerStackName }));
    const readerStatus = readerResult.Stacks?.[0]?.StackStatus;
    expect(readerStatus).toMatch(/_COMPLETE$/);
  });
});

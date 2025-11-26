import { DescribeStacksCommand } from "@aws-sdk/client-cloudformation";
import { App, SecretValue, Stack } from "aws-cdk-lib";
import { Secret } from "aws-cdk-lib/aws-secretsmanager";
import { StringParameter } from "aws-cdk-lib/aws-ssm";
import { cloneDeep } from "lodash";
import {
  AwsSecretsManagerStringReader,
  AwsSecretsManagerStringWriter,
} from "../../src/dependency/aws-secrets-manager-dependency";
import { cfnClient, deleteStack, deployTemplate, getAwsProfileCredentials } from "../lib/aws-functions";
import { ENV_DECORATOR } from "../lib/config";
import { AWS_CENTRAL, AWS_TARGET, Jig, JigStackProps } from "../lib/jig";

const WRITTEN_VALUE = "I am the secret you seek";

/**
 * Writer Stack - deployed to central location
 */
export const AwsSecretsManagerWriterStackWriters = {
  awsSecretString: new AwsSecretsManagerStringWriter(["secret-string"], ENV_DECORATOR),
} as const;

export class AwsSecretsManagerWriterStack extends Stack {
  constructor(app: App, id: string, props: JigStackProps) {
    super(app, id);
    const writers = cloneDeep(AwsSecretsManagerWriterStackWriters);
    // Secrets typically are too complex to abstract away their implementation
    // We typically must create them explicitly
    writers.awsSecretString.construct = new Secret(this, "secret", {
      secretName: writers.awsSecretString.getKeyName(props.targetConf),
      secretStringValue: SecretValue.unsafePlainText(WRITTEN_VALUE),
    });
  }
}

/**
 * Reader Stack - deployed to target location
 */
export const AwsSecretsManagerReaderStackReaders = {
  awsSecretString: new AwsSecretsManagerStringReader(AwsSecretsManagerWriterStackWriters.awsSecretString, AWS_CENTRAL),
} as const;

export class AwsSecretsManagerReaderStack extends Stack {
  constructor(app: App, id: string, props: JigStackProps) {
    super(app, id);
    const readers = cloneDeep(AwsSecretsManagerReaderStackReaders);
    readers.awsSecretString.fetch(props.targetConf, props.jig.sources);

    new StringParameter(this, "retrieved-secret", {
      parameterName: "retrieved-secret",
      stringValue: readers.awsSecretString.value,
    });
  }
}

const writerStackName = "secret-writer-stack";
const readerStackName = "secret-reader-stack";

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

describe("Retrieve secret string from one stack to use somewhere else", () => {
  afterAll(async () => {
    if (!process.env.DEBUG || process.env.DEBUG !== "true") {
      await deleteStack(writerCfn, writerStackName);
      await deleteStack(readerCfn, readerStackName);
    }
  });

  it("synthesizes and deploys to an AWS account", async () => {
    // First deploy the writer stack in the central account
    const writerApp = new App();
    const writerStack = new AwsSecretsManagerWriterStack(writerApp, writerStackName, jig.stackProps(AWS_CENTRAL));
    const writerAssembly = writerApp.synth();
    const writerArtifact = writerAssembly.getStackArtifact(writerStack.artifactId);
    const writerTemplate = writerArtifact.template;
    const writerStrTemplate = JSON.stringify(writerTemplate);
    expect(writerStrTemplate).toMatch(/sigma-secret-string/);
    expect(writerStrTemplate).toMatch(new RegExp(WRITTEN_VALUE));

    await deployTemplate(writerCfn, writerStackName, writerTemplate);
    const writerResult = await writerCfn.send(new DescribeStacksCommand({ StackName: writerStackName }));
    const writerStatus = writerResult.Stacks?.[0]?.StackStatus;
    expect(writerStatus).toMatch(/_COMPLETE$/);

    // Now deploy the reader stack in the target account
    const readerApp = new App();
    const readerStack = new AwsSecretsManagerReaderStack(readerApp, readerStackName, jig.stackProps(AWS_TARGET));
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

import {
  CloudFormationClient,
  CreateStackCommand,
  DeleteStackCommand,
  DescribeStacksCommand,
  UpdateStackCommand,
  waitUntilStackCreateComplete,
  waitUntilStackDeleteComplete,
  waitUntilStackUpdateComplete,
} from "@aws-sdk/client-cloudformation";
import { execSync } from "child_process";

jest.setTimeout(30 * 60 * 1000); // 30 minutes

export function getAwsProfileCredentials(profileName: string): {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken: string;
} {
  const json = execSync(`aws --profile ${profileName} configure export-credentials`, { encoding: "utf-8" });
  const credsObj = JSON.parse(json.toString());

  return {
    accessKeyId: credsObj.AccessKeyId,
    secretAccessKey: credsObj.SecretAccessKey,
    sessionToken: credsObj.SessionToken,
  };
}

export function cfnClient(
  accessKeyId: string,
  secretAccessKey: string,
  sessionToken: string,
  region: string
): CloudFormationClient {
  const cfn = new CloudFormationClient({
    region: region,
    credentials: {
      accessKeyId: accessKeyId,
      secretAccessKey: secretAccessKey,
      sessionToken: sessionToken,
    },
  });

  return cfn;
}

export async function stackExists(cfn: CloudFormationClient, stackName: string): Promise<boolean> {
  try {
    await cfn.send(
      new DescribeStacksCommand({
        StackName: stackName,
      })
    );
    return true;
  } catch (err: any) {
    if (
      (err.name === "ValidationError" || err.name === "ValidationException") &&
      typeof err.message === "string" &&
      /does not exist/.test(err.message)
    ) {
      return false;
    }
    throw err;
  }
}

export async function deployTemplate(cfn: CloudFormationClient, stackName: string, template: any): Promise<void> {
  const templateBody = JSON.stringify(template);

  if (!(await stackExists(cfn, stackName))) {
    await cfn.send(
      new CreateStackCommand({
        StackName: stackName,
        TemplateBody: templateBody,
        Capabilities: ["CAPABILITY_NAMED_IAM", "CAPABILITY_AUTO_EXPAND"],
      })
    );

    await waitUntilStackCreateComplete(
      {
        client: cfn,
        maxWaitTime: 50 * 60, // seconds
      },
      { StackName: stackName }
    );
  } else {
    try {
      await cfn.send(
        new UpdateStackCommand({
          StackName: stackName,
          TemplateBody: templateBody,
          Capabilities: ["CAPABILITY_NAMED_IAM", "CAPABILITY_AUTO_EXPAND"],
        })
      );

      await waitUntilStackUpdateComplete(
        {
          client: cfn,
          maxWaitTime: 30 * 60, // seconds
        },
        { StackName: stackName }
      );
    } catch (err: any) {
      if (
        (err.name === "ValidationError" || err.name === "ValidationException") &&
        typeof err.message === "string" &&
        /No updates are to be performed/.test(err.message)
      ) {
        return;
      }
      throw err;
    }
  }
}

export async function deleteStack(cfn: CloudFormationClient, stackName: string): Promise<void> {
  await cfn.send(
    new DeleteStackCommand({
      StackName: stackName,
    })
  );

  await waitUntilStackDeleteComplete(
    {
      client: cfn,
      maxWaitTime: 30 * 60, // seconds
    },
    { StackName: stackName }
  );
}

import { GetParameterCommand, SSMClient } from "@aws-sdk/client-ssm";
import { AssumeRoleCommand, STSClient } from "@aws-sdk/client-sts";

export interface MacroEventParams {
  parameterStoreRegion: string;
  parameterStoreRoleArn: string;
  parameterStoreKey: string;
}

export interface MacroEvent {
  accountId: string;
  fragment: any;
  transformId: string;
  requestId: string;
  region: string;
  params: MacroEventParams;
  templateParameterValues: any;
}

async function assumeRole(roleArn: string, roleSessionName: string) {
  const stsClient = new STSClient();
  const params = {
    RoleArn: roleArn,
    RoleSessionName: roleSessionName,
  };
  const role = await stsClient.send(new AssumeRoleCommand(params));

  return role.Credentials;
}

async function fetchParameter(parameterName: string, credentials: any, region: string) {
  const ssmClient = new SSMClient({
    credentials: {
      accessKeyId: credentials.AccessKeyId,
      secretAccessKey: credentials.SecretAccessKey,
      sessionToken: credentials.SessionToken,
    },
    region: region,
  });
  const parameter = await ssmClient.send(new GetParameterCommand({ Name: parameterName, WithDecryption: true }));

  return parameter.Parameter?.Value;
}

export async function handler(event: MacroEvent): Promise<any> {
  console.log(event);
  const parameterStoreRegion = event.params.parameterStoreRegion;
  const parameterStoreRoleArn = event.params.parameterStoreRoleArn;
  const parameterStoreKey = event.params.parameterStoreKey;

  try {
    const roleSessionName = "CustomResourceSession";
    const credentials = await assumeRole(parameterStoreRoleArn, roleSessionName);
    const parameterValue = await fetchParameter(parameterStoreKey, credentials, parameterStoreRegion);
    // const fragment = JSON.stringify(parameterValue);
    const fragment = parameterValue;
    console.log(fragment);

    return {
      requestId: event.requestId,
      status: "success",
      fragment: fragment,
    };
  } catch (error: any) {
    console.error("An error occurred:", error);
    throw new Error(`Failed to fetch SSM Parameter: ${error.message}`);
  }
}

import { execSync } from "child_process";
import { FgBlue, FgGray, Reset } from "../../lib/colors";
import { DependencySource } from "./dependency-source";

export class AwsCliSource implements DependencySource {
  protected silent: boolean = false; // TODO: not needed anymore. logDebug handles it with DEBUG env var

  constructor(protected profile: string, protected region: string, props?: any) {
    if (props && props.debug !== undefined) {
      this.silent = !props.debug;
    }
  }

  public getString(key: string): string {
    let responseObj;
    const awsCliCmd = `aws ssm get-parameter --profile ${this.profile} --region ${this.region} --name "${key}"`;
    const responseJson = execSync(awsCliCmd, { encoding: "utf8" });

    this.debugCmd(awsCliCmd);

    try {
      responseObj = JSON.parse(responseJson);
    } catch (e) {
      console.error("AwsApiSource.getString() command failed: " + awsCliCmd);
      console.error(`Error parsing JSON: ${responseJson}`);
      throw e;
    }

    const paramValue = responseObj.Parameter.Value;
    this.debugResponse(paramValue);

    return paramValue;
  }

  public getSecret(key: string): string {
    let secretString, responseObj;
    const awsCliCmd = `aws secretsmanager get-secret-value --profile ${this.profile} --region ${this.region} --secret-id "${key}"`;
    const responseJson = execSync(awsCliCmd, { encoding: "utf8" });

    this.debugCmd(awsCliCmd);

    try {
      responseObj = JSON.parse(responseJson);
    } catch (e) {
      console.error("AwsApiSource.getSecret() command failed: " + awsCliCmd);
      console.error(`Error parsing JSON: ${responseJson}`);
      throw e;
    }

    secretString = responseObj.SecretString;
    this.debugResponse(secretString);

    return secretString;
  }

  protected debugCmd(msg: string): void {
    if (!this.silent) {
      console.log("    " + FgBlue + msg + Reset);
    }
  }

  protected debugResponse(msg: string): void {
    if (!this.silent) {
      console.log("      " + FgGray + msg + Reset);
    }
  }
}

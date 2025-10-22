import { snakeCase, toUpper } from "lodash";
import { DependencySource } from "./dependency-source";

export class ProcessEnvSource implements DependencySource {
  public getString(key: string): string {
    return process.env[ProcessEnvSource.formatKey(key)] as string;
  }

  public getSecret(key: string): string {
    return process.env[ProcessEnvSource.formatKey(key)] as string;
  }

  public static formatKey(key: string): string {
    return toUpper(snakeCase(key));
  }
}

import { execSync } from "child_process";
import { DependencySource } from "./dependency-source";

export class KubectlSource implements DependencySource {
  constructor(protected namespace: string, protected context: string) {}

  /**
   * Retrieves a string value from a Kubernetes ConfigMap using kubectl.
   * @param key The name of the ConfigMap key to retrieve.
   * @returns The string value from the ConfigMap.
   */
  public getString(key: string): string {
    const cmd = `kubectl --context ${this.context} -n ${this.namespace} get configmap ${key} -o jsonpath="{.data.value}"`;
    const output = execSync(cmd, { encoding: "utf8" });

    return output;
  }

  public getSecret(key: string): string {
    const cmd = `kubectl --context ${this.context} -n ${this.namespace} get secret ${key} -o jsonpath="{.data.value}" | base64 --decode`;
    const output = execSync(cmd, { encoding: "utf8" });

    return output;
  }
}

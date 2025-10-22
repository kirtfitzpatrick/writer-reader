import { App, Chart } from "cdk8s";
import { cloneDeep } from "lodash";
import { K8sSecretStringWriter } from "../../src/dependency/k8s-secret-dependency";
import { ConfigKeyDecorator } from "../lib/config";
import { Jig, TargetKeyDecorator } from "../lib/jig";

export const K8sSecretWriterChartWriters = {
  k8sSecret: new K8sSecretStringWriter(["secret"], ConfigKeyDecorator),
} as const;

export class K8sSecretWriterChart extends Chart {
  constructor(app: App, id: string, jig: Jig) {
    super(app, id);
    const writers = cloneDeep(K8sSecretWriterChartWriters);
    writers.k8sSecret.value = "I am the secret you seek";
    writers.k8sSecret.dehydrate(this, jig.getKeyDecorator(TargetKeyDecorator));
  }
}

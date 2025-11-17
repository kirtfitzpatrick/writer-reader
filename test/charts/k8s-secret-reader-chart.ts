import { App, Chart } from "cdk8s";
import { KubeConfigMap } from "cdk8s-plus-28/lib/imports/k8s";
import { cloneDeep } from "lodash";
import { K8sSecretStringReader } from "../../src/dependency/k8s-secret-dependency";
import { Jig, K8sCentralLocation, TargetKeyDecorator } from "../lib/jig";
import { K8sSecretWriterChartWriters } from "./k8s-secret-writer-chart";

export const K8sSecretReaderChartReaders = {
  k8sSecret: new K8sSecretStringReader(K8sSecretWriterChartWriters.k8sSecret, K8sCentralLocation),
} as const;

export class K8sSecretReaderChart extends Chart {
  constructor(app: App, id: string, jig: Jig) {
    super(app, id);
    const readers = cloneDeep(K8sSecretReaderChartReaders);
    readers.k8sSecret.fetch(jig.getKeyDecorator(TargetKeyDecorator), jig.sources());

    new KubeConfigMap(this, "retrieved-value", {
      metadata: {
        name: "retrieved-value",
        namespace: "default", // TODO: This should come from the Jig config objects
      },
      data: {
        value: readers.k8sSecret.value,
      },
    });
  }
}

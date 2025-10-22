import { App, Chart } from "cdk8s";
import { cloneDeep } from "lodash";
import { K8sSecretStringReader } from "../../src/dependency/k8s-secret-dependency";
import { CentralLocation, Jig, TargetKeyDecorator } from "../lib/jig";
import { K8sSecretWriterChartWriters } from "./k8s-secret-writer-chart";

export const K8sSecretReaderChartReaders = {
  k8sSecret: new K8sSecretStringReader(K8sSecretWriterChartWriters.k8sSecret, CentralLocation),
} as const;

export class K8sSecretReaderChart extends Chart {
  constructor(app: App, id: string, jig: Jig) {
    super(app, id);
    const readers = cloneDeep(K8sSecretReaderChartReaders);
    readers.k8sSecret.fetch(jig.getKeyDecorator(TargetKeyDecorator), jig.sources());
    console.error("K8sSecretReaderChart readers", readers);
  }
}

import { App, Chart } from "cdk8s";
import { KubeConfigMap } from "cdk8s-plus-28/lib/imports/k8s";
import { cloneDeep } from "lodash";
import { K8sConfigMapStringReader } from "../../src/dependency/k8s-config-map-dependency";
import { Jig, K8sCentralLocation, TargetKeyDecorator } from "../lib/jig";
import { ConfigMapWriterChartWriters } from "./k8s-config-map-writer-chart";

export const ConfigMapReaderChartReaders = {
  k8sConfigMap: new K8sConfigMapStringReader(ConfigMapWriterChartWriters.k8sConfigMap, K8sCentralLocation),
} as const;

export class ConfigMapReaderChart extends Chart {
  constructor(app: App, id: string, jig: Jig) {
    super(app, id);
    const readers = cloneDeep(ConfigMapReaderChartReaders);
    readers.k8sConfigMap.fetch(jig.getKeyDecorator(TargetKeyDecorator), jig.sources());

    new KubeConfigMap(this, "retrieved-value", {
      metadata: {
        name: "retrieved-value",
        namespace: "default", // TODO: This should come from the Jig config objects
      },
      data: {
        value: readers.k8sConfigMap.value,
      },
    });
  }
}

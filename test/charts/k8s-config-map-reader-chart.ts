import { App, Chart } from "cdk8s";
import { cloneDeep } from "lodash";
import { K8sConfigMapStringReader } from "../../src/dependency/k8s-config-map-dependency";
import { CentralLocation, Jig, TargetKeyDecorator } from "../lib/jig";
import { ConfigMapWriterChartWriters } from "./k8s-config-map-writer-chart";

export const ConfigMapReaderChartReaders = {
  k8sConfigMap: new K8sConfigMapStringReader(ConfigMapWriterChartWriters.k8sConfigMap, CentralLocation),
} as const;

export class ConfigMapReaderChart extends Chart {
  constructor(app: App, id: string, jig: Jig) {
    super(app, id);
    const readers = cloneDeep(ConfigMapReaderChartReaders);
    readers.k8sConfigMap.fetch(jig.getKeyDecorator(TargetKeyDecorator), jig.sources());
    console.error("ConfigMapReaderChart readers", readers);
  }
}

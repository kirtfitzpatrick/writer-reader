import { App, Chart } from "cdk8s";
import { cloneDeep } from "lodash";
import { K8sConfigMapStringWriter } from "../../src/dependency/k8s-config-map-dependency";
import { ConfigKeyDecorator } from "../lib/config";
import { Jig, TARGET } from "../lib/jig";

export const ConfigMapWriterChartWriters = {
  k8sConfigMap: new K8sConfigMapStringWriter(["config-map"], ConfigKeyDecorator),
} as const;

export class ConfigMapWriterChart extends Chart {
  constructor(app: App, id: string, jig: Jig) {
    super(app, id);
    const writers = cloneDeep(ConfigMapWriterChartWriters);
    writers.k8sConfigMap.value = "I am the config map you seek";
    writers.k8sConfigMap.dehydrate(this, jig.getKeyDecorator(TARGET));
  }
}

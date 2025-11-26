import { App, Chart } from "cdk8s";
import { KubeConfigMap } from "cdk8s-plus-28/lib/imports/k8s";
import { execSync } from "child_process";
import { cloneDeep } from "lodash";
import { K8sConfigMapStringReader, K8sConfigMapStringWriter } from "../../src/dependency/k8s-config-map-dependency";
import { ENV_DECORATOR } from "../lib/config";
import { Jig, K8S_CENTRAL } from "../lib/jig";

export const ConfigMapWriterChartWriters = {
  k8sConfigMap: new K8sConfigMapStringWriter(["config-map"], ENV_DECORATOR),
} as const;

export class ConfigMapWriterChart extends Chart {
  constructor(app: App, id: string, jig: Jig) {
    super(app, id);
    const writers = cloneDeep(ConfigMapWriterChartWriters);
    writers.k8sConfigMap.value = "I am the config map you seek";
    writers.k8sConfigMap.dehydrate(this, jig.targetConf);
  }
}

export const ConfigMapReaderChartReaders = {
  k8sConfigMap: new K8sConfigMapStringReader(ConfigMapWriterChartWriters.k8sConfigMap, K8S_CENTRAL),
} as const;

export class ConfigMapReaderChart extends Chart {
  constructor(app: App, id: string, jig: Jig) {
    super(app, id);
    const readers = cloneDeep(ConfigMapReaderChartReaders);
    readers.k8sConfigMap.fetch(jig.targetConf, jig.sources);

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

jest.setTimeout(60_000);

function synthChartToYaml(chart: Chart): string {
  const app = App.of(chart) as App;
  return app.synthYaml();
}

function kubectlApply(manifestYaml: string, context: string) {
  execSync(`kubectl --context=${context} apply -f -`, {
    input: manifestYaml,
    stdio: ["pipe", "inherit", "inherit"],
    encoding: "utf8",
  });
}

describe("Retrieve config map string one one cluster to use in another", () => {
  it("synthesizes and deploys to cluster A then cluster B", () => {
    const jig = new Jig("sigma");

    const writerApp = new App();
    const writerChart = new ConfigMapWriterChart(writerApp, "config-map-writer-chart", jig);
    const writerYaml = synthChartToYaml(writerChart);
    expect(writerYaml).toContain("I am the config map you seek");
    kubectlApply(writerYaml, jig.centralConf.context);

    const readerApp = new App();
    const readerChart = new ConfigMapReaderChart(readerApp, "config-map-reader-chart", jig);
    const readerYaml = synthChartToYaml(readerChart);
    expect(readerYaml).toContain("I am the config map you seek");

    kubectlApply(readerYaml, jig.targetConf.context);
  });
});

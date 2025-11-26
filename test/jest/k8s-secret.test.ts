import { App, Chart } from "cdk8s";
import { KubeConfigMap } from "cdk8s-plus-28/lib/imports/k8s";
import { execSync } from "child_process";
import { cloneDeep } from "lodash";
import { K8sSecretStringReader, K8sSecretStringWriter } from "../../src/dependency/k8s-secret-dependency";
import { ENV_DECORATOR } from "../lib/config";
import { Jig, K8S_CENTRAL } from "../lib/jig";

export const K8sSecretWriterChartWriters = {
  k8sSecret: new K8sSecretStringWriter(["secret"], ENV_DECORATOR),
} as const;

export class K8sSecretWriterChart extends Chart {
  constructor(app: App, id: string, jig: Jig) {
    super(app, id);
    const writers = cloneDeep(K8sSecretWriterChartWriters);
    writers.k8sSecret.value = "I am the secret you seek";
    writers.k8sSecret.dehydrate(this, jig.targetConf);
  }
}

export const K8sSecretReaderChartReaders = {
  k8sSecret: new K8sSecretStringReader(K8sSecretWriterChartWriters.k8sSecret, K8S_CENTRAL),
} as const;

export class K8sSecretReaderChart extends Chart {
  constructor(app: App, id: string, jig: Jig) {
    super(app, id);
    const readers = cloneDeep(K8sSecretReaderChartReaders);
    readers.k8sSecret.fetch(jig.targetConf, jig.sources);

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

describe("retrieve secret from one cluster to use in a chart for another cluster", () => {
  it("synthesizes and deploys to cluster A then cluster B", () => {
    const jig = new Jig("sigma");

    const writerApp = new App();
    const writerChart = new K8sSecretWriterChart(writerApp, "k8s-secret-writer-chart", jig);
    const writerYaml = synthChartToYaml(writerChart);
    kubectlApply(writerYaml, jig.centralConf.context);

    const readerApp = new App();
    const readerChart = new K8sSecretReaderChart(readerApp, "k8s-secret-reader-chart", jig);
    const readerYaml = synthChartToYaml(readerChart);
    expect(readerYaml).toContain("I am the secret you seek");

    kubectlApply(readerYaml, jig.targetConf.context);
  });
});

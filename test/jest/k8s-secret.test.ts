import { App, Chart } from "cdk8s";
import { execSync } from "child_process";
import { K8sSecretReaderChart } from "../charts/k8s-secret-reader-chart";
import { K8sSecretWriterChart } from "../charts/k8s-secret-writer-chart";
import { CENTRAL, Jig, TARGET } from "../lib/jig";

jest.setTimeout(60_000);

function synthChartToYaml(chart: Chart): string {
  const app = App.of(chart) as App;
  return app.synthYaml();
}

function kubectlApply(manifestYaml: string, context: string) {
  console.log(`kubectl --context=${context} apply -f -`);
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
    kubectlApply(writerYaml, jig.decorators[CENTRAL].context);

    const readerApp = new App();
    const readerChart = new K8sSecretReaderChart(readerApp, "k8s-secret-reader-chart", jig);
    const readerYaml = synthChartToYaml(readerChart);
    expect(readerYaml).toContain("I am the secret you seek");

    kubectlApply(readerYaml, jig.decorators[TARGET].context);
  });
});

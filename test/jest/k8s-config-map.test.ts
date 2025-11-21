import { App, Chart } from "cdk8s";
import { execSync } from "child_process";
import { ConfigMapReaderChart } from "../charts/k8s-config-map-reader-chart";
import { ConfigMapWriterChart } from "../charts/k8s-config-map-writer-chart";
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

describe("Retrieve config map string one one cluster to use in another", () => {
  it("synthesizes and deploys to cluster A then cluster B", () => {
    const jig = new Jig("sigma");

    const writerApp = new App();
    const writerChart = new ConfigMapWriterChart(writerApp, "config-map-writer-chart", jig);
    const writerYaml = synthChartToYaml(writerChart);
    expect(writerYaml).toContain("I am the config map you seek");
    kubectlApply(writerYaml, jig.decorators[CENTRAL].context);

    const readerApp = new App();
    const readerChart = new ConfigMapReaderChart(readerApp, "config-map-reader-chart", jig);
    const readerYaml = synthChartToYaml(readerChart);
    expect(readerYaml).toContain("I am the config map you seek");

    kubectlApply(readerYaml, jig.decorators[TARGET].context);
  });
});

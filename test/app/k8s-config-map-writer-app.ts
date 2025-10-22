import { App } from "cdk8s";
import { ConfigMapWriterChart } from "../charts/k8s-config-map-writer-chart";
import { Jig } from "../lib/jig";

const app = new App();
const jig = new Jig("sigma");
const chart = new ConfigMapWriterChart(app, "config-map-writer-chart", jig);
app.synth();

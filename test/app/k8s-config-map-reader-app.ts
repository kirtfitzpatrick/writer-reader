import { App } from "cdk8s";
import { ConfigMapReaderChart } from "../charts/k8s-config-map-reader-chart";
import { Jig } from "../lib/jig";

const app = new App();
const jig = new Jig("sigma");
const chart = new ConfigMapReaderChart(app, "config-map-reader-chart", jig);
app.synth();

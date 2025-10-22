import { App } from "cdk8s";
import { K8sSecretWriterChart } from "../charts/k8s-secret-writer-chart";
import { Jig } from "../lib/jig";

const app = new App();
const jig = new Jig("sigma");
new K8sSecretWriterChart(app, "secret-writer-chart", jig);
app.synth();

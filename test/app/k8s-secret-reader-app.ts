import { App } from "cdk8s";
import { K8sSecretReaderChart } from "../charts/k8s-secret-reader-chart";
import { Jig } from "../lib/jig";

const app = new App();
const jig = new Jig("sigma");
new K8sSecretReaderChart(app, "secret-reader-chart", jig);
app.synth();

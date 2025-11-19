/**
 * One app that can deploy across multiple accounts and regions while managing
 * the dependencies between them. To do this right requires the macro tokenization
 * and fetch system so resolving the dependencies can be postponed until deploy
 * time rather than the synth.
 */

import { App } from "aws-cdk-lib";
import { AWS_TARGET } from "../../src/dependency/jig";
import { Jig } from "./jig";
import { VpcStack } from "./vpc-stack";

export class MultiAccountAndRegionApp {
  constructor(envName: string) {
    const app = new App();
    const jig = new Jig(envName);

    // VPC Stack
    const vpcStack = new VpcStack(app, "VpcStack", jig.stackProps(AWS_TARGET));
    // CDN Stack
    // Domain Stack
  }
}

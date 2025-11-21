/**
 * One app that can deploy across multiple accounts and regions while managing
 * the dependencies between them. To do this right requires the macro tokenization
 * and fetch system so resolving the dependencies can be postponed until deploy
 * time rather than the synth.
 */

import { App } from "aws-cdk-lib";
import { DomainStack } from "./domain-stack";
import { AWS_CENTRAL, AWS_TARGET, Jig } from "./jig";
import { S3Stack } from "./s3-stack";
import { VpcStack } from "./vpc-stack";

export class MultiAccountAndRegionApp {
  constructor(envName: string) {
    const app = new App();
    const jig = new Jig(envName);

    const vpcStack = new VpcStack(app, "VpcStack", jig.stackProps(AWS_TARGET));
    const s3Stack = new S3Stack(app, "S3Stack", jig.stackProps(AWS_TARGET));

    const domainStack = new DomainStack(app, "DomainStack", jig.stackProps(AWS_CENTRAL));
    domainStack.addDependency(s3Stack); // Domain Stack depends on S3 Stack
  }
}

new MultiAccountAndRegionApp(process.argv[2]);

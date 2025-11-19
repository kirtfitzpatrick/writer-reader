// import "reflect-metadata";
// import "source-map-support/register";
//
import { App, Stage } from "aws-cdk-lib";
import { CENTRAL_CONF, Jig, TARGET_CONF } from "../dependency/jig";
import { FlexDepStage } from "./flex-dep-stage";

export class FlexApp {
  constructor(confName: string) {
    const jig = new Jig(confName);
    const targetConf = jig.decorators[TARGET_CONF];
    const centralConf = jig.decorators[CENTRAL_CONF];
    const app = new App();
    const scope = new Stage(app, targetConf.name);

    FlexDepStage.oneWayStacks(scope, {
      writingLocation: targetConf,
      readingLocation: centralConf,
      prefix: "FlexDepXAcct",
    });
    FlexDepStage.oneWayStacks(scope, {
      writingLocation: targetConf,
      readingLocation: targetConf,
      prefix: "FlexDepXRegion",
    });

    app.synth();
  }
}

new FlexApp(process.argv[2]);

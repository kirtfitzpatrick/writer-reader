import "reflect-metadata";
import "source-map-support/register";
//
import { App, Stage } from "aws-cdk-lib";
import { CENTRAL_CONF, Jig, TARGET_CONF } from "../dependency/jig";
import { FlexDepStage } from "./flex-dep-stage";

export class FlexApp {
  constructor(confName: string) {
    const hammer = new Jig(confName);
    const targetConf = hammer.decorators[TARGET_CONF];
    const centralConf = hammer.decorators[CENTRAL_CONF];
    const app = new App();
    const scope = new Stage(app, targetConf.name);

    FlexDepStage.oneWayStacks(scope, {
      producingLocation: targetConf,
      consumingLocation: centralConf,
      prefix: "FlexDepXAcct",
    });
    FlexDepStage.oneWayStacks(scope, {
      producingLocation: targetConf,
      consumingLocation: targetConf,
      prefix: "FlexDepXRegion",
    });

    app.synth();
  }
}

new FlexApp(process.argv[2]);

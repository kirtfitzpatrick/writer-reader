import { App, Stage } from "aws-cdk-lib";
import { CENTRAL_CONF, Jig, TARGET_CONF } from "../dependency/jig";
import { CfnMacrosStage } from "./cfn-macros-stage";

export class CfnMacrosApp {
  constructor(confName: string) {
    const jig = new Jig(confName);
    const targetConf = jig.decorators[TARGET_CONF];
    const centralConf = jig.decorators[CENTRAL_CONF];
    const app = new App();
    const scope = new Stage(app, targetConf.name);

    CfnMacrosStage.oneWayStacks(scope, {
      writingLocation: targetConf,
      readingLocation: centralConf,
      prefix: "CfnTokenXAcct",
    });
    CfnMacrosStage.oneWayStacks(scope, {
      writingLocation: targetConf,
      readingLocation: targetConf,
      prefix: "CfnTokenXRegion",
    });

    app.synth();
  }
}

new CfnMacrosApp(process.argv[2]);

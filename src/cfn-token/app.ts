import { App, Stage } from "aws-cdk-lib";
import { CfnMacrosStage } from "./cfn-macros-stage";
import { Jig } from "./jig";

export class CfnMacrosApp {
  constructor(writer: string, reader: string) {
    const jig = new Jig(writer, reader);
    console.log(jig);
    const writerConf = jig.writerConf;
    const readerConf = jig.readerConf;
    const app = new App();
    const scope = new Stage(app, writerConf.name);

    CfnMacrosStage.oneWayStacks(scope, {
      writingLocation: writerConf,
      readingLocation: readerConf,
      prefix: "CfnTokenXAcct",
    });
    CfnMacrosStage.oneWayStacks(scope, {
      writingLocation: writerConf,
      readingLocation: writerConf,
      prefix: "CfnTokenXRegion",
    });

    app.synth();
  }
}

new CfnMacrosApp(process.argv[2], process.argv[3]);

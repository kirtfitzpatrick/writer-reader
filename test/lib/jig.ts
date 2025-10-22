/**
 * What this needs to do:
 * - locations
 * - setup sources
 * - setup key masters
 */

import { WriterLocation } from "../../src/dependency/source-location";
import { DependencySource } from "../../src/dependency/source/dependency-source";
import { KubectlSource } from "../../src/dependency/source/kubectl-source";
import { Config } from "./config";

export type KeyDecoratorConstant = string;
export const TargetKeyDecorator: KeyDecoratorConstant = "target";
export const CentralKeyDecorator: KeyDecoratorConstant = "central";

export const TargetLocation: WriterLocation = "TARGET";
export const CentralLocation: WriterLocation = "CENTRAL";

export class Jig {
  protected KeyDecoratorDict: { [key in WriterLocation]: Config };
  protected WriterLocationDict: { [key in WriterLocation]: DependencySource }; // SourceDict?

  constructor(name: string) {
    // KeyMasters
    this.KeyDecoratorDict = {
      [CentralKeyDecorator]: Config.load("central"),
      [TargetKeyDecorator]: Config.load(name),
    };
    // In the case of multiple kinds of sources the conf file could hold that info
    // but it's so implementation specific I fear it would prevent this from
    // being a usable system to anyone but those starting from scratch.
    // ProductLocations
    this.WriterLocationDict = {
      [CentralLocation]: new KubectlSource(
        this.KeyDecoratorDict[CentralKeyDecorator].namespace,
        this.KeyDecoratorDict[CentralKeyDecorator].context
      ),
      [TargetLocation]: new KubectlSource(
        this.KeyDecoratorDict[TargetKeyDecorator].namespace,
        this.KeyDecoratorDict[TargetKeyDecorator].context
      ),
    };
  }

  public getKeyDecorator(keyMasterKey: KeyDecoratorConstant): Config {
    return this.KeyDecoratorDict[keyMasterKey];
  }

  public sources(): { [key in WriterLocation]: DependencySource } {
    return this.WriterLocationDict;
  }

  public getSource(location: WriterLocation): DependencySource {
    return this.WriterLocationDict[location];
  }
}

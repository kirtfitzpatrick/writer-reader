
import { readFileSync } from "fs";
import { join, kebabCase } from "lodash";
import { parse } from "yaml";
import { KeyDecorator } from "../../src/dependency/key-decorator";

export class Config implements KeyDecorator {
  static load(name: string): Config {
    const conf = parse(readFileSync(`test/conf/${name}.yaml`, "utf8"));
    return new Config(conf.name, conf.context, conf.namespace);
  }

  constructor(
    public readonly name: string, //
    public readonly context: string,
    public readonly namespace: string
  ) {}

  public getKeyName(...args: string[]): string {
    return kebabCase(join([this.name, ...args], "-"));
  }
}

export const ConfigKeyDecorator = Config.prototype.getKeyName;

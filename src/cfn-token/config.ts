import { readFileSync } from "fs";
import { join, kebabCase } from "lodash";
import { parse } from "yaml";
import { KeyDecorator } from "../dependency/key-decorator";

const CONFIG_DIR = "conf";

export class Config implements KeyDecorator {
  static load(name: string): Config {
    const conf = parse(readFileSync(`${CONFIG_DIR}/${name}.yaml`, "utf8"));
    return new Config(conf.name, conf.profile, conf.account, conf.region);
  }

  constructor(
    // crucial for decorating keys
    public readonly name: string, //
    // AWS CLI source properties
    public readonly profile: string,
    public readonly account: string,
    public readonly region: string
  ) {}

  get envName(): string {
    return this.name;
  }

  public getKeyName(...args: string[]): string {
    return kebabCase(join([this.name, ...args], "-"));
  }
}

// Assigning the decorator method to a const just makes them easier to work with.
export const ConfigKeyDecorator = Config.prototype.getKeyName;

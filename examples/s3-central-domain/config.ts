import { readFileSync } from "fs";
import { join, kebabCase } from "lodash";
import { join as joinPath } from "path";
import { parse } from "yaml";
import { KeyDecorator } from "../../src/dependency/key-decorator";

export class Config implements KeyDecorator {
  static load(name: string): Config {
    const confPath = joinPath(__dirname, "conf", `${name}.yaml`);
    const conf = parse(readFileSync(confPath, "utf8"));

    return new Config(conf.name, conf.profile, conf.account, conf.region);
  }

  constructor(
    public readonly name: string, // environment name or whatever
    // AWS CLI source properties
    public readonly profile: string,
    public readonly account: string,
    public readonly region: string
  ) {}

  public stackName(name: string): string {
    return kebabCase(`${this.name}-${name}`);
  }

  // multiple key decorators can be used within a codebase. Ex. one for
  // environments, one for clients, another for system stuff, etc.
  // /client/environment/my/key
  // /environment/some/platform/thing
  public getKeyName(...args: string[]): string {
    return kebabCase(join([this.name, ...args], "-"));
  }
}

// Assigning the decorator method to a const just makes them easier to work with.
export const EnvKeyPrototype = Config.prototype.getKeyName;

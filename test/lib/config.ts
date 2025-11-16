
import { readFileSync } from "fs";
import { join, kebabCase } from "lodash";
import { parse } from "yaml";
import { KeyDecorator } from "../../src/dependency/key-decorator";

export class Config implements KeyDecorator {
  static load(name: string): Config {
    const conf = parse(readFileSync(`test/conf/${name}.yaml`, "utf8"));
    return new Config(conf.name, conf.context, conf.namespace, conf.profile, conf.region);
  }

  constructor(
    public readonly name: string, //
    // k8s cli source properties
    public readonly context: string,
    public readonly namespace: string,
    // AWS CLI source properties
    public readonly profile: string,
    public readonly region: string,
  ) {}

  // multiple key decorators can be used within a codebase. Ex. one for
  // environments, one for clients, another for system stuff, etc.
  // /client/environment/my/key
  // /environment/some/platform/thing
  public getKeyName(...args: string[]): string {
    return kebabCase(join([this.name, ...args], "-"));
  }
}

// Assigning the decorator method to a const just makes them easier to work with.
export const ConfigKeyDecorator = Config.prototype.getKeyName;

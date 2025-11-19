import { kebabCase } from "lodash";

export function cfnLabel(...parts: string[]): string {
  return kebabCase(parts.join("-"));
}

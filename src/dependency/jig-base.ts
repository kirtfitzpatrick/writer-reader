import { StackProps } from "aws-cdk-lib";
import { DependencySource } from "../../src/dependency/source/dependency-source";
import { KeyDecorator } from "./key-decorator";
import { AwsLocation, WrittenLocation } from "./locations";

// This should be extended to include things like your primary decorators,
// This will usually be your configs.
export interface JigBaseStackProps extends StackProps {
  jig: JigBase;
}

export abstract class JigBase {
  public sources: { [key in WrittenLocation]: DependencySource };
  public localLocation: WrittenLocation;

  // Everything has a target that represents the primary label this thing
  // belongs to, even if it lives in a different location. This could be a
  // client, environment, platform, etc.
  abstract getTargetDecorator(): KeyDecorator;

  // all the command line sources for the locations you keep dependencies in
  abstract getSource(location: WrittenLocation): DependencySource;

  // needed by cloudformation macros
  abstract getLocations(): { [key in WrittenLocation]: AwsLocation };

  // Stacks need access to the decorators somehow and this is the easiest way.
  abstract stackProps(location: WrittenLocation): JigBaseStackProps;
}

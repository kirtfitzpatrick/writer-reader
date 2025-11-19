import { Stack } from "aws-cdk-lib";
import { ArnPrincipal, PolicyDocument, PolicyStatement, Role } from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
import { JigStackProps } from "../dependency/jig";
import { cfnLabel } from "../lib/labels";
import { AssumeRoleStack } from "./assume-role-stack";
import { FlexDepLocations } from "./macro-stack";

export interface ReadAccessRoleStackProps extends JigStackProps, FlexDepLocations {}

export class ReadAccessRoleStack extends Stack {
  public static roleArn(props: FlexDepLocations): string {
    return "arn:aws:iam::" + props.producingLocation.account + ":role/" + ReadAccessRoleStack.roleName(props);
  }

  protected static roleName(props: FlexDepLocations): string {
    return cfnLabel("FlexDep", props.consumingLocation.envName, "ReadAccessRole");
  }

  constructor(scope: Construct, id: string, props: ReadAccessRoleStackProps) {
    super(scope, id, props);

    new Role(this, ReadAccessRoleStack.roleName(props), {
      roleName: ReadAccessRoleStack.roleName(props),
      path: "/",
      assumedBy: new ArnPrincipal(AssumeRoleStack.roleArn(props)),
      inlinePolicies: {
        LambdaPolicy: new PolicyDocument({
          statements: [
            new PolicyStatement({
              actions: ["ssm:GetParameter"],
              resources: ["*"],
            }),
          ],
        }),
      },
    });
  }
}

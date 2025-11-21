import { Stack } from "aws-cdk-lib";
import { ArnPrincipal, PolicyDocument, PolicyStatement, Role } from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
import { cfnLabel } from "../lib/labels";
import { AssumeRoleStack } from "./assume-role-stack";
import { JigStackProps } from "./jig";
import { CfnTokenLocations } from "./macro-stack";

export interface ReadAccessRoleStackProps extends JigStackProps, CfnTokenLocations {}

export class ReadAccessRoleStack extends Stack {
  public static roleArn(props: CfnTokenLocations): string {
    return "arn:aws:iam::" + props.writingLocation.account + ":role/" + ReadAccessRoleStack.roleName(props);
  }

  protected static roleName(props: CfnTokenLocations): string {
    return cfnLabel("FlexDep", props.readingLocation.envName, "ReadAccessRole");
  }

  constructor(scope: Construct, id: string, props: ReadAccessRoleStackProps) {
    super(scope, id, props);
    console.log(id, props.env);

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

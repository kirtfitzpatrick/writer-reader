import { Stack } from "aws-cdk-lib";
import { PolicyDocument, PolicyStatement, Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
import { JigStackProps } from "../dependency/jig";
import { cfnLabel } from "../lib/labels";
import { CfnTokenLocations } from "./macro-stack";
import { ReadAccessRoleStack } from "./read-access-role-stack";

export interface AssumeRoleStackProps extends JigStackProps, CfnTokenLocations {}

export class AssumeRoleStack extends Stack {
  // "AWS":"arn:aws:iam::240855652656:role/SigmaCentralFlexDepLambdaRole"
  public static roleArn(props: CfnTokenLocations): string {
    return "arn:aws:iam::" + props.readingLocation.account + ":role/" + AssumeRoleStack.roleName(props);
  }

  public static roleName(props: CfnTokenLocations): string {
    return cfnLabel("FlexDep", props.writingLocation.envName, "AssumeRole");
  }

  constructor(scope: Construct, id: string, props: AssumeRoleStackProps) {
    super(scope, id, props);
    console.log(id, props.env);

    new Role(this, "Role", {
      roleName: AssumeRoleStack.roleName(props),
      assumedBy: new ServicePrincipal("lambda.amazonaws.com"),
      path: "/",
      inlinePolicies: {
        LambdaPolicy: new PolicyDocument({
          statements: [
            new PolicyStatement({
              actions: ["sts:AssumeRole"],
              resources: [ReadAccessRoleStack.roleArn(props)],
            }),
            new PolicyStatement({
              actions: [
                "logs:PutLogEvents", //
                "logs:CreateLogGroup",
                "logs:CreateLogStream",
              ],
              resources: [
                `arn:aws:logs:*:${this.account}:log-group:/aws/lambda/*`,
                `arn:aws:logs:*:${this.account}:log-group:/aws/lambda/*:log-stream:*`,
              ],
            }),
          ],
        }),
      },
    });
  }
}

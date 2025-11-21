# Writer Reader

A dependency system for CDK based tool kits. Currently the supported dependency
stores are:

- AWS Parameter Store
- AWS Secrets Manager
- k8s Config Map
- k8s Secret

What this allows you to do is to label and store vital info like a VPC ID or
CloudFront Distribution ID, ARNs, secret credentials, and so on that were
created by one stack or chart in one location, such as a production account
in eu-west-1, and then retrieve that information to be used in an AWS stack or
Kubernetes chart in a different location, such as a central account in us-east-1
or an EKS cluster.

It works across AWS accounts and regions and with the CfnToken system it can
resolve the dependencies at deploy time by CloudFormation which allows you to
put complex dependencies within the same CDK app with stacks all deploying and
relying on each other in different accounts and regions.

This takes care of accurately labeling the dependencies with the KeyDecorator
system and it takes care of knowing where to go to fetch the dependency through
the WrittenLocation system.

It can also be used to export dependencies via npm for use by other codebases.
For example you could have a company wide platform that exports many of the
things needed by smaller apps such as VPC ID, and then developers could import
them into their app via npm install and use them via a Reader. And it will
all be strongly typed all the way through from the app to the platform.

## Jigs

The Jig system is a later addition to the Writer Reader system that vastly
increases it's capability and ease of use. It's what allows the Writer/Reader
system to multiplex across regions and accounts and keep everything straight
with little effort.

## Example

Check the examples directory for a basic example of the Writer Reader system
being used across accounts and regions within a single app. This is something
CDK can't do. Not only can it not do it within an app, but it absolutely can't
do it across apps which any mature system will need to do.

Generally you'll define your Writers and Readers as consts at the top of your
stack and chart files. It just makes the code more readable this way.

```typescript
// vpc-stack.ts
export const VpcStackWriters = {
  vpcId: new AwsParameterStoreStringWriter(["vpc-id"], EnvironmentKeyDecorator),
} as const;

// Vpc is deployed in the target account/region
export class VpcStack extends Stack {
  constructor(scope: Construct, id: string, props: JigStackProps) {
    super(scope, id, props);

    const vpc = new Vpc(this, "Vpc", {
      ipAddresses: IpAddresses.cidr("10.0.0.0/16"),
    });

    // You may want to clone the Writers incase this stack gets used multiple
    // times within and app
    const writers = cloneDeep(VpcStackWriters);
    writers.vpcId.value = vpc.vpcId; // Assign the value
    // dehydrate creates the Parameter Store StringParameter construct as part
    // of this stack's scope. It names it automatically by calling the
    // "EnvironmentKeyDecorator" it was created with which is just a method
    // prototype that exists on the targetConf object below. By specifying
    // decorator prototypes in this way it allows you to have multiple decorators
    // on a single class that implements the KeyDecorator interface, in this case
    // it's a config object that implements it.
    writers.vpcId.dehydrate(this, props.targetConf);
  }
}
```

```typescript
// eks-stack.ts
export const EksStackReaders = {
  vpcId: new AwsParameterStoreStringReader(VpcStackWriters.vpcId, AWS_TARGET),
} as const;
```

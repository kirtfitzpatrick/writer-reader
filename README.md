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

Generally you'll define your Writers and Readers as `const`s at the top of your
stack and chart files. It makes the code more readable this way as well as makes
for easy importing and use by the Readers that need to retrieve the Writers data.

```typescript
// vpc-stack.ts

/**
 * The Writer maintains the string constant and decorator prototype to generate
 * the correct key for the thing being stored. Usually the decorator objects
 * will be configs of some sort. This is about code reuse after all. Same code,
 * different config file.
 * Even Readers will call the Writer to generate the key for maximum consistency.
 * For convenience you would usually pre-assign prototypes to consts at the
 * bottom of whatever your decorator file is. Ex.
 * const EnvKeyPrototype = Config.prototype.genEnvKey;
 */
export const VpcStackWriters = {
  vpcId: new AwsParameterStoreStringWriter(["vpc-id"], Config.prototype.genEnvKey),
} as const;

// Vpc is deployed in the target account/region
export class VpcStack extends Stack {
  constructor(scope: Construct, id: string, props: JigStackProps) {
    super(scope, id, props);

    const vpc = new Vpc(this, "Vpc", {
      ipAddresses: IpAddresses.cidr("10.0.0.0/16"),
      maxAzs: 3,
      natGateways: 1,
    });

    // You may want to clone the Writers incase this stack gets used multiple
    // times within an app
    const writers = cloneDeep(VpcStackWriters);
    writers.vpcId.value = vpc.vpcId; // Assign the value

    /**
     * dehydrate creates the Parameter Store StringParameter construct as part
     * of this stack's scope. It names it automatically by calling the
     * KeyDecorator it was created with which is just a method
     * prototype that exists on the targetConf object below. By specifying
     * decorator prototypes in this way it allows you to have multiple decorators
     * on a single class that implements the KeyDecorator interface, in this case
     * it's a config object that implements it.
     */
    writers.vpcId.dehydrate(this, props.targetConf);
  }
}
```

```typescript
// eks-stack.ts
/**
 * To retrieve the VPC ID we use a Reader instantiated using the Writer const
 * object which maintains a single source of truth for the key and maintains
 * strong types and refactorability throughout. We also specify the location
 * where to find the VPC ID since if we depend on a thing we will certainly
 * know where it is. Targets always exist but could be any sort of environment
 * or other logical unit like a client / environment or service / env pair.
 * i.e. dev, stage, prod-us-east-1, prod-eu, acme-prod-eu, etc.
 * The decorator prototype contained in the Writer constant knows how to
 * generate the key and the jig knows which account and region to go looking
 * for the specified location. i.e. AWS_TARGET
 */
export const EksStackReaders = {
  vpcId: new AwsParameterStoreStringReader(VpcStackWriters.vpcId, AWS_TARGET),
} as const;

/**
 * This is a bad example because Eks deploys to the same account and region as
 * the VPC. See the examples directory for something more clever.
 */
export class EksClusterStack extends Stack {
  constructor(scope: Construct, id: string, props: JigStackProps) {
    super(scope, id, props);

    const vpc = Vpc.fromLookup(this, "ImportedVpc", {
      /**
       * tokenize makes use of the pre-deployed cfn-token stacks that install
       * cfn macros (lambdas) and the appropriate roles to allow CloudFormation
       * to resolve the dependency at deploy time. The token is a Fn::Transform.
       * Alternatively the command line sources can be used via the .fetch
       * method if the cfn-token system is not desired or this is being used by
       * a non-CloudFormation tool such as cdk8s.
       */
      vpcId: EksStackReaders.vpcId.tokenize(this, props),
    });

    const cluster = new Cluster(this, "EksCluster", {
      version: KubernetesVersion.V1_30,
      clusterName: "eks-cluster",
      vpc: vpc, // use the IVpc like normal.
      kubectlLayer: new KubectlV34Layer(this, "KubectlLayer"),
      vpcSubnets: [{ subnetType: SubnetType.PRIVATE_WITH_EGRESS }],
      endpointAccess: EndpointAccess.PUBLIC_AND_PRIVATE,
      defaultCapacity: 2,
    });
  }
}
```

## Cfn Token System

This

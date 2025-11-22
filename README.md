# Writer Reader

A dependency system for CDK based tool kits. Currently the supported dependency
stores are:

- AWS Parameter Store
- AWS Secrets Manager
- k8s Config Map
- k8s Secret

What this allows you to do is to label and store vital info like a IDs, ARNs,
secret credentials, and so on that were created by one AWS stack or k8s chart
in one location and needed by another stack or Kubernetes chart somewhere else.
It's dependencies simplified, cross account, cross region, and cross platform.

This opens up and streamlines code organization allowing you to scale infra
codebases while also integrating construct based toolkits in a far more
productive manner.

With the CfnToken system it can resolve the AWS native dependencies at deploy
time by CloudFormation which allows you to put complex dependencies within the
same CDK app with stacks all deploying and relying on each other in different
accounts and regions and it sorts out the complexity for you.

This handles accurately labeling dependencies through the KeyDecorator
system and it handles knowing where to fetch the dependency through
the WrittenLocation system.

It can also be used to export dependencies via npm for use by other codebases.
For example you could have a company wide platform that exports much of the
information needed by smaller apps such as VPC ID, and then developers can
import the Writers they need into their app via npm and use them via a Reader.
And it will be strongly typed all the way through from the app to the platform.

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

To make use of the deploy time resolving CloudFormation transforms you'll need
to pre deploy some stacks into your accounts. It's built into the package and
the stacks are setup in a one-way orientation. To have one account read from
another you'll have to deploy one set of stacks. To have them both read from
each other you'll need to include the reverse as well. They're namespaced pretty
well so you should be fine even in complex systems.

To simplify things the `writer-reader` package includes a `cfn-tokens.sh` script.
exec without arguments for help.
At present time it expects a `conf` directory at the root of the project
containing yaml files which in turn contain the aws profile, account number,
and region.

If the region of an environment is not `us-east-1` the cdk app will also deploy
stacks to the `us-east-1` region because that's a thing in AWS. Some services
only exist there.

Review the CloudFormation macro stacks with the following command.

```bash
npx cfn-tokens.sh
Usage:
  .../cfn-tokens.sh WRITER_CONFIG READER_CONFIG CDK_CMD [CDK_OPTIONS...]


npx cfn-tokens.sh central sigma list
npx cfn-tokens.sh central sigma diff 'central/*'
npx cfn-tokens.sh central sigma deploy 'central/*'
```

## Local Testing

```bash
writer-reader (main)$ npm run build; npm pack


test $ npm i $(realpath "$(pwd)/../writer-reader/writer-reader-1.0.0.tgz")
test $ npx cfn-tokens.sh central sigma list
test $ tree conf
conf
├── central.yaml
└── sigma.yaml
```

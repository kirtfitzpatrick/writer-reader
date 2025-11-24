# Writer Reader

A dependency system for CDK based tool kits. Currently the supported dependency
stores are:

- AWS Parameter Store
- AWS Secrets Manager
- k8s Config Map
- k8s Secret

What this allows you to do is to label and store vital info like a IDs, ARNs,
secret credentials, and so on that were created by an AWS stack or k8s chart
in one location and needed by another stack or Kubernetes chart somewhere else.
It's dependencies simplified, cross account, cross region, and cross platform.

This opens up and streamlines code organization allowing you to scale infra
codebases while also integrating construct based tool kits like CDK & cdk8s
with each other in a more productive manner.

With the CfnToken system it can resolve the AWS native dependencies at deploy
time by CloudFormation which allows you to put complex dependencies within the
same CDK app with stacks all deploying and relying on each other in different
accounts and regions and it sorts out the complexity for you.

This handles accurately labeling dependencies through the `KeyDecorator`
system and it handles knowing where to fetch the dependencies from through
the `WrittenLocation` system.

It can also be used to export dependencies via npm for use by other codebases.
For example you could have a company wide platform that exports much of the
information needed by smaller apps such as VPC ID, and then developers can
import the Writers they need into their app via `package.json` and use them
via a Reader. And it will be strongly typed from the app to the platform.

## Writer Reader Example

Check the examples directory for a basic example of the Writer Reader system
being used across accounts and regions within a single app.

Generally you'll define your Writers and Readers as `const`'s at the top of your
stack and chart files. It makes the code more readable as well as easier for
`import` and use by the Readers that need to utilize the Writers to regenerate
the correct key names to fetch the thing.

This is based on the idea that you have many logically identical environments
with the same set of moving parts all built from the same code. They all have
their own unique names, accounts, and regions. But logically if the prod
environment has a service X, the dev environment will also have a service X.

```typescript
// vpc-stack.ts

/**
 * The Writer maintains the string constant and decorator
 * prototype to generate the correct key for the thing
 * being stored. Usually the decorator objects will be
 * configs of some sort.
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

    /**
     * It's good practice to clone the Writers incase this
     * stack gets used multiple times within an app
     */
    const writers = cloneDeep(VpcStackWriters);
    writers.vpcId.value = vpc.vpcId; // Assign the value

    /**
     * dehydrate creates the Parameter Store StringParameter
     * construct as part of this stack's scope. It names it
     * automatically by calling its KeyDecorator which is
     * just a method prototype that exists on
     * the targetConf object below. By specifying decorator
     * prototypes in this way it allows you to have multiple
     * decorators on a single KeyDecorator class.
     */
    writers.vpcId.dehydrate(this, props.targetConf);
  }
}
```

```typescript
// eks-stack.ts
/**
 * To retrieve the VPC ID we use a Reader instantiated using
 * the Writer const object which maintains a single source of
 * truth for the key and maintains strong types and refactorability
 * throughout. We also specify the location where to find the
 * VPC ID.
 *
 * Readers will call the Writer to generate the key for maximum
 * consistency.
 */
export const EksStackReaders = {
  vpcId: new AwsParameterStoreStringReader(VpcStackWriters.vpcId, AWS_TARGET),
} as const;

/**
 * This is a bad example because Eks deploys to the same account
 * and region as the VPC. See the examples directory for something
 * more advanced.
 */
export class EksClusterStack extends Stack {
  constructor(scope: Construct, id: string, props: JigStackProps) {
    super(scope, id, props);

    /**
     * tokenize makes use of the pre-deployed cfn-token stacks
     * that install cfn macros (lambdas) and the appropriate
     * roles to allow CloudFormation to resolve the dependency
     * at deploy time. The token is a Fn::Transform. Alternatively
     * the command line sources can be used via the .fetch
     * methods if the cfn-token system is not desired or this
     * is being used by a non-CloudFormation tool such as cdk8s.
     */
    const vpc = Vpc.fromLookup(this, "ImportedVpc", {
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

## Architecture / Terms

### KeyDecorator

The decorator classes and prototypes are what define the ParameterStore,
ConfigMap, and SecretsManager keys that values are
stored under. Usually this would be something like a client name, an
environment name, and the Writer constant, all joined together and pushed
through a formatting function to kebab case, pascal case, or whatever naming
convention you use. You can even make use of 2D labels like `/Env/Client/FooBar`.

A `KeyDecorator` is a lazy way of providing strong typing for classes that
implement `KeyDecoratorPrototype` methods. They have this signature:

```typescript
export class SomeClass extends KeyDecorator {
  public someMethod(...args: string[]): string { ...  }
}
```

You may want to assign that method prototype to a constant to make working with
it easier and more obvious. i.e.

```typescript
export const SOME_KEY_PROTOTYPE = SomeClass.prototype.someMethod;
```

### WrittenLocation

`WrittenLocation`s are how we logically represent where to find a thing.
You may have several services that depend on each other that exist in various
environments from `dev` to `prod`. You use `WrittenLocation`s to represent those
relationships.

WrittenLocations represent any sort of logical unit like environments, client
/ environment pairs, or service / env pairs. i.e. dev, prod-eu, acme-prod-eu,
etc.

`SERVICE_A`, `SERVICE_B`, `SERVICE_B_GLOBAL`, `CENTRAL`, etc. These can all be
`WrittenLocations` that exist in many environments from `dev` to `production`.
You should use config files and a Jig to define the specifics of each location
type's accounts, regions, contexts, etc. and select them via the command line.

## Jigs

The Jig system is a later addition to the Writer Reader system that vastly
increases it's capability and ease of use. It's what allows the Writer Reader
system to multiplex across regions and accounts with ease.

A company's infrastructure setup could be made up of any number of different
types of environments and systems. The most basic system is a series of
environments, dev, prod-us, prod-eu, etc. and a central account for things like
pipelines, master domains, identity management, etc.
However systems can get a lot more complex than that so
implementation is left as a task for the user. The good news is since Jigs are
representative of the logical organization of your infrastructure at a
high level, they can be implemented once and used everywhere.

### Overview of a Jig

A Jig has four primary responsibilities:

- Sources
- Locations
- The Target Decorator
- The Local Location

#### Sources

Sources allow you to fetch things from locations. The only sources implemented
at this time are process env, kubectl cli, and aws cli sources. They should be
organized by the location they fetch from, be it a specific k8s cluster or
an AWS account and region.

There is also the option to use the Cfn Token system when working within
CloudFormation and since that system avoids fetching anything during the synth
it requires no sources.

#### Locations

`WrittenLocation`s are how we logically represent where to find a thing. By
defining them with the `createWrittenLocation` function it strongly types them
while still allowing you to make as many different location types as your system
requires.

```typescript
export const AWS_TARGET = createWrittenLocation("AWS_TARGET");
```

#### Target

There is always a target. Everything belongs to something. A service may have
things that need to be deployed to many accounts and regions. Since those
things all only exist to service the target, they should all be labeled as such.

It may be helpful to mention that labeling a thing, and where that thing is
located are usually unrelated.

#### Local Location

The local location is simply where this thing is actually being deployed to
right now. It's how we know where we are. It let's us take shortcuts.

## Cfn Token System

To make use of the deploy time resolving CloudFormation transforms you'll need
to pre deploy some stacks into your accounts. It's built into the package and
the stacks are setup in a one-way orientation. To have one account read from
another you'll have to deploy one set of stacks. To have them both read from
each other you'll need to include the reverse as well.

To simplify things the `writer-reader` package includes a `cfn-tokens.sh` script.
Exec it without arguments to display the help.
At present time it expects a `conf` directory at the root of the project
containing yaml files which in turn contain the aws profile, account number,
and region.

### AwsLocation

The Cfn Token system has more demanding requirements for naming and location
info and has it's own location interface. Jigs will need to provide
`WrittenLocation`s that implement the AwsLocation interface.

```typescript
export interface AwsLocation {
  envName: string;
  account: string;
  region: string;
}
```

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

Currently Cfn Tokens only work for Parameter Store. I have not yet encountered
a use case for tokenizing a secret but will be happy to implement it if
requested.

### Configs

An example config for the Cfn Tokens system is below.

```yaml
# conf/example.yaml
name: example
profile: 123456789012_AdministratorAccess
account: 123456789012
region: us-east-1
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

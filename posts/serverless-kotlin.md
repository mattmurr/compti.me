---
title: Serverless Kotlin with AWS Lambda
description: Serverless Kotlin using AWS Lambda, API Gateway and CDK
date: 2022-04-20
---

Recently at work, I built an API written in Kotlin, using AWS Lambda and API
Gateway, I'm going to recreate the steps taken to achieve a similar outcome.

You can find the finished code on the
[GitHub repo](https://github.com/mattmurr/kotlin-cdk-apigw-lambda).

## Project init

Let's start by initializing a new project with Gradle:

<details>
<summary><code>gradle init</code></a></summary>

```shell
➜  kotlin-lambda gradle init
Starting a Gradle Daemon, 1 incompatible Daemon could not be reused, use --status for details

Select type of project to generate:
  1: basic
  2: application
  3: library
  4: Gradle plugin
Enter selection (default: basic) [1..4] 2

Select implementation language:
  1: C++
  2: Groovy
  3: Java
  4: Kotlin
  5: Scala
  6: Swift
Enter selection (default: Java) [1..6] 4

Split functionality across multiple subprojects?:
  1: no - only one application project
  2: yes - application and library projects
Enter selection (default: no - only one application project) [1..2] 1

Select build script DSL:
  1: Groovy
  2: Kotlin
Enter selection (default: Kotlin) [1..2] 2

Generate build using new APIs and behavior (some features may change in the next minor release)? (default: no) [yes, no] yes
Project name (default: kotlin-lambda): AddFive
Source package (default: AddFive):

> Task :init
Get more help with your project: https://docs.gradle.org/7.4.2/samples/sample_building_kotlin_applications.html

BUILD SUCCESSFUL in 35s
2 actionable tasks: 2 executed
```

</details>

We'll be deploying everything through AWS CDK, so let's initialize the CDK
project too. I'm all for speed 🚀, so TypeScript is my choice here:

<details><summary><code>cdk init -l typescript --generate-only</code></summary>

```shell
➜  kotlin-lambda mkdir cdk
➜  kotlin-lambda cd cdk
➜  cdk cdk init -l typescript --generate-only
Applying project template app for typescript
# Welcome to your CDK TypeScript project

This is a blank project for TypeScript development with CDK.

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `cdk deploy`      deploy this stack to your default AWS account/region
* `cdk diff`        compare deployed stack with current state
* `cdk synth`       emits the synthesized CloudFormation template

✅ All done!
```

</details>

## Kotlin prototyping

There are some AWS Java dependencies I used for Lambda, along with
[Gson](https://github.com/google/gson), which is providing an easy way to
convert back and forth, JSON and objects. Additionally, I've added the
`buildZip` task, the app needs to be bundled into a zip file to create the
Lambda function from, adapted from
[AWS Lambda docs for Java](https://docs.aws.amazon.com/lambda/latest/dg/java-package.html):

<details><summary><code>build.gradle.kts</code></summary>

```kotlin
...

dependencies {
    // Align versions of all Kotlin components
    implementation(platform("org.jetbrains.kotlin:kotlin-bom"))

    // Use the Kotlin JDK 8 standard library.
    implementation("org.jetbrains.kotlin:kotlin-stdlib-jdk8")

    // This dependency is used by the application.
    implementation("com.google.guava:guava:30.1.1-jre")

    // AWS SDK
    implementation("com.amazonaws:aws-lambda-java-core:1.2.1")
    implementation("com.amazonaws:aws-lambda-java-events:3.11.0")
    runtimeOnly("com.amazonaws:aws-lambda-java-log4j2:1.5.1")

    implementation("com.google.code.gson:gson:2.9.0")
}

tasks {
    register<Zip>("buildZip") {
        from(compileKotlin)
        from(processResources)
        into("lib") {
            from(configurations.runtimeClasspath)
        }
    }
}

...
```

</details>

Each Lambda has a handler, essentially an entry-point for the function which
processes the events/invocations. Firstly, there is the `RequestHandler` class
from which we can derive the Handler. Since I'll be proxying all events from API
Gateway to our Lambda function, I will also import and use the provided,
`APIGatewayProxyResponseEvent` and `APIGatewayProxyRequestEvent` classes.
There's a single method within the `RequestHandler` named `handleRequest()`
which can be overridden, the method takes an input/event, where we can use
`APIGatewayProxyRequestEvent` as the type; the second parameter to this method
is the `Context` which includes contextual information about the invoked Lambda
such as it's name.

<details><summary><code>app/src/main/kotlin/AddFive/Handler.kt</code></summary>

```kotlin
package AddFive

import com.amazonaws.services.lambda.runtime.Context
import com.amazonaws.services.lambda.runtime.RequestHandler
import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyResponseEvent
import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyRequestEvent

class ApplicationRequestHandler : RequestHandler<APIGatewayProxyRequestEvent, APIGatewayProxyResponseEvent> {

    override fun handleRequest(event: APIGatewayProxyRequestEvent, context: Context): APIGatewayProxyResponseEvent {
        TODO() // Will throw an exception if this line is met
    }
}
```

</details>

I will start working on the CDK stack, treading towards the MVP. We should be
able to just start defining the stack (, I recommend checking out the CDK
[docs](https://docs.aws.amazon.com/cdk/api/v2/) if you have not already,
cross-referencing with the examples in
[this GitHub repo](https://github.com/aws-samples/aws-cdk-examples)). CDK is
really quick to get started with, and the boilerplate is already generated, we
only need to import a few types from the `aws-lambda` module we installed and
then define the function:

<details><summary><code>cdk/lib/cdk-stack.ts</code></summary>

```ts
import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { Function, Code, Runtime } from "aws-cdk-lib/aws-lambda";
import * as path from "path";

export class CdkStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Where the zip will be after running `./gradlew buildZip`
    const zipPath = path.join(
      __dirname,
      "../../app/build/distributions/app.zip"
    );

    const myFunction = new Function(this, "AddFiveFunc", {
      runtime: Runtime.JAVA_11,
      handler: "AddFive.Handler",
      code: Code.fromAsset(zipPath),
    });
  }
}
```

</details>

Local testing is simplified with AWS SAM, start by running `cdk synth` to output
the CloudFormation which can be found in the `cdk.out` directory:

```shell
➜  cdk git:(master) ✗ ls cdk.out
asset.2fdacad867dc3713b7694066d904ac30326fb4a7f5d3e9f391f43e2c14c79201.zip
asset.40358464369d3253824d7f23fff86fc3a76a5f829e07c9c5ad8134b8c06c269b.zip
asset.6132d1d3d9d2e21bf4bcfb04e2abc43ec6a2d35800881a41c5c69bf0864916d9.zip
asset.9016338e700b7a1b62b5f767721de089c4f18b8e6100d57e1dc21976669b3015.zip
asset.923f657554ece887a68533fa2f01a44c457b584e43bf313419e294603e7816d5.zip
asset.a4e2c6ec2bb6a0020e4c8a3785aa81911d35da81b3695dff495e876d4dc83842.zip
cdk.out
CdkStack.assets.json
CdkStack.template.json
manifest.json
tree.json
```

The following command can be used to set up the Lambda function we defined
locally:

```shell
sam local start-lambda -t cdk/cdk.out/CdkStack.template.json
```

Now we can invoke the function using the AWS CLI (, I always recommend checking
out the `man`, `help` command or `--help` argument for CLI apps):

```shell
aws --endpoint-url http://localhost:3001 \
  --no-sign-request lambda invoke \
  --function-name AddFiveFuncFD7DFDB6 /tmp/out.log
```

The function name can be found in the output `<stack name>.template.json` file:

<details><summary><code>less CdkStack.template.json</code></summary>

```shell
...
"AddFiveFuncFD7DFDB6": {
   "Type": "AWS::Lambda::Function",
   "Properties": {
    "Code": {
     "S3Bucket": {
      "Fn::Sub": "cdk-hnb659fds-assets-${AWS::AccountId}-${AWS::Region}"
     },
     "S3Key": "6132d1d3d9d2e21bf4bcfb04e2abc43ec6a2d35800881a41c5c69bf0864916d9.zip"
    },
    ...
```

</details>

Granted there are no issues, we should see the following in `/tmp/out.log`:

`An operation is not implemented.: kotlin.NotImplementedError`

The function executed and reached the `TODO()` line in the handler. We should
add some real logic now.

1. Take an input
2. Add 5
3. Respond with the result

We can use Gson here to parse the body field of the
`APIGatewayProxyRequestEvent` (the request body) and serialize the response
object into a valid JSON string:

<details><summary><code>app/src/kotlin/AddFive/Handler.kt</code></summary>

```kotlin
package AddFive

import com.amazonaws.services.lambda.runtime.Context
import com.amazonaws.services.lambda.runtime.RequestHandler
import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyResponseEvent
import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyRequestEvent
import com.google.gson.Gson

private val gson = Gson()

class Handler : RequestHandler<APIGatewayProxyRequestEvent, APIGatewayProxyResponseEvent> {

    override fun handleRequest(event: APIGatewayProxyRequestEvent, context: Context): APIGatewayProxyResponseEvent {
        val request = gson.fromJson(event.body, Request::class.java)
        val response = Response(request.input + 5)
        return APIGatewayProxyResponseEvent().withStatusCode(200).withBody(gson.toJson(response))
    }
}

data class Request(
    val input: Int
)

data class Response(
    val output: Int
)
```

</details>

## Makefile

I've added a Makefile to automate building and re-deploying:

<details><summary><code>Makefile</code></summary>

```makefile
SHELL = /bin/bash -c

build :
		./gradlew buildZip

synth : build
		cd cdk; cdk synth

deploy : synth
		cd cdk; cdk deploy

cdk-bootstrap :
		cd cdk; cdk bootstrap

local-lambda : build
		sam local start-lambda -t cdk/cdk.out/CdkStack.template.json

local-apigw : build
		sam local start-api -t cdk/cdk.out/CdkStack.template.json

.PHONY: build synth deploy
.DEFAULT_GOAL := synth
```

</details>

Running this `make` command, creates a new zip, outputs the CDK stack
CloudFormation and spins up the Lambda locally with AWS SAM:

```shell
make local-lambda
```

## Dev-testing

Invoke the Lambda when it is ready locally, I'm expecting a `200 OK` response
and the expected result should be in `/tmp/out.log`:

```shell
aws --endpoint-url http://localhost:3001 \
  --no-sign-request lambda invoke \
  --function-name AddFiveFuncFD7DFDB6 \
  --payload '{"body":"{\"input\":5}"}' /tmp/out.log
```

Viewing the output `less /tmp/out.log`:

```shell
{"statusCode":200,"body":"{\"output\":10}"}
```

Great, we have a working Lambda function that we can invoke and get a happy
response. Finally, let\'s update the CDK stack to also create the API Gateway
that can proxy requests to Lambda.

<details><summary><code>cdk/lib/cdk-stack.ts</code></summary>

```ts
import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { Function, Code, Runtime } from "aws-cdk-lib/aws-lambda";
import { LambdaRestApi } from "aws-cdk-lib/aws-apigateway";
import * as path from "path";

export class CdkStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Where the zip will be after running `./gradlew buildZip`
    const zipPath = path.join(
      __dirname,
      "../../app/build/distributions/app.zip"
    );

    const myFunction = new Function(this, "AddFiveFunc", {
      runtime: Runtime.JAVA_11,
      handler: "AddFive.Handler",
      code: Code.fromAsset(zipPath),
    });

    new LambdaRestApi(this, "RestAPI", {
      handler: myFunction,
      proxy: true,
    });
  }
}
```

</details>

AWS SAM also allows you to spin up an API Gateway locally, I added a section in
the Makefile for this:

```shell
make local-apigw
```

Just make a request, using whichever tool you like. The request should be
something like this:

```http
POST http://localhost:3000 HTTP/1.1
content-type: application/json

{
  "input": 5
}
```

We should get a `200 OK` response, along with the expected response body
propagated through APIGW.

## Up to the cloud

With CDK, It's simple to deploy this to AWS. I've already configured AWS CLI
([docs.aws.amazon.com/cli](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-getting-started.html))
and bootstrapped my AWS account for the region I want to deploy to
([docs.aws.amazon.com/cdk/v2/guide/bootstrapping.html](https://docs.aws.amazon.com/cdk/v2/guide/bootstrapping.html)).

Run `cdk deploy` to start the deployment, our [Makefile](#makefile) includes a
section that builds the project and initiates the deployment:

```shell
make deploy
```

<details><summary><code>cdk deploy</code></summary>

```shell
CdkStack: deploying...
[0%] start: Publishing 6132d1d3d9d2e21bf4bcfb04e2abc43ec6a2d35800881a41c5c69bf0864916d9:current_account-current_region
[0%] start: Publishing 43af3a6614023bd50b14fb2ed0eb66fb240fd308ea7cdae647e1e7b5233ec0fe:current_account-current_region
[50%] success: Published 43af3a6614023bd50b14fb2ed0eb66fb240fd308ea7cdae647e1e7b5233ec0fe:current_account-current_region
[100%] success: Published 6132d1d3d9d2e21bf4bcfb04e2abc43ec6a2d35800881a41c5c69bf0864916d9:current_account-current_region
CdkStack: creating CloudFormation changeset...

 ✅  CdkStack

✨  Deployment time: 67.05s

Outputs:
CdkStack.RestAPIEndpointB14C3C54 = https://wcspg5er9j.execute-api.eu-west-2.amazonaws.com/prod/
Stack ARN:
arn:aws:cloudformation:eu-west-2:<AWS_ACCOUNT_ID>:stack/CdkStack/5e0ef720-bf0a-11ec-95c1-0ae66f49cad6

✨  Total time: 70.34s
```

</details>

The URL for the API Gateway is output on the terminal, alternatively you can
look at the API Gateway on the AWS Console, we should be able to execute the
Lambda function using this URL, just like we did when running locally with AWS
SAM:

<details><summary>Making a request to the API</summary>

```shell
➜  cdk git:(master) ✗ http https://wcspg5er9j.execute-api.eu-west-2.amazonaws.com/prod/ input=5
HTTP/1.1 200 OK
Connection: keep-alive
Content-Length: 13
Content-Type: application/json
Date: Mon, 18 Apr 2022 11:32:56 GMT
Via: 1.1 16f38d6df135d34d67fe44df60d91ab4.cloudfront.net (CloudFront)
X-Amz-Cf-Id: VsIzjgtBrUI7-uYd6rp7cPsoqYFTisIb8tHtimSN5JkeeqtPLxOX6A==
X-Amz-Cf-Pop: LHR61-P1
X-Amzn-Trace-Id: Root=1-625d4c64-516b9c5f0fe68d3c5c2d4352;Sampled=0
X-Cache: Miss from cloudfront
x-amz-apigw-id: QxjfzEb9LPEFhSA=
x-amzn-RequestId: 08470076-6a16-43a9-9216-0104d9056515

{
    "output": 10
}
```

</details>

To avoid racking up unwanted Lambda invocations, don't forget to destroy the
stack when you are finished, with `cdk destroy`, or by heading over to the
CloudFormation service in the console, where you will find the stack in the
region you deployed to.

## There's a small problem

JVM-based Lambda functions suffer from slow cold boots. In a situation where the
API is expected to be called pretty infrequently, cold boots will occur in most
if not all occurrences. I will be addressing this pitfall in a follow-up post
about GraalVM.

**Edit**: AWS has introduced a new feature called
[SnapStart](https://aws.amazon.com/blogs/compute/reducing-java-cold-starts-on-aws-lambda-functions-with-snapstart/)
to improve cold starts for Lambda.

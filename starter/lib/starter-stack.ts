import * as cdk from 'aws-cdk-lib';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class StarterStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create a bucket
    const firstBucket = new Bucket(this, 'MyFirstBucket', {
      lifecycleRules: [{
        expiration: cdk.Duration.days(2)
      }]
    });

    //Output the bucket name
    new cdk.CfnOutput(this, 'MyFirstBucketName', {
      value: firstBucket.bucketName
    });

    // The code that defines your stack goes here

    // example resource
    // const queue = new sqs.Queue(this, 'StarterQueue', {
    //   visibilityTimeout: cdk.Duration.seconds(300)
    // });
  }
}

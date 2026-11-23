#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { GeoRestriction } from 'aws-cdk-lib/aws-cloudfront';
import { MainStack } from '../lib/main-stack';

const app = new cdk.App();

interface EnvironmentProps {
  account: string;
  region: string;

  /**
   * Geographic restriction for the CloudFront distribution
   * (e.g. `GeoRestriction.allowlist('JP')` or `GeoRestriction.denylist('CN')`).
   *
   * @default No geographic restriction.
   */
  geoRestriction?: GeoRestriction;
}

// Single-region deployment: everything is deployed to one region (us-east-2 by default).
// The upstream kit also deploys a us-east-1 stack (Lambda@Edge payload signer, WAF Web ACL,
// custom-domain ACM certificate). This fork drops it because the target account only allows
// one region. CloudFront reaches the Lambda Function URL with a secret origin header instead of
// Lambda@Edge + OAC signing, and the app uses the default CloudFront / Cognito domains.
const props: EnvironmentProps = {
  account: process.env.CDK_DEFAULT_ACCOUNT!,
  region: process.env.CDK_DEFAULT_REGION ?? 'us-east-2',
  // geoRestriction: GeoRestriction.allowlist('JP'),
};

new MainStack(app, 'ServerlessWebappStarterKitStack', {
  env: {
    account: props.account,
    region: props.region,
  },
  geoRestriction: props.geoRestriction,
});

cdk.Tags.of(app).add('Application', 'ServerlessFullStackWebappStarterKit');

// import { Aspects } from 'aws-cdk-lib';
// import { AwsSolutionsChecks } from 'cdk-nag';
// Aspects.of(app).add(new AwsSolutionsChecks());

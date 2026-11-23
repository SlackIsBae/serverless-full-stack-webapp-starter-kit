import { CfnOutput, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { BlockPublicAccess, Bucket, BucketEncryption, ObjectOwnership } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { AsyncJob } from './constructs/async-job';
import { Auth } from './constructs/auth/';
import { Database } from './constructs/database';
import { GeoRestriction } from 'aws-cdk-lib/aws-cloudfront';
import { Webapp } from './constructs/webapp';
import { EventBus } from './constructs/event-bus/';
import { DsqlMigrator } from './constructs/dsql-migrator/';

interface MainStackProps extends StackProps {
  // Single-region fork: custom domains, the Lambda@Edge signer and the WAF Web ACL were removed
  // because they require a us-east-1 stack. See bin/cdk.ts.

  /**
   * Geographic restriction for the CloudFront distribution.
   *
   * @default No geographic restriction.
   */
  readonly geoRestriction?: GeoRestriction;
}

export class MainStack extends Stack {
  constructor(scope: Construct, id: string, props: MainStackProps) {
    super(scope, id, {
      description: 'Serverless fullstack webapp stack (uksb-1tupboc47)',
      ...props,
    });

    const accessLogBucket = new Bucket(this, 'AccessLogBucket', {
      encryption: BucketEncryption.S3_MANAGED,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      removalPolicy: RemovalPolicy.DESTROY,
      objectOwnership: ObjectOwnership.OBJECT_WRITER,
      autoDeleteObjects: true,
    });

    const database = new Database(this, 'Database');

    const auth = new Auth(this, 'Auth', {});

    const eventBus = new EventBus(this, 'EventBus', {});
    eventBus.addUserPoolProvider(auth.userPool);

    const asyncJob = new AsyncJob(this, 'AsyncJob', { database, eventBus });

    const webapp = new Webapp(this, 'Webapp', {
      database,
      accessLogBucket,
      auth,
      eventBus,
      asyncJob,
      subDomain: 'web',
      geoRestriction: props.geoRestriction,
    });

    new DsqlMigrator(this, 'DsqlMigrator', { database });

    new CfnOutput(this, 'FrontendDomainName', {
      value: webapp.baseUrl,
    });
  }
}

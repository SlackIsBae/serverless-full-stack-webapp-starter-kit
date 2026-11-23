import { describe, test, expect } from 'vitest';
import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { MainStack } from '../lib/main-stack';
import { ORIGIN_VERIFY_HEADER } from '../lib/constructs/cf-lambda-furl-service/service';

// Managed CachePolicy.CACHING_DISABLED id (min/max/default TTL = 0). Flat-rate Free/Pro plans
// forbid custom cache policies, so the default behavior must reference this managed policy.
const CACHING_DISABLED_ID = '4135ea2d-6df8-44a3-9df3-4b5a84be39ad';

// Managed CachePolicy.CACHING_OPTIMIZED id. Used for immutable /_next/static assets so they are
// edge-cached instead of hitting the Lambda origin on every request.
const CACHING_OPTIMIZED_ID = '658327ea-f89d-4fab-a63d-7e88639e58f6';

const account = '123456789012';

function getDistributionConfig(template: Template) {
  const distributions = template.findResources('AWS::CloudFront::Distribution');
  return Object.values(distributions)[0].Properties.DistributionConfig as Record<string, unknown>;
}

// Mirrors bin/cdk.ts: single-region deployment, no us-east-1 stack.
function synth() {
  const app = new cdk.App();
  const mainStack = new MainStack(app, 'MainStack', { env: { account, region: 'us-east-2' } });
  return { main: Template.fromStack(mainStack) };
}

describe('CloudFront cache policies (managed policies only)', () => {
  test('default behavior uses the managed CACHING_DISABLED policy, not a custom CachePolicy resource', () => {
    const { main } = synth();
    // No custom cache policy resource exists (custom policies block Free/Pro enrollment).
    main.resourceCountIs('AWS::CloudFront::CachePolicy', 0);
    const defaultBehavior = getDistributionConfig(main).DefaultCacheBehavior as Record<string, unknown>;
    expect(defaultBehavior.CachePolicyId).toBe(CACHING_DISABLED_ID);
  });

  test('immutable /_next/static assets are edge-cached via a managed CACHING_OPTIMIZED behavior', () => {
    const { main } = synth();
    const behaviors = getDistributionConfig(main).CacheBehaviors as Array<Record<string, unknown>>;
    const staticBehavior = behaviors.find((b) => b.PathPattern === '/_next/static/*');
    expect(staticBehavior).toBeDefined();
    expect(staticBehavior?.CachePolicyId).toBe(CACHING_OPTIMIZED_ID);
  });

  test('stays within the flat-rate Free plan limit of 5 cache behaviors', () => {
    const { main } = synth();
    const additional = (getDistributionConfig(main).CacheBehaviors as unknown[] | undefined)?.length ?? 0;
    // default behavior (1) + additional behaviors.
    expect(1 + additional).toBeLessThanOrEqual(5);
  });
});

describe('origin protection without Lambda@Edge (single-region fork)', () => {
  test('no Lambda@Edge functions or OAC are attached to the distribution', () => {
    const { main } = synth();
    const config = getDistributionConfig(main);
    const behaviors = [config.DefaultCacheBehavior, ...((config.CacheBehaviors as unknown[]) ?? [])] as Array<
      Record<string, unknown>
    >;
    for (const behavior of behaviors) {
      expect(behavior.LambdaFunctionAssociations).toBeUndefined();
    }
    main.resourceCountIs('AWS::CloudFront::OriginAccessControl', 0);
  });

  test('the Function URL is public and CloudFront sends the secret origin header', () => {
    const { main } = synth();
    main.hasResourceProperties('AWS::Lambda::Url', { AuthType: 'NONE', InvokeMode: 'RESPONSE_STREAM' });

    const origins = getDistributionConfig(main).Origins as Array<Record<string, unknown>>;
    const headers = origins.flatMap((o) => (o.OriginCustomHeaders as Array<Record<string, unknown>>) ?? []);
    expect(headers.map((h) => h.HeaderName)).toContain(ORIGIN_VERIFY_HEADER);
  });

  test('the webapp Lambda receives the same secret to verify', () => {
    const { main } = synth();
    const fns = Object.values(main.findResources('AWS::Lambda::Function'));
    const webapp = fns.find((f) => f.Properties?.Environment?.Variables?.ORIGIN_VERIFY_SECRET);
    expect(webapp).toBeDefined();

    const origins = getDistributionConfig(main).Origins as Array<Record<string, unknown>>;
    const header = origins
      .flatMap((o) => (o.OriginCustomHeaders as Array<Record<string, unknown>>) ?? [])
      .find((h) => h.HeaderName === ORIGIN_VERIFY_HEADER);
    expect(header?.HeaderValue).toEqual(webapp!.Properties.Environment.Variables.ORIGIN_VERIFY_SECRET);
  });
});

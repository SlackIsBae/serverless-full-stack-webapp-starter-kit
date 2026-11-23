import { test, expect, vi } from 'vitest';
import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { MainStack } from '../lib/main-stack';

test('Snapshot test', () => {
  vi.useFakeTimers({ toFake: ['Date'] }).setSystemTime(new Date('2020-01-01'));

  const app = new cdk.App();
  const mainStack = new MainStack(app, 'ServerlessWebappStarterKitStack', {
    env: {
      account: '123456789012',
      region: 'us-east-2',
    },
  });
  expect(Template.fromStack(mainStack)).toMatchSnapshot();
});

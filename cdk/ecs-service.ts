#!/usr/bin/env node
import { VpcNetworkProvider } from '@aws-cdk/aws-ec2';
import { RepositoryRef } from '@aws-cdk/aws-ecr';
import { Cluster, ContainerImage, LoadBalancedFargateService } from '@aws-cdk/aws-ecs';
import cdk = require('@aws-cdk/cdk');

class TriviaBackendStack extends cdk.Stack {
  constructor(parent: cdk.App, name: string, props: cdk.StackProps) {
    super(parent, name, props);

    // Reference existing network and cluster infrastructure
    const cluster = Cluster.import(this, 'Cluster', {
      clusterName: 'default',
      vpc: new VpcNetworkProvider(this, { isDefault: true }).vpcProps,
      securityGroups: []
    });

    // Reference Docker image
    const repoName = (process.env.IMAGE_REPO_NAME) ? process.env.IMAGE_REPO_NAME : 'reinvent-trivia-backend';
    const imageRepo = RepositoryRef.import(this, 'Repo', {
      repositoryArn: cdk.ArnUtils.fromComponents({
        service: 'ecr',
        resource: 'repository',
        resourceName: repoName
      })
    });
    const tag = (process.env.IMAGE_TAG) ? process.env.IMAGE_TAG : 'latest';
    const image = ContainerImage.fromEcrRepository(imageRepo, tag)

    // Create Fargate service + load balancer
    const service = new LoadBalancedFargateService(this, 'Service', {
      cluster,
      image,
      publicTasks: true
    });

    // Speed up deployments
    service.targetGroup.setAttribute('deregistration_delay.timeout_seconds', '30');
    service.targetGroup.configureHealthCheck({
      intervalSecs: 5,
      healthyHttpCodes: '200',
      healthyThresholdCount: 2,
      unhealthyThresholdCount: 3,
      timeoutSeconds: 4,
    });

    new cdk.Output(this, 'ServiceURL', {
      value: 'http://' + service.loadBalancer.dnsName
    });
  }
}

const app = new cdk.App();
new TriviaBackendStack(app, 'Api', {});
app.run();
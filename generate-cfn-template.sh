#!/bin/bash
set -ex

sudo npm install -g aws-cdk@0.18.1
cd cdk
npm ci
npm run build
cdk synth --app 'node ecs-service.js' > ../template.yml

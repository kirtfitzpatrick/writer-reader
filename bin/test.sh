#!/usr/bin/env bash

source bin/functions.sh

# TODO: figure out namespaces from key decorators
# ConfigMap tests
_echo_run "cdk8s synth -a 'npx ts-node test/app/k8s-config-map-writer-app.ts'"
_echo_run "kubectl --context k3d-central apply -f dist/config-map-writer-chart.k8s.yaml"
_echo_run "kubectl --context k3d-central get configmap sigma-config-map -o yaml"

_echo_run "cdk8s synth -a 'npx ts-node test/app/k8s-config-map-reader-app.ts'"

# Secret tests
_echo_run "cdk8s synth -a 'npx ts-node test/app/k8s-secret-writer-app.ts'"
_echo_run "kubectl --context k3d-central apply -f dist/secret-writer-chart.k8s.yaml"
_echo_run "kubectl --context k3d-central get secret sigma-secret -o yaml"

_echo_run "cdk8s synth -a 'npx ts-node test/app/k8s-secret-reader-app.ts'"

# Now Terraform...

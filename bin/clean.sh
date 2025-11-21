#!/usr/bin/env bash

source bin/functions.sh

_echo_run "rm -rf dist/*"

for CONF in central sigma; do
  _echo_run "k3d cluster delete ${CONF}"
  _echo_run "k3d cluster create ${CONF}"
done

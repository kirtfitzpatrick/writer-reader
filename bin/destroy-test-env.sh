#!/usr/bin/env bash

source bin/functions.sh

_echo_run "k3d cluster delete central"
_echo_run "k3d cluster delete sigma"
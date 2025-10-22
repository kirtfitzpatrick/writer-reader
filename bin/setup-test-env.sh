#!/usr/bin/env bash

source bin/functions.sh

_echo_run "k3d cluster create central"
_echo_run "k3d cluster create sigma"
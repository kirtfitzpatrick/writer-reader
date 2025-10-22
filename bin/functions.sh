#!/usr/bin/env bash

export BLUE='\033[0;34m'
export NC='\033[0m' # No Color

function _echo_cmd {
  local CMD="$*"
  echo -e "${BLUE}${CMD}${NC}"
}

function _echo_run {
  local CMD="$*"
  _echo_cmd "${CMD}"
  eval "${CMD}"
}

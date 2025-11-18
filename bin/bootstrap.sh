#!/usr/bin/env bash

source bin/functions.sh

ACCOUNTS=(
492148783529
330938320743
668318664362
)

for ACCOUNT_ID in "${ACCOUNTS[@]}"; do
  _echo_run "cdk bootstrap --profile ${ACCOUNT_ID}_AdministratorAccess aws://${ACCOUNT_ID}/us-east-1"
  _echo_run "cdk bootstrap --profile ${ACCOUNT_ID}_AdministratorAccess aws://${ACCOUNT_ID}/us-west-2"
done
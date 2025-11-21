#!/usr/bin/env bash

source bin/functions.sh


function _help {
  cat <<-EOM
Usage:
  $0 APP_FILE CONFIG CDK_CMD 

EOM
  echo ""
}

if [ $# -eq 0 ]; then
  _help
  exit 1
fi

APP_FILE_NAME=$1
CONF_NAME=$2
CDK_CMD=$3
REST=("${@:4}")

APP_STR="npx ts-node --prefer-ts-exts "${APP_FILE_NAME}" ${CONF_NAME}"
PASS_THROUGH_PARAMS="${CDK_CMD} ${REST[*]} -o dist"


echo "App File: ${APP_FILE_NAME}"
echo "Config Name: ${CONF_NAME}"
echo "CDK Command: ${CDK_CMD}"
echo "Rest Params: ${REST[*]}"
echo "App Str: ${APP_STR}"

if [[ "${CDK_CMD}" == "metadata" ]]; then
  PASS_THROUGH_PARAMS="${PASS_THROUGH_PARAMS} -c 'disable-stack-trace=true'"
elif [[ "${CDK_CMD}" == "deploy" ]]; then
  PASS_THROUGH_PARAMS="${PASS_THROUGH_PARAMS} --concurrency 10"
elif [[ "${CDK_CMD}" == "destroy" ]]; then
  PASS_THROUGH_PARAMS="${PASS_THROUGH_PARAMS} --force"
fi

if [[ -v FLEX_COLUMNS ]]; then
  stty cols $FLEX_COLUMNS 2>/dev/null
fi

_echo_run "npx cdk -a '${APP_STR}' ${PASS_THROUGH_PARAMS}"
# echo "npx cdk -a '${APP_STR}' ${PASS_THROUGH_PARAMS}"
EXIT_STATUS=$?
_say "finished"

exit $EXIT_STATUS

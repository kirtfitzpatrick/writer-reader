#!/usr/bin/env bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source ${SCRIPT_DIR}/functions.sh


function _help {
  cat <<-EOM
Usage:
  $0 WRITER_CONFIG READER_CONFIG CDK_CMD [CDK_OPTIONS...]

EOM
  echo ""
}

if [ $# -eq 0 ]; then
  _help
  exit 1
fi

if [[ -d test ]]; then
  APP_FILE_NAME="src/cfn-token/app.ts"
else
  APP_FILE_NAME="node_modules/writer-reader/dist/src/cfn-token/app.js"
fi

WRITER_CONF_NAME=$1
READER_CONF_NAME=$2
CDK_CMD=$3
REST=("${@:4}")

APP_STR="npx ts-node --prefer-ts-exts "${APP_FILE_NAME}" ${WRITER_CONF_NAME} ${READER_CONF_NAME}"
PASS_THROUGH_PARAMS="${CDK_CMD} ${REST[*]}"

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
EXIT_STATUS=$?
_say "finished"

exit $EXIT_STATUS

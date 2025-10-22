#!/usr/bin/env bash

# SRC_FILES=$(find src -name '*.ts' | grep -v src/index.ts)

cd src
echo "" >index.ts

for SRC_FILE in $(find . -name '*.ts' | grep -v index.ts); do
  SRC_PKG=$(echo $SRC_FILE | sed 's/\.ts$//g')
  echo "export * from '${SRC_PKG}'" >>index.ts
done

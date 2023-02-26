#!/bin/bash

function build_fe {
  script_dir=$(cd -P -- "$(dirname -- "$0")" && pwd -P)

  if [ -d tmp-fe-build ]; then
    rm -rf tmp-fe-build
  fi
  mkdir tmp-fe-build

  cd ${script_dir}/vb-settings
  npm ci
  npm run prisma:gen
  npm run build

  cd ${script_dir}

  cp -r vb-settings/public tmp-fe-build
  if [[ "$OSTYPE" == "darwin"* ]]; then
    cp -r vb-settings/.next/standalone/  tmp-fe-build
  else
    cp -rT vb-settings/.next/standalone  tmp-fe-build
  fi
  cp -r vb-settings/.next/static tmp-fe-build/.next/static
  mv tmp-fe-build/.next tmp-fe-build/dotnext
  mv tmp-fe-build/node_modules tmp-fe-build/nodemodules
}
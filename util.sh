#!/bin/bash
set -euo pipefail

function build_fe {
  script_dir=$(cd -P -- "$(dirname -- "$0")" && pwd -P)

  if [ -d "${script_dir}/tmp-fe-build" ]; then
    rm -rf "${script_dir}/tmp-fe-build"
  fi
  mkdir "${script_dir}/tmp-fe-build"

  cd "${script_dir}/vb-settings"
  export NEXT_PRIVATE_STANDALONE=true
  pnpm install --frozen-lockfile
  pnpm run prisma:gen
  pnpm run build

  cd "${script_dir}"

  cp -R vb-settings/public tmp-fe-build
  tar -C vb-settings/.next/standalone -cf - . | tar -C tmp-fe-build -xf -
  cp -r vb-settings/.next/static tmp-fe-build/.next/static
  mv tmp-fe-build/.next tmp-fe-build/dotnext
  mv tmp-fe-build/node_modules tmp-fe-build/nodemodules
}

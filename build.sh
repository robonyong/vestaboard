#!/bin/bash

script_dir=$(cd -P -- "$(dirname -- "$0")" && pwd -P)

RED='\033[0;31m'
NC='\033[0m'

if [ -d tmp-fe-build ]; then
  rm -rf tmp-fe-build
fi
mkdir tmp-fe-build

cd ${script_dir}/vb-settings
npm run prisma:gen
npm run build

cd ${script_dir}

cp -r vb-settings/public tmp-fe-build
cp -r vb-settings/.next/standalone/  tmp-fe-build
cp -r vb-settings/.next/static tmp-fe-build/.next/static
mv tmp-fe-build/.next tmp-fe-build/dotnext
mv tmp-fe-build/node_modules tmp-fe-build/nodemodules

if [ $? -eq 0 ] 
then 
  echo "Frontend files built -- beginning server build..."
  docker build --squash --platform=arm64 . -t bucatini/vbcontroller:pi-latest
  rm -rf tmp-fe-build
else
  echo -e "${RED}Failed to build frontend files -- please check the logged output!${NC}"
  rm -rf tmp-fe-build
  exit 1
fi


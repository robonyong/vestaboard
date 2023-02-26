#!/bin/bash
script_dir=$(cd -P -- "$(dirname -- "$0")" && pwd -P)
RED='\033[0;31m'
NC='\033[0m'

if [ -z "$1" ]
  then
    echo -e "${RED}Please provide a device arg: pi or mac${NC}"
    exit 1
fi
device=$1
if [ "$device" != "pi" ] && [ "$device" != "mac" ]
  then
    echo -e "${RED}Device arg must be 'pi' or 'mac'${NC}"
    exit 1
fi

source ./util.sh
build_fe

if [ $? -eq 0 ] 
then 
  echo "Frontend files built -- beginning server build..."
  if [ "$device" == "pi" ]
    then
      echo "Building for pi"
      docker build --squash --platform=arm64 . -t bucatini/vbcontroller:pi-latest
    else
      echo "Building for mac"
      docker build --squash . -t bucatini/vbcontroller:mac-latest
  fi
  rm -rf tmp-fe-build
else
  echo -e "${RED}Failed to build frontend files -- please check the logged output!${NC}"
  rm -rf tmp-fe-build
  exit 1
fi

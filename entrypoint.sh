#!/bin/bash

pids=""

PORT=$FE_PORT npm run start & pids="$pids $!"

echo "starting vestaboard"

vestaboard & pids="$pids $!"

echo "all services started"
wait -n "$pids" >/dev/null 2>&1 || wait
exit 1

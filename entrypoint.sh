#!/bin/bash

# All permanent background process ids should be added to this string
service_pids=""
ls

# PORT=$FE_PORT npm run start &
# service_pids+=" $!"

# PORT=$FE_PORT pm2 --name VestaboardFE start npm -- start
echo "starting vestaboard"

vestaboard &
service_pids="${service_pids} $!"

echo "$service_pids"
wait -n "$service_pids" >/dev/null 2>&1 || wait
exit 1

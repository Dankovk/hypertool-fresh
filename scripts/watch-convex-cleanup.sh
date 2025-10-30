#!/bin/bash
# Watch for .js files being created and delete them immediately
while true; do
  find convex -maxdepth 1 -name "*.js" -not -path "*/_generated/*" -delete 2>/dev/null
  find convex -maxdepth 1 -name "*.js.map" -delete 2>/dev/null
  sleep 0.5
done

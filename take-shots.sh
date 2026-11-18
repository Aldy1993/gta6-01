#!/bin/bash
# Take the 4 staged screenshots of Port Solano into screenshots/ as JPEGs.
#
# Capture is REAL TIME (--timeout), not virtual-time-budget: under
# --virtual-time-budget the WebGL canvas reads back black on this VM (the
# compositor never presents a frame before the virtual budget expires),
# while real-time capture presents fine. The pre-step in main.js already
# puts the sim at speed before the first frame, so a real-time run only
# needs a handful of paint iterations before the screenshot.
set -e
cd ~/workspace/makefun/gta6-01-entry
CH=~/.cache/ms-playwright/chromium-1255/chrome-linux64/chrome
mkdir -p screenshots /tmp/solano-shots
for spec in "cover 1-cover" "chase 2-chase" "street 3-street" "mission 4-mission"; do
  set -- $spec
  "$CH" --headless=new --disable-gpu --no-sandbox --use-gl=angle --use-angle=swiftshader \
    --window-size=1280,720 --timeout=90000 \
    --screenshot=/tmp/solano-shots/$2.png "http://localhost:8080/?shot=$1&seed=1337" 2>/dev/null
  python3 -c "
from PIL import Image
im = Image.open('/tmp/solano-shots/$2.png').convert('RGB')
im.save('screenshots/$2.jpg', 'JPEG', quality=80)
print('$2.jpg', im.size)
"
done
ls -la screenshots/

#!/bin/bash
cd "$(dirname "$0")"
python3 scan-music.py
xdg-open index.html

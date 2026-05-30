#!/bin/bash
# Generate CWS screenshots using headless Chrome
set -e

CHROME="/c/Users/Administrator/AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe"
OUTDIR="$(cd "$(dirname "$0")" && pwd)"

for file in screenshot-main screenshot-context-menu screenshot-translate screenshot-theme screenshot-shortcut; do
    html_file="$OUTDIR/${file}.html"
    png_file="$OUTDIR/${file}.png"
    
    if [ -f "$html_file" ]; then
        URL="file://${html_file}"
        
        # Use Chrome headless --screenshot flag
        bash -c "exec \"$CHROME\" --headless=new --disable-gpu --no-sandbox --screenshot=\"$png_file\" --window-size=1280,720 --device-scale-factor=2 \"$URL\"" 2>/dev/null
        
        SIZE=$(stat -c%s "$png_file" 2>/dev/null || stat -f%z "$png_file" 2>/dev/null)
        echo "✅ ${file}.png (${SIZE} bytes)"
    else
        echo "❌ Missing: $file.html"
    fi
done

echo ""
echo "All screenshots generated!"

#!/bin/bash

# Quick File Check for GitHub Release v1.0.3
# Run this to verify all files are ready for upload

echo "=========================================="
echo "Talio v1.0.3 - File Verification"
echo "=========================================="
echo ""

FILES=(
  "mac-app/release/Talio-1.0.3-arm64.dmg"
  "mac-app/release/Talio-1.0.3-x64.dmg"
  "windows-app/release/Talio-Setup-1.0.3-x64.exe"
  "windows-app/release/Talio-Setup-1.0.3-ia32.exe"
  "windows-app/release/Talio-Setup-1.0.3.exe"
)

ALL_EXIST=true

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    size=$(ls -lh "$file" | awk '{print $5}')
    echo "✅ $file ($size)"
  else
    echo "❌ MISSING: $file"
    ALL_EXIST=false
  fi
done

echo ""

if [ "$ALL_EXIST" = true ]; then
  echo "=========================================="
  echo "✅ All 5 installer files are ready!"
  echo "=========================================="
  echo ""
  echo "Next steps:"
  echo "1. Go to: https://github.com/avirajsharma-ops/Tailo/releases/edit/v1.0.3"
  echo "2. Delete: Talio-1.0.3.dmg (old file without -x64 suffix)"
  echo "3. Upload: Talio-1.0.3-x64.dmg (from mac-app/release/)"
  echo "4. Upload: Talio-Setup-1.0.3.exe (from windows-app/release/)"
  echo "5. Click 'Update release'"
  echo ""
  echo "Download page URLs are already configured correctly! ✓"
else
  echo "=========================================="
  echo "❌ Some files are missing!"
  echo "=========================================="
  echo ""
  echo "Please rebuild the missing installers first."
fi

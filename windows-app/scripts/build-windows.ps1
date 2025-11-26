# Talio Activity Monitor - Windows Build Script
# Run this script on a Windows machine to build the installer

# Set error action
$ErrorActionPreference = "Stop"

Write-Host "🚀 Talio Activity Monitor - Windows Build Script" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan

# Check Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Node.js not found. Please install Node.js 18+ from https://nodejs.org" -ForegroundColor Red
    exit 1
}

$nodeVersion = (node --version)
Write-Host "✅ Node.js version: $nodeVersion" -ForegroundColor Green

# Navigate to windows-app directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$appDir = Split-Path -Parent $scriptDir
Set-Location $appDir

Write-Host "`n📦 Installing dependencies..." -ForegroundColor Yellow
npm install

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ npm install failed" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Dependencies installed" -ForegroundColor Green

# Generate icons if needed
Write-Host "`n🎨 Generating icons..." -ForegroundColor Yellow
node scripts/generate-icons.js

Write-Host "`n🔨 Building Windows installers..." -ForegroundColor Yellow
Write-Host "This may take a few minutes..." -ForegroundColor Gray

# Build for all architectures
npm run build:win

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed" -ForegroundColor Red
    exit 1
}

Write-Host "`n✅ Build complete!" -ForegroundColor Green
Write-Host "`n📁 Output files in: $appDir\release\" -ForegroundColor Cyan

# List output files
Write-Host "`n📋 Generated installers:" -ForegroundColor Yellow
Get-ChildItem -Path "release" -Filter "*.exe" | ForEach-Object {
    $size = [math]::Round($_.Length / 1MB, 2)
    Write-Host "   📦 $($_.Name) ($size MB)" -ForegroundColor White
}

Write-Host "`n🎉 Done! The installers are ready for distribution." -ForegroundColor Green


# Streamflow Deployment Script
# Automates building and pushing Docker images to registries

$ErrorActionPreference = "Stop"

Write-Host "=============================" -ForegroundColor Cyan
Write-Host "   Streamflow Deployer       " -ForegroundColor Cyan
Write-Host "=============================" -ForegroundColor Cyan

# 1. Build
Write-Host "`n[1/3] Building Docker Image..." -ForegroundColor White
docker build -t streamflow:latest .
if ($LASTEXITCODE -ne 0) { Write-Error "Build failed"; exit 1 }
Write-Host "   -> Build successful" -ForegroundColor Green

# 2. Push to Docker Hub
Write-Host "`n[2/3] Pushing to Docker Hub..." -ForegroundColor White
docker tag streamflow:latest vndangkhoa/streamflow:latest
docker push vndangkhoa/streamflow:latest
if ($LASTEXITCODE -ne 0) { Write-Warning "Docker Hub push failed. Check your login." }
else { Write-Host "   -> Pushed to Docker Hub" -ForegroundColor Green }

# 3. Push to Private Registry
Write-Host "`n[3/3] Pushing to Private Registry..." -ForegroundColor White
docker tag streamflow:latest git.khoavo.myds.me/vndangkhoa/kv-streamflow:latest
docker push git.khoavo.myds.me/vndangkhoa/kv-streamflow:latest
if ($LASTEXITCODE -ne 0) { Write-Warning "Private Registry push failed. Check VPN/Login." }
else { Write-Host "   -> Pushed to Private Registry" -ForegroundColor Green }

Write-Host "`nDeployment Complete!" -ForegroundColor Magenta
Start-Sleep -Seconds 5

# Streamflow Deployment Script
# Automates building and pushing Docker images to registries

$ErrorActionPreference = "Stop"
$VERSION = "v3.9.1"

Write-Host "=============================" -ForegroundColor Cyan
Write-Host "   Streamflow Deployer       " -ForegroundColor Cyan
Write-Host "=============================" -ForegroundColor Cyan

# 1. Build for linux/amd64
Write-Host "`n[1/3] Building Docker Image for linux/amd64..." -ForegroundColor White
docker buildx build --platform linux/amd64 -t streamflow:latest -t streamflow:$VERSION --load .
if ($LASTEXITCODE -ne 0) { Write-Error "Build failed"; exit 1 }
Write-Host "   -> Build successful" -ForegroundColor Green

# 2. Push to Docker Hub
Write-Host "`n[2/3] Pushing to Docker Hub..." -ForegroundColor White
docker tag streamflow:latest vndangkhoa/streamflow:latest
docker tag streamflow:$VERSION vndangkhoa/streamflow:$VERSION
docker push vndangkhoa/streamflow:latest
docker push vndangkhoa/streamflow:$VERSION
if ($LASTEXITCODE -ne 0) { Write-Warning "Docker Hub push failed. Check your login." }
else { Write-Host "   -> Pushed to Docker Hub" -ForegroundColor Green }

# 3. Push to Private Registry (Forgejo)
Write-Host "`n[3/3] Pushing to Private Registry..." -ForegroundColor White
docker tag streamflow:latest git.khoavo.myds.me/vndangkhoa/kv-netflix:latest
docker tag streamflow:$VERSION git.khoavo.myds.me/vndangkhoa/kv-netflix:$VERSION
docker push git.khoavo.myds.me/vndangkhoa/kv-netflix:latest
docker push git.khoavo.myds.me/vndangkhoa/kv-netflix:$VERSION
if ($LASTEXITCODE -ne 0) { Write-Warning "Private Registry push failed. Check VPN/Login." }
else { Write-Host "   -> Pushed to Private Registry" -ForegroundColor Green }

Write-Host "`nDeployment Complete!" -ForegroundColor Magenta
Start-Sleep -Seconds 5


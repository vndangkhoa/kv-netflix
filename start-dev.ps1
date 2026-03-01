# Streamflow Dev Start Script (Auto-Restart)

Write-Host "=============================" -ForegroundColor Cyan
Write-Host "   Streamflow Dev Launcher   " -ForegroundColor Cyan
Write-Host "=============================" -ForegroundColor Cyan

$BackendPort = 8000
$FrontendPort = 5173

# Helper function to kill processes on a port
function Kill-Port($port) {
    echo "Checking port $port..."
    $connection = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($connection) {
        $pidNum = $connection.OwningProcess
        Write-Host "   -> Killing process $pidNum on port $port" -ForegroundColor Yellow
        Stop-Process -Id $pidNum -Force -ErrorAction SilentlyContinue
    } else {
        Write-Host "   -> Port $port is free." -ForegroundColor Green
    }
}

# 1. Cleanup
Write-Host "`n[1/4] Cleaning up existing processes..." -ForegroundColor White
Kill-Port $BackendPort
Kill-Port $FrontendPort

# 2. Start Backend
Write-Host "`n[2/4] Starting Backend (Go)..." -ForegroundColor White
$backendProcess = Start-Process -FilePath "go" -ArgumentList "run cmd/server/main.go" -WorkingDirectory "$PSScriptRoot\backend" -PassThru -NoNewWindow:$false
Write-Host "   -> Backend started (PID: $($backendProcess.Id))" -ForegroundColor Green

# 3. Start Frontend
Write-Host "`n[3/4] Starting Frontend (Vite)..." -ForegroundColor White
# Use npm.cmd for Windows compatibility
$frontendProcess = Start-Process -FilePath "npm.cmd" -ArgumentList "run dev" -WorkingDirectory "$PSScriptRoot\frontend-react" -PassThru -NoNewWindow:$false
Write-Host "   -> Frontend started (PID: $($frontendProcess.Id))" -ForegroundColor Green

# 4. Launch Browser
Write-Host "`n[4/4] Waiting for services..." -ForegroundColor White
for ($i = 5; $i -gt 0; $i--) {
    Write-Host "   -> Launching in $i seconds..." -NoNewline
    Start-Sleep -Seconds 1
    Write-Host "`r" -NoNewline
}

Write-Host "`n   -> Opening http://localhost:$FrontendPort" -ForegroundColor Cyan
Start-Process "http://localhost:$FrontendPort"

Write-Host "`nAll systems go! Close the pop-up windows to stop the servers." -ForegroundColor Magenta
Start-Sleep -Seconds 3

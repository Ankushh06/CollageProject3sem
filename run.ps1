Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  RouteFlow: Delivery Route Optimization System (Java + Web)" -ForegroundColor Cyan
Write-Host "  Databases supported: Oracle Database & SQLite (Auto-detect)" -ForegroundColor DarkCyan
Write-Host "============================================================" -ForegroundColor Cyan

if (!(Test-Path "bin")) {
    New-Item -ItemType Directory -Path "bin" | Out-Null
}

Write-Host "Compiling Java sources..." -ForegroundColor Yellow
javac -cp "sqlite-jdbc.jar;ojdbc11.jar" -d bin src/delivery/*.java

if ($LASTEXITCODE -ne 0) {
    Write-Host "Compilation failed with error code $LASTEXITCODE" -ForegroundColor Red
    exit $LASTEXITCODE
}

Write-Host "Starting RouteFlow Server..." -ForegroundColor Green
Write-Host "Access the Web UI at: http://localhost:8080" -ForegroundColor Cyan
java -cp "bin;sqlite-jdbc.jar;ojdbc11.jar" delivery.Main $args

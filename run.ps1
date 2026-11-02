Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  RouteFlow: Delivery Route Optimization System (C++ ADS Engine)" -ForegroundColor Cyan
Write-Host "  Data Structures: Graph (Adjacency List) + Min-Heap Priority Queue" -ForegroundColor DarkCyan
Write-Host "  Algorithm: Dijkstra Shortest Path O((V + E) log V) & TSP Planner" -ForegroundColor DarkCyan
Write-Host "============================================================" -ForegroundColor Cyan

$cppFiles = Get-ChildItem -Path "src" -Filter "*.cpp"
if (-not $cppFiles) {
    Write-Host "No C++ source files found in src/" -ForegroundColor Red
    exit 1
}

Write-Host "Compiling C++ ADS Engine with g++..." -ForegroundColor Yellow
g++ -std=c++14 -O2 src/main.cpp -o routeflow.exe -lws2_32

if ($LASTEXITCODE -ne 0) {
    Write-Host "C++ compilation failed with error code $LASTEXITCODE" -ForegroundColor Red
    exit $LASTEXITCODE
}

Write-Host "Compilation successful: routeflow.exe ready." -ForegroundColor Green
Write-Host "Starting RouteFlow C++ Server..." -ForegroundColor Green
Write-Host "Web UI available at: http://localhost:8080" -ForegroundColor Cyan

Start-Process "http://localhost:8080"
.\routeflow.exe $args

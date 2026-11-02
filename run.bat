@echo off
echo ============================================================
echo   RouteFlow: Delivery Route Optimization System (C++ ADS Engine)
echo   Data Structures: Graph (Adjacency List) + Min-Heap Priority Queue
echo   Algorithm: Dijkstra Shortest Path O((V + E) log V) & TSP Planner
echo ============================================================
echo Compiling C++ source files with g++...
g++ -std=c++14 -O2 src/main.cpp -o routeflow.exe -lws2_32
if %errorlevel% neq 0 (
    echo C++ compilation failed!
    pause
    exit /b %errorlevel%
)

echo Starting RouteFlow C++ Server...
echo Opening browser at: http://localhost:8080
start http://localhost:8080
.\routeflow.exe %*

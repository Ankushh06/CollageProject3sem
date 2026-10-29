@echo off
echo ============================================================
echo   RouteFlow: Delivery Route Optimization System (Java + Web)
echo ============================================================
echo Compiling Java source files...
if not exist bin mkdir bin
javac -cp sqlite-jdbc.jar -d bin src/delivery/*.java
if %errorlevel% neq 0 (
    echo Compilation failed!
    pause
    exit /b %errorlevel%
)

echo Starting RouteFlow Web Server and Application...
echo Open your browser at: http://localhost:8080
java -cp "bin;sqlite-jdbc.jar" delivery.Main %*

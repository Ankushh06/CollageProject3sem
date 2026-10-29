# RouteFlow - Delivery Route Optimization System
**DSA (Java) + Relational DBMS (SQLite) + Modern Web Frontend**

A comprehensive route optimization and logistics platform combining **Dijkstra's Algorithm (DSA)** with a **Relational Database (SQLite DBMS)**, served by an embedded Java backend and an interactive web interface.

---

## 1. Project Overview

- **DSA Core**: In-memory adjacency list graph representation, binary min-heap (`PriorityQueue`) implementation of Dijkstra's algorithm running in $O((V + E) \log V)$, and a greedy nearest-neighbor TSP delivery tour planner.
- **DBMS Core**: SQLite relational database (`delivery.db`) with 3NF normalization, foreign key constraints, automated audit triggers (`trg_roads_insert`, `trg_roads_update`), summary views (`v_active_roads`, `v_trip_summary`), and multi-table atomic transactions.
- **Web Frontend**: High-performance HTML5 canvas map visualizer with draggable nodes, 1-click demo scenarios, interactive road toggling, animated delivery vehicle tracking, and fleet management dashboard.

---

## 2. Directory Structure

```
.
├── src/delivery/               # Java Backend Core (DSA + DBMS)
│   ├── Criterion.java          # Optimization metric (DISTANCE vs TIME)
│   ├── Database.java           # SQLite JDBC integration, triggers, views, transactions
│   ├── DeliveryNetwork.java    # Graph representation, Dijkstra's algorithm, TSP planner
│   ├── DijkstraResult.java     # Distance & predecessor tree structure
│   ├── Edge.java               # Directed road edge model
│   ├── JsonUtils.java          # Zero-dependency JSON parser & serializer
│   ├── Main.java               # Entry point (CLI menu & Web server launcher)
│   ├── SampleDataLoader.java   # Sample city layout & coordinates
│   ├── TripPlan.java           # Computed route & stops model
│   └── WebServer.java          # Embedded HTTP server with REST APIs
│
├── web/                        # Modern Web Frontend
│   ├── index.html              # Interactive dashboard & canvas viewport
│   ├── style.css               # Obsidian glassmorphism theme & cyber logistics styling
│   └── app.js                  # Reactive client, Dijkstra visualizer, animated truck HUD
│
├── delivery.db                 # SQLite database file
├── schema.sql                  # Database schema definitions (tables, constraints, triggers, views)
├── queries.sql                 # 12 demo SQL queries for DBMS evaluation
├── sqlite-jdbc.jar             # SQLite JDBC driver (self-contained, no extra downloads)
├── run.bat                     # 1-Click launcher for Windows Command Prompt
├── run.ps1                     # 1-Click launcher for Windows PowerShell
└── .gitignore                  # Git ignore rules for build artifacts
```

---

## 3. How to Run

### Requirements
- **Java SE 11+** (Java 17, 21, or 26 supported)
- Modern web browser (Chrome, Edge, Firefox, Safari)

### Quick Start

#### Option A: Windows PowerShell (Recommended)
```powershell
.\run.ps1
```

#### Option B: Windows Command Prompt / Double-Click
```bat
run.bat
```

#### Option C: Direct Java Commands
```bash
# 1. Compile Java sources into bin/
javac -cp sqlite-jdbc.jar -d bin src/delivery/*.java

# 2. Run application (starts Web Server + CLI)
java -cp "bin;sqlite-jdbc.jar" delivery.Main
```

Once started, open your browser to:
👉 **`http://localhost:8080`**

---

## 4. Key Features & User Interface

### 🎯 1-Click Demo Scenarios
- **🚀 Warehouse ➔ Airport**: Computes the optimal single route and launches the animated delivery vehicle.
- **📦 4-Stop Delivery Tour**: Optimizes multi-stop customer delivery sequence with automatic depot return.
- **🚧 Road Closure Detour**: Simulates a highway closure; watch Dijkstra dynamically compute an alternative detour in real time!
- **🔄 Clear Route**: Resets route highlighting and selections.

### 🗺️ Interactive City Canvas Map
- **Click any location node**: Reveals a floating card to set it as **Start**, **Destination**, or **Delivery Stop**.
- **Click any road**: Instantly toggles the road **Open** or **Closed**.
- **Drag nodes**: Freely customize the city map layout with real-time coordinate saving.
- **Pan & Zoom**: Smooth mouse wheel zooming and canvas drag panning.

### 🧭 Turn-by-Turn Driving Directions
Step-by-step navigation breakdown detailing distance, travel time, and intermediate passing waypoints.

### 💾 DBMS Fleet Management & Reporting
- **Trip History**: View all recorded trips joined with driver, vehicle, and stop counts (`v_trip_summary`).
- **Driver Performance**: Analyze total distance driven, trips completed, and average duration per driver.
- **Top Visited Locations**: Frequency rankings of the most popular delivery destinations.
- **Road Audit Trail**: Real-time log populated by SQLite triggers tracking `ADDED`, `CLOSED`, `REOPENED`, and `UPDATED` road events.

---

## 5. Database Schema & Design

### Relational Tables
1. **`locations`**: Unique locations (Depots, Customers, Landmarks).
2. **`roads`**: Bidirectional road links with distance (km) and travel time (min), stored with constraint `loc_a < loc_b`.
3. **`drivers`**: Delivery personnel names and unique phone numbers.
4. **`vehicles`**: Fleet vehicles with registration numbers, types (`BIKE`, `VAN`, `TRUCK`), and capacity (kg).
5. **`delivery_trips`**: Recorded trip history with total distance, duration, depot, driver, and vehicle references.
6. **`trip_stops`**: Ordered sequence of customer delivery stops for each trip (Composite Primary Key: `trip_id, stop_seq`).
7. **`road_audit`**: Automated change log generated by SQL triggers.

### Automated Triggers
- **`trg_roads_insert`**: Logs `ADDED` action with distance and time when a road is created.
- **`trg_roads_update`**: Logs `CLOSED`, `REOPENED`, or `UPDATED` action automatically when road status changes.

---

## 6. Demo SQL Queries
Run DBMS evaluation queries against the database using the SQLite CLI:
```bash
sqlite3 delivery.db < queries.sql
```
Covers `INNER JOIN`, `LEFT JOIN`, `GROUP BY ... HAVING`, subqueries, aggregate functions, and trigger audits.

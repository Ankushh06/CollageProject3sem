# RouteFlow - Delivery Route Optimization System
**DSA (Java) + Relational DBMS (Oracle / SQLite) + Tailwind CSS v3 Frontend**

A comprehensive route optimization and logistics platform combining **Dijkstra's Algorithm (DSA)** with a **Dual Relational Database Engine (Oracle Database + SQLite DBMS)**, styled with **Tailwind CSS v3**, served by an embedded Java backend and an interactive web interface.

---

## 1. Project Overview

- **DSA Core**: In-memory adjacency list graph representation, binary min-heap (`PriorityQueue`) implementation of Dijkstra's algorithm running in $O((V + E) \log V)$, and a greedy nearest-neighbor TSP delivery tour planner.
- **Dual Relational DBMS (Oracle + SQLite)**: 
  - **Oracle Database**: Enterprise connection support via official Oracle JDBC Driver (`ojdbc11.jar`), configured via `db.properties`, complete with Oracle DDL (`oracle_schema.sql`), triggers, and views.
  - **SQLite Fallback**: Built-in zero-configuration local database (`delivery.db`) with 3NF normalization, foreign key constraints, automated audit triggers (`trg_roads_insert`, `trg_roads_update`), summary views (`v_active_roads`, `v_trip_summary`), and multi-table atomic transactions. RouteFlow automatically connects to Oracle if available and gracefully uses SQLite if offline.
- **Tailwind CSS v3 Frontend**: Built with modern Tailwind CSS v3, glowing neon cyan/emerald badges, glassmorphic obsidian cards, interactive HTML5 canvas map visualizer with draggable nodes, 1-click demo scenarios, interactive road toggling, animated delivery vehicle tracking, and fleet management dashboard.

---

## 2. Directory Structure

```
.
├── src/delivery/               # Java Backend Core (DSA + DBMS)
│   ├── Criterion.java          # Optimization metric (DISTANCE vs TIME)
│   ├── Database.java           # Dual Oracle & SQLite JDBC integration, triggers, views, transactions
│   ├── DeliveryNetwork.java    # Graph representation, Dijkstra's algorithm, TSP planner
│   ├── DijkstraResult.java     # Distance & predecessor tree structure
│   ├── Edge.java               # Directed road edge model
│   ├── JsonUtils.java          # Zero-dependency JSON parser & serializer
│   ├── Main.java               # Entry point (CLI menu & Web server launcher)
│   ├── SampleDataLoader.java   # Sample city layout & coordinates
│   ├── TripPlan.java           # Computed route & stops model
│   └── WebServer.java          # Embedded HTTP server with REST APIs
│
├── web/                        # Modern Tailwind CSS v3 Web Frontend
│   ├── index.html              # Tailwind CSS v3 dashboard, canvas viewport & Oracle modal
│   ├── style.css               # Companion animations, custom scrollbars & map overlays
│   └── app.js                  # Reactive client, Dijkstra visualizer, animated truck HUD
│
├── db.properties               # Database connection configuration (Oracle / SQLite)
├── oracle_schema.sql           # Oracle Database DDL (tables, triggers, views, sequences)
├── schema.sql                  # SQLite schema definitions (tables, constraints, triggers, views)
├── queries.sql                 # 12 demo SQL queries for DBMS evaluation
├── delivery.db                 # Local SQLite database file (fallback)
├── ojdbc11.jar                 # Oracle Database JDBC Driver (23.3)
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
javac -cp "sqlite-jdbc.jar;ojdbc11.jar" -d bin src/delivery/*.java

# 2. Run application (starts Web Server + CLI)
java -cp "bin;sqlite-jdbc.jar;ojdbc11.jar" delivery.Main
```

Once started, open your browser to:
👉 **`http://localhost:8080`**

---

## 4. Deploying on Vercel (1-Click Deployment)

RouteFlow is fully configured for **instant deployment on [Vercel](https://vercel.com)**:

1. Push your repository to GitHub (or use your existing repository: [`https://github.com/Ankushh06/CollageProject3sem`](https://github.com/Ankushh06/CollageProject3sem)).
2. Log into **[vercel.com](https://vercel.com)** and click **"Add New..." ➔ "Project"**.
3. Select your GitHub repository **`CollageProject3sem`** and click **"Import"**.
4. Leave all build settings as default (Vercel automatically picks up [`vercel.json`](file:///c:/Users/ankus/Downloads/files/vercel.json) and the [`api/`](file:///c:/Users/ankus/Downloads/files/api) serverless functions) and click **"Deploy"**.
5. Your web app will be live globally in seconds (e.g. `https://collage-project3sem.vercel.app`)!

> **Vercel Architecture Highlights:**
> - **Edge Static Delivery**: High-speed CDN serving Tailwind CSS v3 assets.
> - **Serverless Microservices**: Node.js functions in `api/` handling routes, plans, closures, and fleet state.
> - **Zero-Cold-Start In-Browser DSA**: An embedded client-side Dijkstra & TSP engine in `app.js` guarantees 0ms response time and offline reliability.

---

## 5. Oracle Database Configuration
RouteFlow supports direct connection to your Oracle Database (e.g. Oracle XE, Oracle Free 23c, Oracle 19c/21c).

1. Edit **`db.properties`** in the project root:
   ```properties
   db.mode=AUTO
   oracle.host=localhost
   oracle.port=1521
   oracle.service=FREEPDB1
   oracle.user=SYSTEM
   oracle.password=YourPasswordHere
   ```
2. (Optional) Run `oracle_schema.sql` in SQL*Plus or Oracle SQL Developer if initializing manually:
   ```bash
   sqlplus SYSTEM/YourPasswordHere@localhost:1521/FREEPDB1 @oracle_schema.sql
   ```
3. Restart RouteFlow with `.\run.ps1`. The top status pill will display **`Oracle DB`** in vibrant rose with real-time status!
*(Note: If Oracle is offline or not installed, RouteFlow seamlessly defaults to SQLite so your demo never fails!)*

---

## 6. Key Features & User Interface

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
- **Road Audit Trail**: Real-time log populated by database triggers tracking `ADDED`, `CLOSED`, `REOPENED`, and `UPDATED` road events.

---

## 7. Database Schema & Design

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

## 8. Demo SQL Queries
Run DBMS evaluation queries against the database using the SQLite CLI:
```bash
sqlite3 delivery.db < queries.sql
```
Covers `INNER JOIN`, `LEFT JOIN`, `GROUP BY ... HAVING`, subqueries, aggregate functions, and trigger audits.

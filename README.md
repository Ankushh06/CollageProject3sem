# RouteFlow - Delivery Route Optimization System
**C++14 Advanced Data Structures (ADS / DSA) + Tailwind CSS v3 Frontend**

A high-performance route optimization and logistics platform powered by **Advanced Data Structures (ADS)** and **Dijkstra's Algorithm**, written entirely in **C++14** with an embedded Winsock HTTP server serving an interactive Tailwind CSS v3 web application on **`http://localhost:8080`**.

---

## 1. Project Overview & ADS Concepts

- **Graph Representation**:
  - In-memory undirected weighted graph using an **Adjacency List** (`std::vector<std::vector<Edge>>`), providing optimal $O(V + E)$ space complexity and rapid edge relaxation iterations.
  - $O(1)$ vertex lookup by location name using a **Hash Map** (`std::unordered_map<std::string, int>`).
- **Dijkstra's Shortest Path Algorithm**:
  - Implemented using a **Binary Min-Heap Priority Queue** (`std::priority_queue<std::pair<double, int>, ...>`) achieving $O((V + E) \log V)$ time complexity.
  - Supports **Dual Optimization Criteria**: Shortest Distance ($km$) vs Fastest Travel Time ($minutes$).
  - Predecessor parent mapping for $O(V)$ route reconstruction and turn-by-turn itinerary extraction.
- **Traveling Salesperson Problem (TSP) Multi-Stop Planner**:
  - Greedy nearest-neighbor heuristic that iteratively selects the closest unvisited stop via Dijkstra sub-paths, with an optional return-to-depot cycle.
- **Dynamic Graph Operations**:
  - **Dynamic Edge Toggling / Closures**: Simulate road closures in real time; the adjacency list dynamically reflects road blockages so Dijkstra immediately routes around closures.
  - **Dynamic Vertex Insertion**: Add new delivery hubs or customer stops on the fly with live coordinate positioning.
- **Zero Database Overhead**:
  - Operates purely in RAM with 0ms in-memory query latencies, completely eliminating external database dependencies.

---

## 2. Directory Structure

```
.
├── src/                        # C++14 ADS Engine & Embedded Server
│   ├── GraphADS.hpp            # Adjacency List, Dijkstra, TSP, Dynamic Graph Operations
│   ├── HttpServer.hpp          # Multithreaded Winsock HTTP Server & REST API Router
│   ├── JsonHelper.hpp          # Zero-dependency JSON serializer & extractor
│   └── main.cpp                # CLI interface, interactive controller & browser launcher
│
├── public/                     # Modern Tailwind CSS v3 Web Frontend
│   ├── index.html              # Interactive canvas map, controls HUD & ADS modals
│   ├── style.css               # Animations, glassmorphism overlays & custom scrollbars
│   └── app.js                  # Reactive client, Dijkstra visualizer, animated truck HUD
│
├── web/                        # Mirrored Web Assets
├── run.ps1                     # 1-Click launcher for Windows PowerShell (C++ build & run)
├── run.bat                     # 1-Click launcher for Windows Command Prompt
├── routeflow.exe               # Compiled native Windows executable (MinGW C++14)
├── vercel.json                 # Vercel serverless deployment config
└── package.json                # Project manifest & metadata
```

---

## 3. How to Run Locally

### Requirements
- **GCC / G++ 6.0+** (e.g. MinGW GCC, already installed at `C:\MinGW\bin\g++.exe`)
- Modern web browser (Chrome, Edge, Firefox)

### Option A: Windows PowerShell (Recommended)
```powershell
.\run.ps1
```

### Option B: Windows Command Prompt / Double-Click
```bat
run.bat
```

### Option C: Manual G++ Compilation & Run
```bash
# 1. Compile C++ ADS engine
g++ -std=c++14 -O2 src/main.cpp -o routeflow.exe -lws2_32

# 2. Run RouteFlow
.\routeflow.exe
```

Once launched, RouteFlow automatically opens your default browser at:
👉 **`http://localhost:8080`**

---

## 4. REST APIs Provided by the C++ Engine

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/network` | Returns full graph state (criterion, 18 locations, 40 roads, closed count). |
| `POST` | `/api/criterion` | Switches optimization mode between `DISTANCE` and `TIME`. |
| `POST` | `/api/route` | Computes Dijkstra shortest path between source and destination. |
| `POST` | `/api/plan` | Computes greedy TSP multi-stop delivery plan. |
| `POST` | `/api/roads/toggle` | Toggles road active status (dynamically blocks or reopens an edge). |
| `POST` | `/api/locations` | Dynamically adds a new vertex/location into the graph. |
| `POST` | `/api/locations/coords` | Updates node $(X, Y)$ coordinates for drag-and-drop on the canvas. |
| `POST` | `/api/roads` | Inserts or updates an edge between two locations. |
| `POST` | `/api/sample-data` | Resets the graph to the default 18 locations & 40 roads. |
| `POST` | `/api/trips` | Records a trip in the in-memory ADS log. |
| `GET` | `/api/trips` | Retrieves in-memory trip records. |
| `GET` | `/api/ads/info` | Live ADS metrics ($|V|$, $|E|$, $|E_{active}|$, density, average degree, complexity). |

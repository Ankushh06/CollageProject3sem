#ifndef GRAPH_ADS_HPP
#define GRAPH_ADS_HPP

#include <iostream>
#include <string>
#include <vector>
#include <unordered_map>
#include <queue>
#include <algorithm>
#include <sstream>
#include <iomanip>
#include <cmath>
#include <chrono>
#include <windows.h>
#include "JsonHelper.hpp"

namespace ADS {

const double INF_COST = 1e18;

struct Node {
    int id;
    std::string name;
    std::string type; // "WAREHOUSE", "CUSTOMER", "LANDMARK"
    double x;
    double y;
};

struct Edge {
    int to;
    double km;
    double min;
    int roadId;
    bool isActive;
};

struct RoadInfo {
    int roadId;
    std::string locA;
    std::string locB;
    double distanceKm;
    double travelTimeMin;
    bool isActive;
};

struct Leg {
    std::string from;
    std::string to;
    double km;
    double min;
};

struct DijkstraResult {
    bool valid;
    std::string depot;
    std::string destination;
    double km;
    double minutes;
    std::vector<int> fullRoute;
    std::vector<std::string> routeNames;
    std::string routeText;
    std::vector<Leg> legs;
};

struct TripPlan {
    bool valid;
    std::string error;
    std::string depot;
    std::vector<std::string> order;
    double km;
    double minutes;
    std::vector<int> fullRoute;
    std::vector<std::string> routeNames;
    std::string routeText;
    std::vector<Leg> legs;
};

struct TripRecord {
    int id;
    std::string createdAt;
    std::string depot;
    std::string driver;
    std::string vehicle;
    std::string criterion;
    int stops;
    double km;
    double min;
    std::string routeText;
};

struct AuditRecord {
    int id;
    std::string changedAt;
    int roadId;
    std::string action;
    std::string details;
};

struct Driver {
    int id;
    std::string name;
    std::string phone;
};

struct Vehicle {
    int id;
    std::string regNo;
    std::string type;
    double capacityKg;
};

class GraphADS {
private:
    CRITICAL_SECTION cs;
    std::string criterion; // "DISTANCE" or "TIME"
    std::vector<Node> locations;
    std::unordered_map<std::string, int> nameToId;
    std::vector<RoadInfo> roads;
    std::vector<std::vector<Edge>> adj; // Adjacency list

    std::vector<TripRecord> trips;
    std::vector<AuditRecord> audit;
    std::vector<Driver> drivers;
    std::vector<Vehicle> vehicles;

    std::string toLower(const std::string& s) const {
        std::string res = s;
        std::transform(res.begin(), res.end(), res.begin(), ::tolower);
        return res;
    }

    std::string currentTimestamp() const {
        SYSTEMTIME st;
        GetLocalTime(&st);
        char buf[32];
        sprintf(buf, "%04d-%02d-%02d %02d:%02d:%02d",
                st.wYear, st.wMonth, st.wDay, st.wHour, st.wMinute, st.wSecond);
        return std::string(buf);
    }

public:
    static std::string trimString(const std::string& str) {
        size_t first = str.find_first_not_of(" \t\r\n");
        if (first == std::string::npos) return "";
        size_t last = str.find_last_not_of(" \t\r\n");
        return str.substr(first, (last - first + 1));
    }
    GraphADS() : criterion("DISTANCE") {
        InitializeCriticalSection(&cs);
        resetSample();
    }

    ~GraphADS() {
        DeleteCriticalSection(&cs);
    }

    void lock() { EnterCriticalSection(&cs); }
    void unlock() { LeaveCriticalSection(&cs); }

    void rebuildAdjacencyList() {
        adj.assign(locations.size(), std::vector<Edge>());
        for (const auto& r : roads) {
            if (!r.isActive) continue;
            auto itA = nameToId.find(toLower(r.locA));
            auto itB = nameToId.find(toLower(r.locB));
            if (itA == nameToId.end() || itB == nameToId.end()) continue;
            int u = itA->second;
            int v = itB->second;

            adj[u].push_back({v, r.distanceKm, r.travelTimeMin, r.roadId, r.isActive});
            adj[v].push_back({u, r.distanceKm, r.travelTimeMin, r.roadId, r.isActive});
        }
    }

    void resetSample() {
        locations.clear();
        nameToId.clear();
        roads.clear();
        adj.clear();
        trips.clear();
        audit.clear();
        drivers.clear();
        vehicles.clear();
        criterion = "DISTANCE";

        // 18 Locations
        struct InitLoc { const char* name; const char* type; double x, y; };
        const InitLoc initLocs[] = {
            {"Warehouse", "WAREHOUSE", 160, 240},
            {"Market", "CUSTOMER", 340, 200},
            {"Hospital", "CUSTOMER", 310, 80},
            {"University", "CUSTOMER", 490, 80},
            {"Railway Station", "LANDMARK", 320, 390},
            {"Mall", "CUSTOMER", 570, 210},
            {"Airport", "LANDMARK", 760, 130},
            {"Bus Stand", "LANDMARK", 150, 380},
            {"Old City", "CUSTOMER", 230, 460},
            {"Tech Park", "CUSTOMER", 680, 260},
            {"Cargo Hub", "WAREHOUSE", 130, 90},
            {"City Center", "CUSTOMER", 430, 270},
            {"Financial District", "CUSTOMER", 500, 370},
            {"Port Terminal", "LANDMARK", 840, 230},
            {"Industrial Estate", "WAREHOUSE", 660, 430},
            {"Sports Complex", "LANDMARK", 390, 490},
            {"Metro Station", "LANDMARK", 220, 310},
            {"Eco Park", "CUSTOMER", 790, 370}
        };

        for (int i = 0; i < 18; ++i) {
            Node n = { i, initLocs[i].name, initLocs[i].type, initLocs[i].x, initLocs[i].y };
            locations.push_back(n);
            nameToId[toLower(n.name)] = i;
        }

        // 40 Roads
        struct InitRoad { const char* a; const char* b; double km, min; };
        const InitRoad initRoads[] = {
            {"Warehouse", "Market", 4.0, 12.0},
            {"Warehouse", "Hospital", 7.0, 14.0},
            {"Warehouse", "Bus Stand", 3.0, 10.0},
            {"Market", "Hospital", 2.0, 8.0},
            {"Market", "Old City", 5.0, 20.0},
            {"Market", "Mall", 6.0, 15.0},
            {"Hospital", "University", 4.0, 9.0},
            {"Hospital", "Railway Station", 8.0, 22.0},
            {"University", "Tech Park", 5.0, 11.0},
            {"University", "Mall", 3.0, 10.0},
            {"Railway Station", "Old City", 3.0, 12.0},
            {"Railway Station", "Bus Stand", 6.0, 18.0},
            {"Mall", "Tech Park", 4.0, 9.0},
            {"Mall", "Airport", 11.0, 25.0},
            {"Tech Park", "Airport", 9.0, 16.0},
            {"Bus Stand", "Old City", 5.0, 15.0},
            {"Cargo Hub", "Warehouse", 3.5, 8.0},
            {"Cargo Hub", "Hospital", 4.5, 11.0},
            {"Metro Station", "Warehouse", 2.5, 7.0},
            {"Metro Station", "Market", 3.0, 8.0},
            {"Metro Station", "Bus Stand", 2.0, 6.0},
            {"Metro Station", "Railway Station", 3.5, 9.0},
            {"City Center", "Market", 2.5, 7.0},
            {"City Center", "Mall", 3.0, 8.0},
            {"City Center", "Railway Station", 3.5, 10.0},
            {"City Center", "University", 4.0, 10.0},
            {"Financial District", "City Center", 2.0, 6.0},
            {"Financial District", "Railway Station", 4.0, 11.0},
            {"Financial District", "Mall", 4.5, 12.0},
            {"Financial District", "Industrial Estate", 4.0, 10.0},
            {"Sports Complex", "Railway Station", 3.0, 8.0},
            {"Sports Complex", "Old City", 3.5, 10.0},
            {"Sports Complex", "Financial District", 3.5, 9.0},
            {"Industrial Estate", "Tech Park", 4.5, 12.0},
            {"Industrial Estate", "Eco Park", 3.5, 9.0},
            {"Industrial Estate", "Sports Complex", 6.0, 16.0},
            {"Port Terminal", "Airport", 5.0, 10.0},
            {"Port Terminal", "Tech Park", 4.0, 9.0},
            {"Port Terminal", "Eco Park", 4.5, 11.0},
            {"Eco Park", "Tech Park", 5.0, 12.0}
        };

        for (int i = 0; i < 40; ++i) {
            roads.push_back({ i + 1, initRoads[i].a, initRoads[i].b, initRoads[i].km, initRoads[i].min, true });
        }

        rebuildAdjacencyList();

        // Sample drivers & vehicles
        drivers.push_back({1, "Ravi Kumar", "9876500001"});
        drivers.push_back({2, "Amit Singh", "9876500002"});
        drivers.push_back({3, "Neha Sharma", "9876500003"});

        vehicles.push_back({1, "PB-01-AA-1001", "VAN", 800});
        vehicles.push_back({2, "PB-01-AA-1002", "BIKE", 40});
        vehicles.push_back({3, "PB-01-AA-1003", "TRUCK", 3000});
    }

    std::string getCriterion() const { return criterion; }
    void setCriterion(const std::string& c) { criterion = (c == "TIME") ? "TIME" : "DISTANCE"; }

    int findLocationId(const std::string& name) const {
        auto it = nameToId.find(toLower(trimString(name)));
        return (it != nameToId.end()) ? it->second : -1;
    }

    // Dijkstra's Algorithm: O((V + E) log V) via Binary Min-Heap Priority Queue
    DijkstraResult dijkstra(const std::string& srcName, const std::string& dstName, const std::string& crit = "") const {
        DijkstraResult res;
        res.valid = false;
        res.depot = srcName;
        res.destination = dstName;
        res.km = 0;
        res.minutes = 0;

        int s = findLocationId(srcName);
        int d = findLocationId(dstName);
        if (s == -1 || d == -1) return res;

        bool useTime = (crit.empty() ? criterion : crit) == "TIME";
        int n = locations.size();

        std::vector<double> dist(n, INF_COST);
        std::vector<int> parent(n, -1);
        std::vector<std::pair<double, double>> legWeight(n, {0.0, 0.0}); // km, min

        // Min-heap priority queue: pair<cost, node_id>
        typedef std::pair<double, int> HeapElem;
        std::priority_queue<HeapElem, std::vector<HeapElem>, std::greater<HeapElem>> pq;

        dist[s] = 0.0;
        pq.push({0.0, s});

        while (!pq.empty()) {
            auto top = pq.top();
            pq.pop();
            double dCost = top.first;
            int u = top.second;

            if (dCost > dist[u]) continue;
            if (u == d) break;

            for (const auto& edge : adj[u]) {
                if (!edge.isActive) continue;
                double weight = useTime ? edge.min : edge.km;
                double nextCost = dCost + weight;
                if (nextCost < dist[edge.to]) {
                    dist[edge.to] = nextCost;
                    parent[edge.to] = u;
                    legWeight[edge.to] = {edge.km, edge.min};
                    pq.push({nextCost, edge.to});
                }
            }
        }

        if (dist[d] >= INF_COST / 2.0) {
            return res; // No route exists
        }

        // Path reconstruction
        std::vector<int> path;
        int cur = d;
        while (cur != -1) {
            path.push_back(cur);
            cur = parent[cur];
        }
        std::reverse(path.begin(), path.end());

        res.valid = true;
        res.fullRoute = path;
        double totalKm = 0.0;
        double totalMin = 0.0;

        for (size_t i = 0; i < path.size(); ++i) {
            res.routeNames.push_back(locations[path[i]].name);
            if (i > 0) {
                int toNode = path[i];
                int fromNode = path[i - 1];
                double lKm = legWeight[toNode].first;
                double lMin = legWeight[toNode].second;
                totalKm += lKm;
                totalMin += lMin;
                res.legs.push_back({locations[fromNode].name, locations[toNode].name, lKm, lMin});
            }
        }

        res.km = totalKm;
        res.minutes = totalMin;

        std::ostringstream txt;
        for (size_t i = 0; i < res.routeNames.size(); ++i) {
            if (i > 0) txt << " -> ";
            txt << res.routeNames[i];
        }
        res.routeText = txt.str();

        return res;
    }

    // TSP Planner: Greedy Nearest-Neighbor with Dijkstra subpaths
    TripPlan planTSP(const std::string& depotName, const std::vector<std::string>& rawStops, bool returnToDepot, const std::string& crit = "") const {
        TripPlan plan;
        plan.valid = false;
        plan.depot = depotName;
        plan.km = 0;
        plan.minutes = 0;

        int depotId = findLocationId(depotName);
        if (depotId == -1) {
            plan.error = "Depot location not found";
            return plan;
        }

        // Filter and deduplicate stops
        std::vector<std::string> unvisited;
        for (const auto& s : rawStops) {
            if (findLocationId(s) != -1 && toLower(s) != toLower(depotName)) {
                if (std::find(unvisited.begin(), unvisited.end(), s) == unvisited.end()) {
                    unvisited.push_back(s);
                }
            }
        }

        if (unvisited.empty()) {
            plan.error = "No valid delivery stops provided";
            return plan;
        }

        std::string current = depotName;
        plan.fullRoute.push_back(depotId);
        plan.routeNames.push_back(depotName);

        bool useTime = (crit.empty() ? criterion : crit) == "TIME";

        while (!unvisited.empty()) {
            int nearestIdx = -1;
            DijkstraResult bestSub;
            double minCost = INF_COST;

            for (size_t i = 0; i < unvisited.size(); ++i) {
                DijkstraResult sub = dijkstra(current, unvisited[i], crit);
                if (sub.valid) {
                    double cost = useTime ? sub.minutes : sub.km;
                    if (cost < minCost) {
                        minCost = cost;
                        nearestIdx = i;
                        bestSub = sub;
                    }
                }
            }

            if (nearestIdx == -1 || !bestSub.valid) {
                plan.error = "Could not reach remaining stops from " + current;
                return plan;
            }

            std::string nextStop = unvisited[nearestIdx];
            unvisited.erase(unvisited.begin() + nearestIdx);
            plan.order.push_back(nextStop);

            // Append intermediate nodes
            for (size_t i = 1; i < bestSub.fullRoute.size(); ++i) {
                plan.fullRoute.push_back(bestSub.fullRoute[i]);
                plan.routeNames.push_back(bestSub.routeNames[i]);
            }
            plan.km += bestSub.km;
            plan.minutes += bestSub.minutes;
            for (const auto& leg : bestSub.legs) {
                plan.legs.push_back(leg);
            }
            current = nextStop;
        }

        if (returnToDepot) {
            DijkstraResult retSub = dijkstra(current, depotName, crit);
            if (retSub.valid) {
                for (size_t i = 1; i < retSub.fullRoute.size(); ++i) {
                    plan.fullRoute.push_back(retSub.fullRoute[i]);
                    plan.routeNames.push_back(retSub.routeNames[i]);
                }
                plan.km += retSub.km;
                plan.minutes += retSub.minutes;
                for (const auto& leg : retSub.legs) {
                    plan.legs.push_back(leg);
                }
                plan.order.push_back(depotName);
            }
        }

        plan.valid = true;
        std::ostringstream txt;
        for (size_t i = 0; i < plan.routeNames.size(); ++i) {
            if (i > 0) txt << " -> ";
            txt << plan.routeNames[i];
        }
        plan.routeText = txt.str();

        return plan;
    }

    bool addLocation(const std::string& name, const std::string& type, double x, double y, Node& outNode) {
        if (name.empty()) return false;
        if (findLocationId(name) != -1) return false;

        int newId = locations.size();
        if (x <= 0 || y <= 0) {
            // Default spacing layout
            x = 200 + (newId * 73) % 650;
            y = 120 + (newId * 91) % 450;
        }

        std::string locType = type.empty() ? "CUSTOMER" : type;
        std::transform(locType.begin(), locType.end(), locType.begin(), ::toupper);

        Node n = { newId, name, locType, x, y };
        locations.push_back(n);
        nameToId[toLower(name)] = newId;
        adj.push_back(std::vector<Edge>());
        outNode = n;
        return true;
    }

    bool updateLocationCoords(int id, double x, double y) {
        if (id < 0 || id >= static_cast<int>(locations.size())) return false;
        locations[id].x = x;
        locations[id].y = y;
        return true;
    }

    bool upsertRoad(const std::string& from, const std::string& to, double dist, double time) {
        if (from.empty() || to.empty() || toLower(from) == toLower(to) || dist <= 0 || time <= 0) return false;
        if (findLocationId(from) == -1 || findLocationId(to) == -1) return false;

        bool updated = false;
        int targetRoadId = -1;
        for (auto& r : roads) {
            if ((toLower(r.locA) == toLower(from) && toLower(r.locB) == toLower(to)) ||
                (toLower(r.locB) == toLower(from) && toLower(r.locA) == toLower(to))) {
                r.distanceKm = dist;
                r.travelTimeMin = time;
                r.isActive = true;
                targetRoadId = r.roadId;
                updated = true;
                break;
            }
        }

        if (!updated) {
            targetRoadId = roads.size() + 1;
            roads.push_back({ targetRoadId, from, to, dist, time, true });
        }

        rebuildAdjacencyList();

        std::ostringstream det;
        det << from << " <-> " << to << " (" << std::fixed << std::setprecision(1) << dist << " km, " << time << " min)";
        audit.insert(audit.begin(), { static_cast<int>(audit.size() + 1), currentTimestamp(), targetRoadId, updated ? "UPDATED" : "ADDED", det.str() });
        return true;
    }

    bool toggleRoad(const std::string& from, const std::string& to, bool active) {
        std::string tf = toLower(trimString(from));
        std::string tt = toLower(trimString(to));
        for (auto& r : roads) {
            if ((toLower(r.locA) == tf && toLower(r.locB) == tt) ||
                (toLower(r.locB) == tf && toLower(r.locA) == tt)) {
                r.isActive = active;
                rebuildAdjacencyList();
                std::string act = active ? "REOPENED" : "CLOSED";
                audit.insert(audit.begin(), { static_cast<int>(audit.size() + 1), currentTimestamp(), r.roadId, act, r.locA + " <-> " + r.locB });
                return true;
            }
        }
        return false;
    }

    bool toggleRoadById(int roadId, bool active) {
        for (auto& r : roads) {
            if (r.roadId == roadId) {
                r.isActive = active;
                rebuildAdjacencyList();
                std::string act = active ? "REOPENED" : "CLOSED";
                audit.insert(audit.begin(), { static_cast<int>(audit.size() + 1), currentTimestamp(), r.roadId, act, r.locA + " <-> " + r.locB });
                return true;
            }
        }
        return false;
    }

    int reopenAllRoads() {
        int count = 0;
        for (auto& r : roads) {
            if (!r.isActive) {
                r.isActive = true;
                count++;
            }
        }
        if (count > 0) {
            rebuildAdjacencyList();
            audit.insert(audit.begin(), { static_cast<int>(audit.size() + 1), currentTimestamp(), 0, "REOPENED_ALL", "All roads reopened" });
        }
        return count;
    }

    const std::vector<RoadInfo>& getRoads() const { return roads; }

    int saveTrip(const TripRecord& tr) {
        TripRecord rec = tr;
        rec.id = trips.size() + 1;
        if (rec.createdAt.empty()) rec.createdAt = currentTimestamp();
        trips.insert(trips.begin(), rec);
        return rec.id;
    }

    // JSON Responses for Web APIs
    std::string getNetworkJson() const {
        std::ostringstream ss;
        int closedCount = 0;
        for (const auto& r : roads) if (!r.isActive) closedCount++;

        ss << "{\n";
        ss << "  \"criterion\": \"" << criterion << "\",\n";
        ss << "  \"criterionName\": \"" << (criterion == "TIME" ? "Fastest TIME (min)" : "Shortest DISTANCE (km)") << "\",\n";
        ss << "  \"closedCount\": " << closedCount << ",\n";
        ss << "  \"dbEngine\": \"ADS C++14 ENGINE\",\n";
        ss << "  \"dbDetails\": \"In-Memory Graph ADS (Min-Heap Priority Queue & Adjacency List)\",\n";

        // locations array
        ss << "  \"locations\": [\n";
        for (size_t i = 0; i < locations.size(); ++i) {
            const auto& l = locations[i];
            ss << "    {\"id\": " << l.id << ", \"name\": \"" << JsonHelper::escape(l.name)
               << "\", \"type\": \"" << l.type << "\", \"x\": " << l.x << ", \"y\": " << l.y << "}";
            if (i + 1 < locations.size()) ss << ",";
            ss << "\n";
        }
        ss << "  ],\n";

        // roads array
        ss << "  \"roads\": [\n";
        for (size_t i = 0; i < roads.size(); ++i) {
            const auto& r = roads[i];
            ss << "    {\"roadId\": " << r.roadId << ", \"locA\": \"" << JsonHelper::escape(r.locA)
               << "\", \"locB\": \"" << JsonHelper::escape(r.locB)
               << "\", \"distanceKm\": " << r.distanceKm
               << ", \"travelTimeMin\": " << r.travelTimeMin
               << ", \"isActive\": " << (r.isActive ? "true" : "false") << "}";
            if (i + 1 < roads.size()) ss << ",";
            ss << "\n";
        }
        ss << "  ]\n";
        ss << "}";
        return ss.str();
    }

    std::string getAdsInfoJson() const {
        std::ostringstream ss;
        int vCount = locations.size();
        int eCount = roads.size();
        int activeE = 0;
        for (const auto& r : roads) if (r.isActive) activeE++;

        double density = (vCount > 1) ? (2.0 * activeE) / (vCount * (vCount - 1)) : 0.0;
        double avgDegree = (vCount > 0) ? (2.0 * activeE) / vCount : 0.0;

        ss << "{\n";
        ss << "  \"engine\": \"ADS C++14\",\n";
        ss << "  \"details\": \"In-Memory Graph ADS (Adjacency List + Binary Min-Heap Priority Queue)\",\n";
        ss << "  \"vertices\": " << vCount << ",\n";
        ss << "  \"edgesTotal\": " << eCount << ",\n";
        ss << "  \"edgesActive\": " << activeE << ",\n";
        ss << "  \"edgesClosed\": " << (eCount - activeE) << ",\n";
        ss << "  \"density\": " << std::fixed << std::setprecision(4) << density << ",\n";
        ss << "  \"averageDegree\": " << std::fixed << std::setprecision(2) << avgDegree << ",\n";
        ss << "  \"dijkstraComplexity\": \"O((V + E) log V)\",\n";
        ss << "  \"tspHeuristic\": \"Greedy Nearest-Neighbor approximation\"\n";
        ss << "}";
        return ss.str();
    }

    std::string dijkstraToJson(const DijkstraResult& res) const {
        if (!res.valid) {
            return "{\"valid\":false,\"error\":\"No open route exists between given locations\"}";
        }
        std::ostringstream ss;
        ss << "{\n";
        ss << "  \"valid\": true,\n";
        ss << "  \"depot\": \"" << JsonHelper::escape(res.depot) << "\",\n";
        ss << "  \"destination\": \"" << JsonHelper::escape(res.destination) << "\",\n";
        ss << "  \"km\": " << std::fixed << std::setprecision(2) << res.km << ",\n";
        ss << "  \"minutes\": " << std::fixed << std::setprecision(2) << res.minutes << ",\n";
        ss << "  \"routeText\": \"" << JsonHelper::escape(res.routeText) << "\",\n";

        ss << "  \"fullRoute\": [";
        for (size_t i = 0; i < res.fullRoute.size(); ++i) {
            ss << res.fullRoute[i];
            if (i + 1 < res.fullRoute.size()) ss << ", ";
        }
        ss << "],\n";

        ss << "  \"routeNames\": [";
        for (size_t i = 0; i < res.routeNames.size(); ++i) {
            ss << "\"" << JsonHelper::escape(res.routeNames[i]) << "\"";
            if (i + 1 < res.routeNames.size()) ss << ", ";
        }
        ss << "],\n";

        ss << "  \"legs\": [\n";
        for (size_t i = 0; i < res.legs.size(); ++i) {
            const auto& leg = res.legs[i];
            ss << "    {\"from\": \"" << JsonHelper::escape(leg.from) << "\", \"to\": \"" << JsonHelper::escape(leg.to)
               << "\", \"km\": " << leg.km << ", \"min\": " << leg.min << "}";
            if (i + 1 < res.legs.size()) ss << ",";
            ss << "\n";
        }
        ss << "  ]\n";
        ss << "}";
        return ss.str();
    }

    std::string tspToJson(const TripPlan& plan) const {
        if (!plan.valid) {
            return "{\"valid\":false,\"error\":\"" + JsonHelper::escape(plan.error) + "\"}";
        }
        std::ostringstream ss;
        ss << "{\n";
        ss << "  \"valid\": true,\n";
        ss << "  \"depot\": \"" << JsonHelper::escape(plan.depot) << "\",\n";
        ss << "  \"km\": " << std::fixed << std::setprecision(2) << plan.km << ",\n";
        ss << "  \"minutes\": " << std::fixed << std::setprecision(2) << plan.minutes << ",\n";
        ss << "  \"routeText\": \"" << JsonHelper::escape(plan.routeText) << "\",\n";

        ss << "  \"order\": [";
        for (size_t i = 0; i < plan.order.size(); ++i) {
            ss << "\"" << JsonHelper::escape(plan.order[i]) << "\"";
            if (i + 1 < plan.order.size()) ss << ", ";
        }
        ss << "],\n";

        ss << "  \"fullRoute\": [";
        for (size_t i = 0; i < plan.fullRoute.size(); ++i) {
            ss << plan.fullRoute[i];
            if (i + 1 < plan.fullRoute.size()) ss << ", ";
        }
        ss << "],\n";

        ss << "  \"routeNames\": [";
        for (size_t i = 0; i < plan.routeNames.size(); ++i) {
            ss << "\"" << JsonHelper::escape(plan.routeNames[i]) << "\"";
            if (i + 1 < plan.routeNames.size()) ss << ", ";
        }
        ss << "],\n";

        ss << "  \"legs\": [\n";
        for (size_t i = 0; i < plan.legs.size(); ++i) {
            const auto& leg = plan.legs[i];
            ss << "    {\"from\": \"" << JsonHelper::escape(leg.from) << "\", \"to\": \"" << JsonHelper::escape(leg.to)
               << "\", \"km\": " << leg.km << ", \"min\": " << leg.min << "}";
            if (i + 1 < plan.legs.size()) ss << ",";
            ss << "\n";
        }
        ss << "  ]\n";
        ss << "}";
        return ss.str();
    }

    std::string getTripsJson() const {
        std::ostringstream ss;
        ss << "[\n";
        for (size_t i = 0; i < trips.size(); ++i) {
            const auto& t = trips[i];
            ss << "  {\"id\": " << t.id << ", \"createdAt\": \"" << t.createdAt
               << "\", \"depot\": \"" << JsonHelper::escape(t.depot)
               << "\", \"driver\": \"" << JsonHelper::escape(t.driver)
               << "\", \"vehicle\": \"" << JsonHelper::escape(t.vehicle)
               << "\", \"criterion\": \"" << t.criterion
               << "\", \"stops\": " << t.stops
               << ", \"km\": " << t.km
               << ", \"min\": " << t.min
               << ", \"routeText\": \"" << JsonHelper::escape(t.routeText) << "\"}";
            if (i + 1 < trips.size()) ss << ",";
            ss << "\n";
        }
        ss << "]";
        return ss.str();
    }

    std::string getAuditJson() const {
        std::ostringstream ss;
        ss << "[\n";
        for (size_t i = 0; i < audit.size(); ++i) {
            const auto& a = audit[i];
            ss << "  {\"id\": " << a.id << ", \"changedAt\": \"" << a.changedAt
               << "\", \"roadId\": " << a.roadId
               << ", \"action\": \"" << a.action
               << "\", \"details\": \"" << JsonHelper::escape(a.details) << "\"}";
            if (i + 1 < audit.size()) ss << ",";
            ss << "\n";
        }
        ss << "]";
        return ss.str();
    }

    std::string getTopLocationsJson() const {
        std::unordered_map<std::string, int> visitCounts;
        for (const auto& t : trips) {
            std::stringstream ss(t.routeText);
            std::string segment;
            while (std::getline(ss, segment, '>')) {
                size_t dash = segment.find('-');
                if (dash != std::string::npos) segment.erase(dash, 1);
                std::string cleaned = JsonHelper::trim(segment);
                if (!cleaned.empty()) visitCounts[cleaned]++;
            }
        }

        struct LocStat { std::string name, type; int count; };
        std::vector<LocStat> stats;
        for (const auto& l : locations) {
            stats.push_back({l.name, l.type, visitCounts[l.name]});
        }
        std::sort(stats.begin(), stats.end(), [](const LocStat& a, const LocStat& b) {
            return a.count > b.count;
        });

        std::ostringstream ss;
        ss << "[\n";
        for (size_t i = 0; i < stats.size(); ++i) {
            ss << "  {\"location\": \"" << JsonHelper::escape(stats[i].name)
               << "\", \"type\": \"" << stats[i].type
               << "\", \"deliveries\": " << stats[i].count << "}";
            if (i + 1 < stats.size()) ss << ",";
            ss << "\n";
        }
        ss << "]";
        return ss.str();
    }

    std::string getDriversJson() const {
        std::ostringstream ss;
        ss << "[\n";
        for (size_t i = 0; i < drivers.size(); ++i) {
            ss << "  {\"id\": " << drivers[i].id << ", \"name\": \"" << JsonHelper::escape(drivers[i].name)
               << "\", \"phone\": \"" << drivers[i].phone << "\"}";
            if (i + 1 < drivers.size()) ss << ",";
            ss << "\n";
        }
        ss << "]";
        return ss.str();
    }

    std::string getVehiclesJson() const {
        std::ostringstream ss;
        ss << "[\n";
        for (size_t i = 0; i < vehicles.size(); ++i) {
            ss << "  {\"id\": " << vehicles[i].id << ", \"regNo\": \"" << vehicles[i].regNo
               << "\", \"type\": \"" << vehicles[i].type
               << "\", \"capacityKg\": " << vehicles[i].capacityKg << "}";
            if (i + 1 < vehicles.size()) ss << ",";
            ss << "\n";
        }
        ss << "]";
        return ss.str();
    }

    // CLI Network Summary
    void printCliNetwork() const {
        std::cout << "\n======================================================\n";
        std::cout << "  ROUTEFLOW ADS NETWORK GRAPH (Adjacency List)\n";
        std::cout << "  Total Vertices |V|: " << locations.size() << " | Total Edges |E|: " << roads.size() << "\n";
        std::cout << "  Current Criterion : " << (criterion == "TIME" ? "Fastest TIME (min)" : "Shortest DISTANCE (km)") << "\n";
        std::cout << "======================================================\n";
        for (size_t u = 0; u < locations.size(); ++u) {
            std::cout << " [" << std::setw(2) << u << "] " << locations[u].name
                      << " (" << locations[u].type << "):";
            if (adj[u].empty()) {
                std::cout << " (isolated)\n";
                continue;
            }
            std::cout << "\n";
            for (const auto& e : adj[u]) {
                std::cout << "       --> " << locations[e.to].name
                          << " [" << e.km << " km, " << e.min << " min]"
                          << (e.isActive ? "" : " (CLOSED)") << "\n";
            }
        }
        std::cout << "------------------------------------------------------\n";
    }

    size_t nodeCount() const { return locations.size(); }
    size_t roadCount() const { return roads.size(); }
};

} // namespace ADS

#endif // GRAPH_ADS_HPP


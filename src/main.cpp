#include <iostream>
#include <string>
#include <vector>
#include <iomanip>
#include <windows.h>
#include <shellapi.h>
#include "GraphADS.hpp"
#include "HttpServer.hpp"

using namespace ADS;

void printBanner(int port, size_t vCount, size_t eCount) {
    std::cout << "\n============================================================\n";
    std::cout << "  ROUTEFLOW: Intelligent Delivery Route Optimization System\n";
    std::cout << "  Core Engine: C++14 Advanced Data Structures (ADS / DSA)\n";
    std::cout << "  Algorithms : Dijkstra's Min-Heap Shortest Path + TSP Planner\n";
    std::cout << "============================================================\n";
    std::cout << "  [ADS Graph] Initialized with |V| = " << vCount
              << " vertices, |E| = " << eCount << " edges\n";
    std::cout << "  [Localhost] Web Server running at: http://localhost:" << port << "\n";
    std::cout << "  [Browser]   Opening localhost UI in default browser...\n";
    std::cout << "============================================================\n\n";
}

void openBrowser(int port) {
    std::string url = "http://localhost:" + std::to_string(port);
    ShellExecuteA(NULL, "open", url.c_str(), NULL, NULL, SW_SHOWNORMAL);
}

void showMenu(const GraphADS& graph) {
    std::cout << "\n------------------------------------------------------------\n";
    std::cout << "  ROUTEFLOW ADS CLI & ENGINE CONTROLLER (Port " << 8080 << ")\n";
    std::cout << "  Mode: " << (graph.getCriterion() == "TIME" ? "Fastest TIME (min)" : "Shortest DISTANCE (km)") << "\n";
    std::cout << "------------------------------------------------------------\n";
    std::cout << "   1. Show Graph Network (Adjacency List & Degrees)\n";
    std::cout << "   2. Compute Shortest Route via Dijkstra (A -> B)\n";
    std::cout << "   3. Plan Multi-Stop TSP Delivery Tour\n";
    std::cout << "   4. Close a Road (Dynamic Edge Removal / Closure)\n";
    std::cout << "   5. Reopen a Road (Edge Restoration)\n";
    std::cout << "   6. Switch Optimization Criterion (Distance <-> Time)\n";
    std::cout << "   7. Show ADS Theoretical Complexity & Graph Metrics\n";
    std::cout << "   8. Reset Sample City Graph (18 Nodes, 40 Edges)\n";
    std::cout << "   9. Open Web UI in Browser (http://localhost:8080)\n";
    std::cout << "   0. Exit\n";
    std::cout << "------------------------------------------------------------\n";
    std::cout << "Enter choice: ";
}

int main(int argc, char* argv[]) {
    // Set console code page to UTF-8
    SetConsoleOutputCP(CP_UTF8);

    int port = 8080;
    bool serverOnly = false;
    bool noBrowser = false;

    for (int i = 1; i < argc; ++i) {
        std::string arg = argv[i];
        if (arg == "--server" || arg == "-s") {
            serverOnly = true;
        } else if (arg == "--no-browser") {
            noBrowser = true;
        } else if (arg.rfind("--port=", 0) == 0) {
            port = std::stoi(arg.substr(7));
        }
    }

    GraphADS graph;
    HttpServer server(port, &graph);

    if (!server.start()) {
        std::cerr << "Failed to start HTTP server on port " << port << std::endl;
        return 1;
    }

    printBanner(port, graph.nodeCount(), graph.roadCount());

    if (!noBrowser) {
        openBrowser(port);
    }

    if (serverOnly) {
        std::cout << "Running in headless server mode. Press Ctrl+C to terminate.\n";
        while (true) {
            Sleep(1000);
        }
        return 0;
    }

    int choice = -1;
    while (true) {
        showMenu(graph);
        if (!(std::cin >> choice)) {
            // EOF or pipe input
            std::cin.clear();
            std::string dummy;
            if (!(std::cin >> dummy)) {
                // Stdin closed, sleep to keep server alive
                while (true) Sleep(1000);
            }
            continue;
        }

        if (choice == 0) {
            std::cout << "Stopping RouteFlow server. Goodbye!\n";
            break;
        }

        switch (choice) {
            case 1: {
                graph.lock();
                graph.printCliNetwork();
                graph.unlock();
                break;
            }
            case 2: {
                std::string src, dst;
                std::cout << "  Enter Source Location: ";
                std::cin.ignore(10000, '\n');
                std::getline(std::cin, src);
                std::cout << "  Enter Destination Location: ";
                std::getline(std::cin, dst);

                src = ADS::GraphADS::trimString(src);
                dst = ADS::GraphADS::trimString(dst);

                graph.lock();
                DijkstraResult res = graph.dijkstra(src, dst);
                graph.unlock();

                std::cout << "\n  --- Dijkstra Shortest Route Result ---\n";
                if (res.valid) {
                    std::cout << "  Route      : " << res.routeText << "\n";
                    std::cout << "  Distance   : " << std::fixed << std::setprecision(1) << res.km << " km\n";
                    std::cout << "  Travel Time: " << std::fixed << std::setprecision(1) << res.minutes << " min\n";
                    std::cout << "  Legs count : " << res.legs.size() << "\n";
                } else {
                    std::cout << "  No open road path exists between '" << src << "' and '" << dst << "'.\n";
                }
                break;
            }
            case 3: {
                std::string depot;
                int stopCount = 0;
                std::cout << "  Enter Depot/Start Location (e.g. Warehouse): ";
                std::cin.ignore();
                std::getline(std::cin, depot);
                std::cout << "  How many stops to deliver to? ";
                std::cin >> stopCount;
                std::cin.ignore();

                std::vector<std::string> stops;
                for (int i = 0; i < stopCount; ++i) {
                    std::string st;
                    std::cout << "    Stop #" << (i + 1) << ": ";
                    std::getline(std::cin, st);
                    if (!st.empty()) stops.push_back(st);
                }

                char retChar;
                std::cout << "  Return to depot at the end? (y/n) [y]: ";
                std::cin >> retChar;
                bool returnDepot = (retChar == 'y' || retChar == 'Y');

                graph.lock();
                TripPlan plan = graph.planTSP(depot, stops, returnDepot);
                graph.unlock();

                std::cout << "\n  --- TSP Delivery Plan Result ---\n";
                if (plan.valid) {
                    std::cout << "  Delivery Order : ";
                    for (size_t i = 0; i < plan.order.size(); ++i) {
                        if (i > 0) std::cout << " => ";
                        std::cout << plan.order[i];
                    }
                    std::cout << "\n  Full Road Path : " << plan.routeText << "\n";
                    std::cout << "  Total Distance : " << std::fixed << std::setprecision(1) << plan.km << " km\n";
                    std::cout << "  Total Time     : " << std::fixed << std::setprecision(1) << plan.minutes << " min\n";
                } else {
                    std::cout << "  Could not compute TSP tour: " << plan.error << "\n";
                }
                break;
            }
            case 4: {
                std::cin.ignore(10000, '\n');
                std::cout << "  Close a road by Road ID (1-40) or Start Location Name: ";
                std::string inputA;
                std::getline(std::cin, inputA);
                inputA = ADS::GraphADS::trimString(inputA);

                graph.lock();
                bool ok = false;
                std::string roadDesc = "";
                bool isNumeric = !inputA.empty() && std::all_of(inputA.begin(), inputA.end(), ::isdigit);
                if (isNumeric) {
                    int rId = std::stoi(inputA);
                    ok = graph.toggleRoadById(rId, false);
                    roadDesc = "Road #" + std::to_string(rId);
                } else {
                    std::cout << "  To Location Name: ";
                    std::string inputB;
                    std::getline(std::cin, inputB);
                    inputB = ADS::GraphADS::trimString(inputB);
                    ok = graph.toggleRoad(inputA, inputB, false);
                    roadDesc = "'" + inputA + " <-> " + inputB + "'";
                }
                graph.unlock();

                if (ok) {
                    std::cout << "  >> Road " << roadDesc << " is now CLOSED (in-memory graph edge disabled).\n";
                } else {
                    std::cout << "  >> Road not found. Enter choice 1 to view all roads and IDs.\n";
                }
                break;
            }
            case 5: {
                std::cin.ignore(10000, '\n');
                std::cout << "  Reopen a road by Road ID (1-40) or Start Location Name: ";
                std::string inputA;
                std::getline(std::cin, inputA);
                inputA = ADS::GraphADS::trimString(inputA);

                graph.lock();
                bool ok = false;
                std::string roadDesc = "";
                bool isNumeric = !inputA.empty() && std::all_of(inputA.begin(), inputA.end(), ::isdigit);
                if (isNumeric) {
                    int rId = std::stoi(inputA);
                    ok = graph.toggleRoadById(rId, true);
                    roadDesc = "Road #" + std::to_string(rId);
                } else {
                    std::cout << "  To Location Name: ";
                    std::string inputB;
                    std::getline(std::cin, inputB);
                    inputB = ADS::GraphADS::trimString(inputB);
                    ok = graph.toggleRoad(inputA, inputB, true);
                    roadDesc = "'" + inputA + " <-> " + inputB + "'";
                }
                graph.unlock();

                if (ok) {
                    std::cout << "  >> Road " << roadDesc << " is now REOPENED (in-memory graph edge restored).\n";
                } else {
                    std::cout << "  >> Road not found. Enter choice 1 to view all roads and IDs.\n";
                }
                break;
            }
            case 6: {
                graph.lock();
                std::string cur = graph.getCriterion();
                std::string next = (cur == "DISTANCE") ? "TIME" : "DISTANCE";
                graph.setCriterion(next);
                graph.unlock();
                std::cout << "  Optimization criterion switched to: "
                          << (next == "TIME" ? "Fastest TIME (min)" : "Shortest DISTANCE (km)") << "\n";
                break;
            }
            case 7: {
                graph.lock();
                std::string info = graph.getAdsInfoJson();
                graph.unlock();
                std::cout << "\n  --- ADS Theoretical Analysis & Graph Metrics ---\n" << info << "\n";
                break;
            }
            case 8: {
                graph.lock();
                graph.resetSample();
                graph.unlock();
                std::cout << "  Sample city reloaded: 18 nodes, 40 roads.\n";
                break;
            }
            case 9: {
                openBrowser(port);
                std::cout << "  Launched browser to: http://localhost:" << port << "\n";
                break;
            }
            default:
                std::cout << "  Invalid choice. Please choose 0-9.\n";
                break;
        }
    }

    server.stop();
    return 0;
}


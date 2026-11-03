#ifndef HTTP_SERVER_HPP
#define HTTP_SERVER_HPP

#include <iostream>
#include <string>
#include <vector>
#include <fstream>
#include <sstream>
#include <windows.h>
#include <winsock2.h>
#include "GraphADS.hpp"
#include "JsonHelper.hpp"

namespace ADS {

struct ClientContext {
    SOCKET clientSock;
    GraphADS* graph;
};

class HttpServer {
private:
    int port;
    GraphADS* graph;
    SOCKET listenSocket;
    HANDLE serverThread;
    bool running;

    static std::string getMimeType(const std::string& path) {
        if (path.rfind(".html") != std::string::npos || path.rfind(".htm") != std::string::npos)
            return "text/html; charset=utf-8";
        if (path.rfind(".css") != std::string::npos)
            return "text/css; charset=utf-8";
        if (path.rfind(".js") != std::string::npos)
            return "application/javascript; charset=utf-8";
        if (path.rfind(".json") != std::string::npos)
            return "application/json; charset=utf-8";
        if (path.rfind(".svg") != std::string::npos)
            return "image/svg+xml";
        if (path.rfind(".png") != std::string::npos)
            return "image/png";
        if (path.rfind(".ico") != std::string::npos)
            return "image/x-icon";
        return "application/octet-stream";
    }

    static bool readFileBytes(const std::string& filePath, std::string& outData) {
        std::ifstream file(filePath, std::ios::binary);
        if (!file.is_open()) return false;
        std::ostringstream ss;
        ss << file.rdbuf();
        outData = ss.str();
        return true;
    }

    static void sendResponse(SOCKET sock, int statusCode, const std::string& statusText,
                             const std::string& contentType, const std::string& body) {
        std::ostringstream resp;
        resp << "HTTP/1.1 " << statusCode << " " << statusText << "\r\n";
        resp << "Content-Type: " << contentType << "\r\n";
        resp << "Content-Length: " << body.size() << "\r\n";
        resp << "Access-Control-Allow-Origin: *\r\n";
        resp << "Access-Control-Allow-Methods: GET, POST, OPTIONS\r\n";
        resp << "Access-Control-Allow-Headers: Content-Type\r\n";
        resp << "Connection: close\r\n\r\n";
        resp << body;

        std::string fullResp = resp.str();
        int totalSent = 0;
        int toSend = fullResp.size();
        while (totalSent < toSend) {
            int sent = send(sock, fullResp.c_str() + totalSent, toSend - totalSent, 0);
            if (sent <= 0) break;
            totalSent += sent;
        }
    }

    static DWORD WINAPI handleClient(LPVOID lpParam) {
        ClientContext* ctx = static_cast<ClientContext*>(lpParam);
        SOCKET sock = ctx->clientSock;
        GraphADS* graph = ctx->graph;
        delete ctx;

        char buffer[16384];
        int bytesRead = recv(sock, buffer, sizeof(buffer) - 1, 0);
        if (bytesRead <= 0) {
            closesocket(sock);
            return 0;
        }
        buffer[bytesRead] = '\0';
        std::string request(buffer, bytesRead);

        // Parse Method and Path
        size_t firstLineEnd = request.find("\r\n");
        if (firstLineEnd == std::string::npos) {
            closesocket(sock);
            return 0;
        }

        std::string firstLine = request.substr(0, firstLineEnd);
        std::istringstream flss(firstLine);
        std::string method, fullPath, httpVer;
        flss >> method >> fullPath >> httpVer;

        if (method == "OPTIONS") {
            sendResponse(sock, 200, "OK", "text/plain", "");
            closesocket(sock);
            return 0;
        }

        // Separate query string
        std::string path = fullPath;
        std::string query = "";
        size_t qPos = fullPath.find('?');
        if (qPos != std::string::npos) {
            path = fullPath.substr(0, qPos);
            query = fullPath.substr(qPos + 1);
        }

        // Extract body
        std::string body = "";
        size_t headerEnd = request.find("\r\n\r\n");
        if (headerEnd != std::string::npos) {
            body = request.substr(headerEnd + 4);
        }

        // ====================================================================
        //  API ROUTING
        // ====================================================================
        if (path.find("/api/") == 0) {
            std::string endpoint = path.substr(5); // strip "/api/"
            if (!endpoint.empty() && endpoint.back() == '/') endpoint.pop_back();

            graph->lock();

            if (endpoint == "network") {
                std::string res = graph->getNetworkJson();
                graph->unlock();
                sendResponse(sock, 200, "OK", "application/json", res);
            }
            else if (endpoint == "criterion") {
                if (method == "POST") {
                    std::string crit = JsonHelper::extractString(body, "criterion", "DISTANCE");
                    graph->setCriterion(crit);
                }
                std::string crit = graph->getCriterion();
                std::string critName = (crit == "TIME") ? "Fastest TIME (min)" : "Shortest DISTANCE (km)";
                graph->unlock();
                std::string res = "{\"criterion\":\"" + crit + "\",\"criterionName\":\"" + critName + "\"}";
                sendResponse(sock, 200, "OK", "application/json", res);
            }
            else if (endpoint == "route") {
                std::string src = JsonHelper::extractString(body, "source");
                std::string dst = JsonHelper::extractString(body, "destination");
                std::string crit = JsonHelper::extractString(body, "criterion");
                DijkstraResult dr = graph->dijkstra(src, dst, crit);
                std::string res = graph->dijkstraToJson(dr);
                graph->unlock();
                int code = dr.valid ? 200 : 400;
                sendResponse(sock, code, (code == 200 ? "OK" : "Bad Request"), "application/json", res);
            }
            else if (endpoint == "plan") {
                std::string depot = JsonHelper::extractString(body, "depot", "Warehouse");
                std::vector<std::string> stops = JsonHelper::extractStringArray(body, "stops");
                bool returnBack = JsonHelper::extractBool(body, "returnToDepot", true);
                std::string crit = JsonHelper::extractString(body, "criterion");
                TripPlan plan = graph->planTSP(depot, stops, returnBack, crit);
                std::string res = graph->tspToJson(plan);
                graph->unlock();
                int code = plan.valid ? 200 : 400;
                sendResponse(sock, code, (code == 200 ? "OK" : "Bad Request"), "application/json", res);
            }
            else if (endpoint == "locations") {
                if (method == "POST") {
                    std::string name = JsonHelper::extractString(body, "name");
                    std::string type = JsonHelper::extractString(body, "type", "CUSTOMER");
                    Node newNode;
                    bool ok = graph->addLocation(name, type, 0, 0, newNode);
                    graph->unlock();
                    if (ok) {
                        std::ostringstream ss;
                        ss << "{\"success\":true,\"location\":{\"id\":" << newNode.id
                           << ",\"name\":\"" << JsonHelper::escape(newNode.name)
                           << "\",\"type\":\"" << newNode.type
                           << "\",\"x\":" << newNode.x << ",\"y\":" << newNode.y << "}}";
                        sendResponse(sock, 200, "OK", "application/json", ss.str());
                    } else {
                        sendResponse(sock, 400, "Bad Request", "application/json", "{\"error\":\"Location already exists or invalid\"}");
                    }
                } else {
                    std::string res = graph->getNetworkJson();
                    graph->unlock();
                    sendResponse(sock, 200, "OK", "application/json", res);
                }
            }
            else if (endpoint == "locations/coords") {
                if (method == "POST") {
                    int id = JsonHelper::extractInt(body, "id", -1);
                    double x = JsonHelper::extractDouble(body, "x", 0);
                    double y = JsonHelper::extractDouble(body, "y", 0);
                    bool ok = graph->updateLocationCoords(id, x, y);
                    graph->unlock();
                    if (ok) {
                        sendResponse(sock, 200, "OK", "application/json", "{\"success\":true}");
                    } else {
                        sendResponse(sock, 404, "Not Found", "application/json", "{\"error\":\"Location not found\"}");
                    }
                } else {
                    graph->unlock();
                    sendResponse(sock, 200, "OK", "application/json", "{\"success\":true}");
                }
            }
            else if (endpoint == "roads") {
                if (method == "POST") {
                    std::string from = JsonHelper::extractString(body, "from");
                    std::string to = JsonHelper::extractString(body, "to");
                    double dist = JsonHelper::extractDouble(body, "distance", 0);
                    double time = JsonHelper::extractDouble(body, "time", 0);
                    bool ok = graph->upsertRoad(from, to, dist, time);
                    graph->unlock();
                    if (ok) {
                        sendResponse(sock, 200, "OK", "application/json", "{\"success\":true}");
                    } else {
                        sendResponse(sock, 400, "Bad Request", "application/json", "{\"error\":\"Invalid road endpoints or cost\"}");
                    }
                } else {
                    std::string res = graph->getNetworkJson();
                    graph->unlock();
                    sendResponse(sock, 200, "OK", "application/json", res);
                }
            }
            else if (endpoint == "roads/toggle") {
                int roadId = JsonHelper::extractInt(body, "roadId", 0);
                std::string from = JsonHelper::extractString(body, "from");
                std::string to = JsonHelper::extractString(body, "to");
                bool active = JsonHelper::extractBool(body, "active", true);
                bool ok = false;
                if (roadId > 0) {
                    ok = graph->toggleRoadById(roadId, active);
                } else {
                    ok = graph->toggleRoad(from, to, active);
                }
                graph->unlock();
                if (ok) {
                    std::string res = "{\"success\":true,\"active\":" + std::string(active ? "true" : "false") + "}";
                    sendResponse(sock, 200, "OK", "application/json", res);
                } else {
                    sendResponse(sock, 404, "Not Found", "application/json", "{\"error\":\"Road not found\"}");
                }
            }
            else if (endpoint == "roads/reopen-all") {
                int count = graph->reopenAllRoads();
                graph->unlock();
                std::string res = "{\"success\":true,\"reopened\":" + std::to_string(count) + "}";
                sendResponse(sock, 200, "OK", "application/json", res);
            }
            else if (endpoint == "sample-data") {
                graph->resetSample();
                graph->unlock();
                sendResponse(sock, 200, "OK", "application/json", "{\"success\":true,\"message\":\"Sample city graph reloaded\"}");
            }
            else if (endpoint == "trips") {
                if (method == "POST") {
                    TripRecord tr;
                    tr.depot = JsonHelper::extractString(body, "depot", "Warehouse");
                    tr.driver = JsonHelper::extractString(body, "driver", "Ravi Kumar");
                    tr.vehicle = JsonHelper::extractString(body, "vehicle", "PB-01-AA-1001");
                    tr.criterion = JsonHelper::extractString(body, "criterion", "DISTANCE");
                    tr.km = JsonHelper::extractDouble(body, "km", 0);
                    tr.min = JsonHelper::extractDouble(body, "minutes", 0);
                    tr.routeText = JsonHelper::extractString(body, "routeText");
                    tr.stops = JsonHelper::extractStringArray(body, "fullRoute").size();
                    if (tr.stops == 0) tr.stops = 2;
                    int id = graph->saveTrip(tr);
                    graph->unlock();
                    std::ostringstream ss;
                    ss << "{\"success\":true,\"tripId\":" << id << "}";
                    sendResponse(sock, 200, "OK", "application/json", ss.str());
                } else {
                    std::string res = graph->getTripsJson();
                    graph->unlock();
                    sendResponse(sock, 200, "OK", "application/json", res);
                }
            }
            else if (endpoint == "drivers") {
                std::string res = graph->getDriversJson();
                graph->unlock();
                sendResponse(sock, 200, "OK", "application/json", res);
            }
            else if (endpoint == "vehicles") {
                std::string res = graph->getVehiclesJson();
                graph->unlock();
                sendResponse(sock, 200, "OK", "application/json", res);
            }
            else if (endpoint == "reports/top-locations") {
                std::string res = graph->getTopLocationsJson();
                graph->unlock();
                sendResponse(sock, 200, "OK", "application/json", res);
            }
            else if (endpoint == "reports/audit") {
                std::string res = graph->getAuditJson();
                graph->unlock();
                sendResponse(sock, 200, "OK", "application/json", res);
            }
            else if (endpoint == "ads/info" || endpoint == "db/info") {
                std::string res = graph->getAdsInfoJson();
                graph->unlock();
                sendResponse(sock, 200, "OK", "application/json", res);
            }
            else {
                graph->unlock();
                sendResponse(sock, 404, "Not Found", "application/json", "{\"error\":\"Unknown API endpoint\"}");
            }
            closesocket(sock);
            return 0;
        }

        // ====================================================================
        //  STATIC FILE SERVING
        // ====================================================================
        std::string relPath = path;
        if (relPath == "/" || relPath.empty()) {
            relPath = "/index.html";
        }
        if (relPath.front() == '/') relPath = relPath.substr(1);

        // Search in public/, web/, and current directory
        const std::string searchDirs[] = {"public/", "web/", ""};
        std::string fileContent;
        bool found = false;
        std::string matchedPath = "";

        for (const auto& dir : searchDirs) {
            std::string candidate = dir + relPath;
            if (candidate.find("..") != std::string::npos) continue; // safety
            if (readFileBytes(candidate, fileContent)) {
                found = true;
                matchedPath = candidate;
                break;
            }
        }

        if (found) {
            sendResponse(sock, 200, "OK", getMimeType(matchedPath), fileContent);
        } else {
            sendResponse(sock, 404, "Not Found", "text/plain", "404 Not Found");
        }

        closesocket(sock);
        return 0;
    }

    static DWORD WINAPI serverLoop(LPVOID lpParam) {
        HttpServer* server = static_cast<HttpServer*>(lpParam);
        while (server->running) {
            sockaddr_in clientAddr;
            int clientLen = sizeof(clientAddr);
            SOCKET clientSock = accept(server->listenSocket, (sockaddr*)&clientAddr, &clientLen);
            if (clientSock == INVALID_SOCKET) {
                if (!server->running) break;
                continue;
            }

            ClientContext* ctx = new ClientContext{clientSock, server->graph};
            HANDLE th = CreateThread(NULL, 0, handleClient, ctx, 0, NULL);
            if (th) CloseHandle(th);
            else {
                closesocket(clientSock);
                delete ctx;
            }
        }
        return 0;
    }

public:
    HttpServer(int p, GraphADS* g) : port(p), graph(g), listenSocket(INVALID_SOCKET), serverThread(NULL), running(false) {}

    ~HttpServer() {
        stop();
    }

    bool start() {
        WSADATA wsa;
        if (WSAStartup(MAKEWORD(2, 2), &wsa) != 0) {
            std::cerr << "WSAStartup failed." << std::endl;
            return false;
        }

        listenSocket = socket(AF_INET, SOCK_STREAM, IPPROTO_TCP);
        if (listenSocket == INVALID_SOCKET) {
            std::cerr << "Could not create socket." << std::endl;
            WSACleanup();
            return false;
        }

        int opt = 1;
        setsockopt(listenSocket, SOL_SOCKET, SO_REUSEADDR, (const char*)&opt, sizeof(opt));

        sockaddr_in serverAddr;
        serverAddr.sin_family = AF_INET;
        serverAddr.sin_addr.s_addr = INADDR_ANY;
        serverAddr.sin_port = htons(port);

        if (bind(listenSocket, (sockaddr*)&serverAddr, sizeof(serverAddr)) == SOCKET_ERROR) {
            std::cerr << "Bind failed on port " << port << " (Error: " << WSAGetLastError() << ")" << std::endl;
            closesocket(listenSocket);
            WSACleanup();
            return false;
        }

        if (listen(listenSocket, SOMAXCONN) == SOCKET_ERROR) {
            std::cerr << "Listen failed." << std::endl;
            closesocket(listenSocket);
            WSACleanup();
            return false;
        }

        running = true;
        serverThread = CreateThread(NULL, 0, serverLoop, this, 0, NULL);
        return (serverThread != NULL);
    }

    void stop() {
        running = false;
        if (listenSocket != INVALID_SOCKET) {
            closesocket(listenSocket);
            listenSocket = INVALID_SOCKET;
        }
        if (serverThread != NULL) {
            WaitForSingleObject(serverThread, 1000);
            CloseHandle(serverThread);
            serverThread = NULL;
        }
        WSACleanup();
    }

    int getPort() const { return port; }
};

} // namespace ADS

#endif // HTTP_SERVER_HPP


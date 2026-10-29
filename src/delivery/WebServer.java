package delivery;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;

import java.io.*;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;
import java.util.concurrent.Executors;

/**
 * WebServer: Embedded HTTP server serving the HTML/CSS/JS frontend and REST APIs.
 */
public class WebServer {
    private final int port;
    private final DeliveryNetwork net;
    private final Database db;
    private final Path webRoot;
    private HttpServer server;

    public WebServer(int port, DeliveryNetwork net, Database db, String webDir) {
        this.port = port;
        this.net = net;
        this.db = db;
        this.webRoot = Paths.get(webDir).toAbsolutePath();
    }

    public void start() throws IOException {
        server = HttpServer.create(new InetSocketAddress(port), 0);
        server.setExecutor(Executors.newFixedThreadPool(8, r -> {
            Thread t = new Thread(r, "WebServerWorker");
            t.setDaemon(true);
            return t;
        }));

        // API Contexts
        server.createContext("/api/network", this::handleGetNetwork);
        server.createContext("/api/criterion", this::handleCriterion);
        server.createContext("/api/route", this::handleRoute);
        server.createContext("/api/plan", this::handlePlanDelivery);
        server.createContext("/api/locations", this::handleLocations);
        server.createContext("/api/locations/coords", this::handleLocationCoords);
        server.createContext("/api/roads", this::handleRoads);
        server.createContext("/api/roads/toggle", this::handleRoadToggle);
        server.createContext("/api/trips", this::handleTrips);
        server.createContext("/api/drivers", this::handleDrivers);
        server.createContext("/api/vehicles", this::handleVehicles);
        server.createContext("/api/reports/drivers", this::handleReportDrivers);
        server.createContext("/api/reports/top-locations", this::handleReportTopLocations);
        server.createContext("/api/reports/audit", this::handleReportAudit);
        server.createContext("/api/sample-data", this::handleSampleData);
        server.createContext("/api/db/info", this::handleDbInfo);

        // Static Files Context
        server.createContext("/", this::handleStatic);

        server.start();
        System.out.println("==============================================================");
        System.out.println("  ROUTEFLOW Delivery Route Optimization System is RUNNING!");
        System.out.println("  Web UI URL: http://localhost:" + port);
        System.out.println("==============================================================");
    }

    public void stop() {
        if (server != null) {
            server.stop(0);
        }
    }

    // ---- Static File Serving -------------------------------------------------
    private void handleStatic(HttpExchange exchange) throws IOException {
        String pathStr = exchange.getRequestURI().getPath();
        if (pathStr.equals("/") || pathStr.isEmpty()) pathStr = "/index.html";

        Path file = webRoot.resolve(pathStr.substring(1)).normalize();
        if (!file.startsWith(webRoot) || !Files.exists(file) || Files.isDirectory(file)) {
            sendResponse(exchange, 404, "text/plain", "404 Not Found");
            return;
        }

        String mime = "application/octet-stream";
        if (pathStr.endsWith(".html")) mime = "text/html; charset=UTF-8";
        else if (pathStr.endsWith(".css")) mime = "text/css; charset=UTF-8";
        else if (pathStr.endsWith(".js")) mime = "application/javascript; charset=UTF-8";
        else if (pathStr.endsWith(".json")) mime = "application/json; charset=UTF-8";
        else if (pathStr.endsWith(".svg")) mime = "image/svg+xml";
        else if (pathStr.endsWith(".png")) mime = "image/png";

        byte[] bytes = Files.readAllBytes(file);
        exchange.getResponseHeaders().set("Content-Type", mime);
        exchange.getResponseHeaders().set("Cache-Control", "no-cache");
        exchange.sendResponseHeaders(200, bytes.length);
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(bytes);
        }
    }

    // ---- APIs ----------------------------------------------------------------
    private void handleGetNetwork(HttpExchange exchange) throws IOException {
        if (!"GET".equalsIgnoreCase(exchange.getRequestMethod())) {
            sendResponse(exchange, 405, "application/json", "{\"error\":\"Method not allowed\"}");
            return;
        }

        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("criterion", net.getCriterion().getCode());
        resp.put("criterionName", net.criterionName());
        resp.put("locations", net.getLocationsJsonList());
        resp.put("roads", db.getAllRoadsList());
        resp.put("closedCount", db.closedRoadCount());
        resp.put("dbEngine", db.getActiveEngine());
        resp.put("dbDetails", db.getEngineDetails());

        sendJsonResponse(exchange, 200, resp);
    }

    private void handleCriterion(HttpExchange exchange) throws IOException {
        if ("POST".equalsIgnoreCase(exchange.getRequestMethod())) {
            String body = readBody(exchange);
            Map<String, Object> map = JsonUtils.parseObject(body);
            String crit = String.valueOf(map.get("criterion"));
            if ("TIME".equalsIgnoreCase(crit)) {
                net.setCriterion(Criterion.TIME);
            } else {
                net.setCriterion(Criterion.DISTANCE);
            }
        }
        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("criterion", net.getCriterion().getCode());
        resp.put("criterionName", net.criterionName());
        sendJsonResponse(exchange, 200, resp);
    }

    private void handleRoute(HttpExchange exchange) throws IOException {
        if (!"POST".equalsIgnoreCase(exchange.getRequestMethod())) {
            sendResponse(exchange, 405, "application/json", "{\"error\":\"Method not allowed\"}");
            return;
        }
        String body = readBody(exchange);
        Map<String, Object> map = JsonUtils.parseObject(body);
        String srcName = String.valueOf(map.get("source"));
        String dstName = String.valueOf(map.get("destination"));
        String crit = (String) map.get("criterion");

        if (crit != null) {
            net.setCriterion("TIME".equalsIgnoreCase(crit) ? Criterion.TIME : Criterion.DISTANCE);
        }

        int src = net.findId(srcName);
        int dst = net.findId(dstName);

        if (src == -1 || dst == -1) {
            sendJsonResponse(exchange, 400, Map.of("error", "Source or destination location not found"));
            return;
        }

        TripPlan plan = net.shortestRoute(src, dst);
        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("valid", plan.valid);
        resp.put("depot", net.nameOf(src));
        resp.put("destination", net.nameOf(dst));
        resp.put("km", plan.km);
        resp.put("minutes", plan.minutes);
        resp.put("fullRoute", plan.fullRoute);

        List<String> names = new ArrayList<>();
        for (int id : plan.fullRoute) names.add(net.nameOf(id));
        resp.put("routeNames", names);
        resp.put("routeText", net.pathToString(plan.fullRoute));

        List<Map<String, Object>> legs = new ArrayList<>();
        for (int i = 0; i + 1 < plan.fullRoute.size(); i++) {
            int u = plan.fullRoute.get(i);
            int v = plan.fullRoute.get(i + 1);
            for (Edge e : net.getNeighbors(u)) {
                if (e.to == v) {
                    Map<String, Object> leg = new LinkedHashMap<>();
                    leg.put("from", net.nameOf(u));
                    leg.put("to", net.nameOf(v));
                    leg.put("km", e.distance);
                    leg.put("min", e.time);
                    legs.add(leg);
                    break;
                }
            }
        }
        resp.put("legs", legs);

        sendJsonResponse(exchange, 200, resp);
    }

    private void handlePlanDelivery(HttpExchange exchange) throws IOException {
        if (!"POST".equalsIgnoreCase(exchange.getRequestMethod())) {
            sendResponse(exchange, 405, "application/json", "{\"error\":\"Method not allowed\"}");
            return;
        }
        String body = readBody(exchange);
        Map<String, Object> map = JsonUtils.parseObject(body);
        String depotName = String.valueOf(map.get("depot"));
        Object stopsObj = map.get("stops");
        boolean returnToDepot = Boolean.TRUE.equals(map.get("returnToDepot"));
        String crit = (String) map.get("criterion");

        if (crit != null) {
            net.setCriterion("TIME".equalsIgnoreCase(crit) ? Criterion.TIME : Criterion.DISTANCE);
        }

        int depot = net.findId(depotName);
        if (depot == -1) {
            sendJsonResponse(exchange, 400, Map.of("error", "Depot not found"));
            return;
        }

        List<Integer> stopIds = new ArrayList<>();
        if (stopsObj instanceof List) {
            for (Object item : (List<?>) stopsObj) {
                int id = net.findId(String.valueOf(item));
                if (id != -1 && id != depot && !stopIds.contains(id)) {
                    stopIds.add(id);
                }
            }
        }

        if (stopIds.isEmpty()) {
            sendJsonResponse(exchange, 400, Map.of("error", "No valid stops provided"));
            return;
        }

        TripPlan plan = net.planDelivery(depot, stopIds, returnToDepot);
        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("valid", plan.valid);
        resp.put("depot", net.nameOf(depot));
        resp.put("km", plan.km);
        resp.put("minutes", plan.minutes);
        resp.put("fullRoute", plan.fullRoute);

        List<String> orderNames = new ArrayList<>();
        for (int id : plan.order) orderNames.add(net.nameOf(id));
        resp.put("order", orderNames);

        List<String> routeNames = new ArrayList<>();
        for (int id : plan.fullRoute) routeNames.add(net.nameOf(id));
        resp.put("routeNames", routeNames);
        resp.put("routeText", net.pathToString(plan.fullRoute));

        List<Map<String, Object>> legs = new ArrayList<>();
        for (int i = 0; i + 1 < plan.fullRoute.size(); i++) {
            int u = plan.fullRoute.get(i);
            int v = plan.fullRoute.get(i + 1);
            for (Edge e : net.getNeighbors(u)) {
                if (e.to == v) {
                    Map<String, Object> leg = new LinkedHashMap<>();
                    leg.put("from", net.nameOf(u));
                    leg.put("to", net.nameOf(v));
                    leg.put("km", e.distance);
                    leg.put("min", e.time);
                    legs.add(leg);
                    break;
                }
            }
        }
        resp.put("legs", legs);

        sendJsonResponse(exchange, 200, resp);
    }

    private void handleLocations(HttpExchange exchange) throws IOException {
        if ("POST".equalsIgnoreCase(exchange.getRequestMethod())) {
            String body = readBody(exchange);
            Map<String, Object> map = JsonUtils.parseObject(body);
            String name = (String) map.get("name");
            String type = (String) map.get("type");
            double x = map.containsKey("x") ? ((Number) map.get("x")).doubleValue() : -1;
            double y = map.containsKey("y") ? ((Number) map.get("y")).doubleValue() : -1;

            if (name == null || name.trim().isEmpty()) {
                sendJsonResponse(exchange, 400, Map.of("error", "Location name is required"));
                return;
            }

            if (db.addLocation(name, type)) {
                int id = net.addLocation(name, type, x, y);
                sendJsonResponse(exchange, 200, Map.of("success", true, "id", id, "name", name, "type", type));
            } else {
                sendJsonResponse(exchange, 400, Map.of("error", "Location name already exists or invalid"));
            }
        } else {
            sendJsonResponse(exchange, 200, net.getLocationsJsonList());
        }
    }

    private void handleLocationCoords(HttpExchange exchange) throws IOException {
        if (!"POST".equalsIgnoreCase(exchange.getRequestMethod())) {
            sendResponse(exchange, 405, "application/json", "{\"error\":\"Method not allowed\"}");
            return;
        }
        String body = readBody(exchange);
        Map<String, Object> map = JsonUtils.parseObject(body);
        int id = map.containsKey("id") ? ((Number) map.get("id")).intValue() : -1;
        double x = map.containsKey("x") ? ((Number) map.get("x")).doubleValue() : -1;
        double y = map.containsKey("y") ? ((Number) map.get("y")).doubleValue() : -1;

        if (id >= 0 && x > 0 && y > 0) {
            net.setCoordinates(id, x, y);
            sendJsonResponse(exchange, 200, Map.of("success", true));
        } else {
            sendJsonResponse(exchange, 400, Map.of("error", "Invalid coordinates or id"));
        }
    }

    private void handleRoads(HttpExchange exchange) throws IOException {
        if ("POST".equalsIgnoreCase(exchange.getRequestMethod())) {
            String body = readBody(exchange);
            Map<String, Object> map = JsonUtils.parseObject(body);
            String from = (String) map.get("from");
            String to = (String) map.get("to");
            double km = map.containsKey("distance") ? ((Number) map.get("distance")).doubleValue() : -1;
            double min = map.containsKey("time") ? ((Number) map.get("time")).doubleValue() : -1;

            if (from == null || to == null || km <= 0 || min <= 0 || from.equalsIgnoreCase(to)) {
                sendJsonResponse(exchange, 400, Map.of("error", "Invalid road parameters"));
                return;
            }

            if (db.upsertRoad(from, to, km, min)) {
                int u = net.findId(from);
                int v = net.findId(to);
                if (u != -1 && v != -1) {
                    net.addRoad(u, v, km, min);
                }
                sendJsonResponse(exchange, 200, Map.of("success", true));
            } else {
                sendJsonResponse(exchange, 400, Map.of("error", "Could not save road in database"));
            }
        } else {
            sendJsonResponse(exchange, 200, db.getAllRoadsList());
        }
    }

    private void handleRoadToggle(HttpExchange exchange) throws IOException {
        if (!"POST".equalsIgnoreCase(exchange.getRequestMethod())) {
            sendResponse(exchange, 405, "application/json", "{\"error\":\"Method not allowed\"}");
            return;
        }
        String body = readBody(exchange);
        Map<String, Object> map = JsonUtils.parseObject(body);
        String from = (String) map.get("from");
        String to = (String) map.get("to");
        boolean active = Boolean.TRUE.equals(map.get("active"));

        if (db.setRoadActive(from, to, active)) {
            int u = net.findId(from);
            int v = net.findId(to);
            if (active) {
                // reload road from DB into net
                for (Map<String, Object> r : db.getAllRoadsList()) {
                    if (from.equalsIgnoreCase(String.valueOf(r.get("locA"))) &&
                        to.equalsIgnoreCase(String.valueOf(r.get("locB"))) ||
                        to.equalsIgnoreCase(String.valueOf(r.get("locA"))) &&
                        from.equalsIgnoreCase(String.valueOf(r.get("locB")))) {
                        net.addRoad(u, v, ((Number) r.get("distanceKm")).doubleValue(), ((Number) r.get("travelTimeMin")).doubleValue());
                        break;
                    }
                }
            } else {
                net.removeRoad(u, v);
            }
            sendJsonResponse(exchange, 200, Map.of("success", true, "active", active));
        } else {
            sendJsonResponse(exchange, 400, Map.of("error", "Could not update road state"));
        }
    }

    private void handleTrips(HttpExchange exchange) throws IOException {
        if ("POST".equalsIgnoreCase(exchange.getRequestMethod())) {
            String body = readBody(exchange);
            Map<String, Object> map = JsonUtils.parseObject(body);
            String depot = (String) map.get("depot");
            String criterion = (String) map.get("criterion");
            double km = map.containsKey("km") ? ((Number) map.get("km")).doubleValue() : 0;
            double min = map.containsKey("minutes") ? ((Number) map.get("minutes")).doubleValue() : 0;
            String routeText = (String) map.get("routeText");
            Integer driverId = map.containsKey("driverId") ? ((Number) map.get("driverId")).intValue() : null;
            Integer vehicleId = map.containsKey("vehicleId") ? ((Number) map.get("vehicleId")).intValue() : null;

            List<String> stops = new ArrayList<>();
            if (map.get("stops") instanceof List) {
                for (Object o : (List<?>) map.get("stops")) {
                    stops.add(String.valueOf(o));
                }
            }

            int tripId = db.saveTrip(depot, stops, criterion != null ? criterion : "DISTANCE",
                                     km, min, routeText, driverId, vehicleId);
            if (tripId > 0) {
                sendJsonResponse(exchange, 200, Map.of("success", true, "tripId", tripId));
            } else {
                sendJsonResponse(exchange, 400, Map.of("error", "Could not save trip"));
            }
        } else {
            sendJsonResponse(exchange, 200, db.getTripHistoryList());
        }
    }

    private void handleDrivers(HttpExchange exchange) throws IOException {
        if ("POST".equalsIgnoreCase(exchange.getRequestMethod())) {
            String body = readBody(exchange);
            Map<String, Object> map = JsonUtils.parseObject(body);
            String name = (String) map.get("name");
            String phone = (String) map.get("phone");
            if (name != null && phone != null && db.addDriver(name, phone)) {
                sendJsonResponse(exchange, 200, Map.of("success", true));
            } else {
                sendJsonResponse(exchange, 400, Map.of("error", "Could not add driver. Phone must be 7-15 digits and unique."));
            }
        } else {
            sendJsonResponse(exchange, 200, db.getDriversList());
        }
    }

    private void handleVehicles(HttpExchange exchange) throws IOException {
        if ("POST".equalsIgnoreCase(exchange.getRequestMethod())) {
            String body = readBody(exchange);
            Map<String, Object> map = JsonUtils.parseObject(body);
            String reg = (String) map.get("regNo");
            String type = (String) map.get("type");
            double cap = map.containsKey("capacity") ? ((Number) map.get("capacity")).doubleValue() : 0;
            if (reg != null && type != null && cap > 0 && db.addVehicle(reg, type, cap)) {
                sendJsonResponse(exchange, 200, Map.of("success", true));
            } else {
                sendJsonResponse(exchange, 400, Map.of("error", "Could not add vehicle. Registration must be unique."));
            }
        } else {
            sendJsonResponse(exchange, 200, db.getVehiclesList());
        }
    }

    private void handleReportDrivers(HttpExchange exchange) throws IOException {
        sendJsonResponse(exchange, 200, db.getDriverPerformanceList());
    }

    private void handleReportTopLocations(HttpExchange exchange) throws IOException {
        sendJsonResponse(exchange, 200, db.getTopLocationsList());
    }

    private void handleReportAudit(HttpExchange exchange) throws IOException {
        sendJsonResponse(exchange, 200, db.getRoadAuditLogList());
    }

    private void handleSampleData(HttpExchange exchange) throws IOException {
        if (!"POST".equalsIgnoreCase(exchange.getRequestMethod())) {
            sendResponse(exchange, 405, "application/json", "{\"error\":\"Method not allowed\"}");
            return;
        }
        SampleDataLoader.loadSampleData(db, net);
        sendJsonResponse(exchange, 200, Map.of("success", true, "message", "Sample city reloaded successfully"));
    }

    private void handleDbInfo(HttpExchange exchange) throws IOException {
        sendJsonResponse(exchange, 200, db.getEngineInfoMap());
    }

    // ---- Helpers -------------------------------------------------------------
    private String readBody(HttpExchange exchange) throws IOException {
        try (InputStream is = exchange.getRequestBody();
             ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            byte[] buf = new byte[1024];
            int n;
            while ((n = is.read(buf)) != -1) baos.write(buf, 0, n);
            return baos.toString(StandardCharsets.UTF_8);
        }
    }

    private void sendJsonResponse(HttpExchange exchange, int status, Object data) throws IOException {
        String json = JsonUtils.toJson(data);
        sendResponse(exchange, status, "application/json; charset=UTF-8", json);
    }

    private void sendResponse(HttpExchange exchange, int status, String contentType, String body) throws IOException {
        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", contentType);
        exchange.getResponseHeaders().set("Access-Control-Allow-Origin", "*");
        exchange.getResponseHeaders().set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        exchange.getResponseHeaders().set("Access-Control-Allow-Headers", "Content-Type");
        exchange.sendResponseHeaders(status, bytes.length);
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(bytes);
        }
    }
}

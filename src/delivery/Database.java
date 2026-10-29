package delivery;

import java.sql.*;
import java.util.*;

/**
 * Database: SQLite database layer [DBMS part]
 *
 * Manages persistent storage in delivery.db:
 * - Tables: locations, roads, drivers, vehicles, delivery_trips, trip_stops, road_audit
 * - Views: v_active_roads, v_trip_summary
 * - Triggers: trg_roads_insert, trg_roads_update (automatic audit log)
 * - Transactions: saveTrip (inserts trip + all stops atomically)
 */
public class Database implements AutoCloseable {
    private Connection conn = null;

    private static final String SCHEMA_SQL =
        "PRAGMA foreign_keys = ON;\n" +
        "CREATE TABLE IF NOT EXISTS locations (\n" +
        "    location_id  INTEGER PRIMARY KEY AUTOINCREMENT,\n" +
        "    name         TEXT    NOT NULL UNIQUE COLLATE NOCASE,\n" +
        "    loc_type     TEXT    NOT NULL DEFAULT 'CUSTOMER'\n" +
        "                 CHECK (loc_type IN ('WAREHOUSE', 'CUSTOMER', 'LANDMARK')),\n" +
        "    created_at   TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))\n" +
        ");\n" +
        "CREATE TABLE IF NOT EXISTS roads (\n" +
        "    road_id          INTEGER PRIMARY KEY AUTOINCREMENT,\n" +
        "    loc_a            INTEGER NOT NULL REFERENCES locations(location_id) ON DELETE CASCADE,\n" +
        "    loc_b            INTEGER NOT NULL REFERENCES locations(location_id) ON DELETE CASCADE,\n" +
        "    distance_km      REAL    NOT NULL CHECK (distance_km > 0),\n" +
        "    travel_time_min  REAL    NOT NULL CHECK (travel_time_min > 0),\n" +
        "    is_active        INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),\n" +
        "    CHECK (loc_a < loc_b),\n" +
        "    UNIQUE (loc_a, loc_b)\n" +
        ");\n" +
        "CREATE INDEX IF NOT EXISTS idx_roads_loc_b ON roads(loc_b);\n" +
        "CREATE TABLE IF NOT EXISTS drivers (\n" +
        "    driver_id  INTEGER PRIMARY KEY AUTOINCREMENT,\n" +
        "    name       TEXT NOT NULL,\n" +
        "    phone      TEXT NOT NULL UNIQUE CHECK (length(phone) BETWEEN 7 AND 15)\n" +
        ");\n" +
        "CREATE TABLE IF NOT EXISTS vehicles (\n" +
        "    vehicle_id    INTEGER PRIMARY KEY AUTOINCREMENT,\n" +
        "    reg_no        TEXT NOT NULL UNIQUE,\n" +
        "    vehicle_type  TEXT NOT NULL CHECK (vehicle_type IN ('BIKE', 'VAN', 'TRUCK')),\n" +
        "    capacity_kg   REAL NOT NULL CHECK (capacity_kg > 0)\n" +
        ");\n" +
        "CREATE TABLE IF NOT EXISTS delivery_trips (\n" +
        "    trip_id     INTEGER PRIMARY KEY AUTOINCREMENT,\n" +
        "    driver_id   INTEGER REFERENCES drivers(driver_id)   ON DELETE SET NULL,\n" +
        "    vehicle_id  INTEGER REFERENCES vehicles(vehicle_id) ON DELETE SET NULL,\n" +
        "    depot_id    INTEGER NOT NULL REFERENCES locations(location_id) ON DELETE RESTRICT,\n" +
        "    criterion   TEXT    NOT NULL CHECK (criterion IN ('DISTANCE', 'TIME')),\n" +
        "    total_km    REAL    NOT NULL CHECK (total_km  >= 0),\n" +
        "    total_min   REAL    NOT NULL CHECK (total_min >= 0),\n" +
        "    route_text  TEXT    NOT NULL,\n" +
        "    created_at  TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))\n" +
        ");\n" +
        "CREATE INDEX IF NOT EXISTS idx_trips_driver ON delivery_trips(driver_id);\n" +
        "CREATE TABLE IF NOT EXISTS trip_stops (\n" +
        "    trip_id      INTEGER NOT NULL REFERENCES delivery_trips(trip_id) ON DELETE CASCADE,\n" +
        "    stop_seq     INTEGER NOT NULL CHECK (stop_seq > 0),\n" +
        "    location_id  INTEGER NOT NULL REFERENCES locations(location_id) ON DELETE RESTRICT,\n" +
        "    PRIMARY KEY (trip_id, stop_seq)\n" +
        ");\n" +
        "CREATE TABLE IF NOT EXISTS road_audit (\n" +
        "    audit_id    INTEGER PRIMARY KEY AUTOINCREMENT,\n" +
        "    road_id     INTEGER NOT NULL,\n" +
        "    action      TEXT    NOT NULL,\n" +
        "    details     TEXT,\n" +
        "    changed_at  TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))\n" +
        ");\n" +
        "CREATE TRIGGER IF NOT EXISTS trg_roads_insert\n" +
        "AFTER INSERT ON roads\n" +
        "BEGIN\n" +
        "    INSERT INTO road_audit (road_id, action, details)\n" +
        "    VALUES (NEW.road_id, 'ADDED',\n" +
        "            printf('%.1f km, %.1f min', NEW.distance_km, NEW.travel_time_min));\n" +
        "END;\n" +
        "CREATE TRIGGER IF NOT EXISTS trg_roads_update\n" +
        "AFTER UPDATE OF distance_km, travel_time_min, is_active ON roads\n" +
        "BEGIN\n" +
        "    INSERT INTO road_audit (road_id, action, details)\n" +
        "    VALUES (NEW.road_id,\n" +
        "            CASE WHEN OLD.is_active = 1 AND NEW.is_active = 0 THEN 'CLOSED'\n" +
        "                 WHEN OLD.is_active = 0 AND NEW.is_active = 1 THEN 'REOPENED'\n" +
        "                 ELSE 'UPDATED' END,\n" +
        "            printf('%.1f km, %.1f min', NEW.distance_km, NEW.travel_time_min));\n" +
        "END;\n" +
        "CREATE VIEW IF NOT EXISTS v_active_roads AS\n" +
        "SELECT r.road_id,\n" +
        "       a.name AS from_location,\n" +
        "       b.name AS to_location,\n" +
        "       r.distance_km,\n" +
        "       r.travel_time_min,\n" +
        "       r.is_active\n" +
        "FROM   roads r\n" +
        "JOIN   locations a ON a.location_id = r.loc_a\n" +
        "JOIN   locations b ON b.location_id = r.loc_b;\n" +
        "CREATE VIEW IF NOT EXISTS v_trip_summary AS\n" +
        "SELECT t.trip_id,\n" +
        "       t.created_at,\n" +
        "       l.name                         AS depot,\n" +
        "       COALESCE(d.name, 'Unassigned') AS driver,\n" +
        "       COALESCE(v.reg_no, '-')        AS vehicle,\n" +
        "       t.criterion,\n" +
        "       (SELECT COUNT(*) FROM trip_stops s WHERE s.trip_id = t.trip_id) AS stops,\n" +
        "       t.total_km,\n" +
        "       t.total_min,\n" +
        "       t.route_text\n" +
        "FROM   delivery_trips t\n" +
        "JOIN   locations l      ON l.location_id = t.depot_id\n" +
        "LEFT JOIN drivers d     ON d.driver_id   = t.driver_id\n" +
        "LEFT JOIN vehicles v    ON v.vehicle_id  = t.vehicle_id;\n";

    public synchronized boolean open(String dbPath) {
        try {
            Class.forName("org.sqlite.JDBC");
            conn = DriverManager.getConnection("jdbc:sqlite:" + dbPath);
            try (Statement s = conn.createStatement()) {
                s.execute("PRAGMA foreign_keys = ON;");
            }
            initSchema();
            return true;
        } catch (Exception e) {
            System.err.println("  [DB error] open: " + e.getMessage());
            return false;
        }
    }

    private void initSchema() {
        String[] statements = SCHEMA_SQL.split(";\\s*(\\r?\\n)+");
        for (String sql : statements) {
            sql = sql.trim();
            if (sql.isEmpty()) continue;
            try (Statement s = conn.createStatement()) {
                s.execute(sql);
            } catch (SQLException e) {
                // Ignore view or trigger already existing errors
            }
        }
    }

    @Override
    public synchronized void close() {
        if (conn != null) {
            try {
                conn.close();
            } catch (SQLException ignored) {}
            conn = null;
        }
    }

    public synchronized boolean isOpen() {
        return conn != null;
    }

    // ---- Load SQLite Data into DeliveryNetwork -------------------------------
    public synchronized int loadInto(DeliveryNetwork net) {
        net.clear();
        int roadCount = 0;
        try {
            Map<Integer, String> idToName = new HashMap<>();
            try (Statement s = conn.createStatement();
                 ResultSet rs = s.executeQuery("SELECT location_id, name, loc_type FROM locations ORDER BY location_id")) {
                while (rs.next()) {
                    int dbId = rs.getInt("location_id");
                    String name = rs.getString("name");
                    String type = rs.getString("loc_type");
                    net.addLocation(name, type);
                    idToName.put(dbId, name);
                }
            }

            try (Statement s = conn.createStatement();
                 ResultSet rs = s.executeQuery("SELECT loc_a, loc_b, distance_km, travel_time_min, is_active FROM roads")) {
                while (rs.next()) {
                    int locA = rs.getInt("loc_a");
                    int locB = rs.getInt("loc_b");
                    double km = rs.getDouble("distance_km");
                    double mins = rs.getDouble("travel_time_min");
                    int active = rs.getInt("is_active");

                    String nameA = idToName.get(locA);
                    String nameB = idToName.get(locB);
                    if (nameA != null && nameB != null) {
                        int u = net.findId(nameA);
                        int v = net.findId(nameB);
                        if (active == 1 && u != -1 && v != -1) {
                            net.addRoad(u, v, km, mins);
                            roadCount++;
                        }
                    }
                }
            }
        } catch (SQLException e) {
            System.err.println("  [DB error] loadInto: " + e.getMessage());
        }
        return roadCount;
    }

    public synchronized int locationId(String name) {
        if (name == null || conn == null) return -1;
        try (PreparedStatement ps = conn.prepareStatement("SELECT location_id FROM locations WHERE name = ? COLLATE NOCASE")) {
            ps.setString(1, name.trim());
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) return rs.getInt(1);
            }
        } catch (SQLException e) {
            System.err.println("  [DB error] locationId: " + e.getMessage());
        }
        return -1;
    }

    public synchronized boolean addLocation(String name, String type) {
        if (conn == null || name == null || name.trim().isEmpty()) return false;
        try (PreparedStatement ps = conn.prepareStatement("INSERT INTO locations (name, loc_type) VALUES (?, ?)")) {
            ps.setString(1, name.trim());
            ps.setString(2, type == null ? "CUSTOMER" : type.toUpperCase());
            return ps.executeUpdate() > 0;
        } catch (SQLException e) {
            return false;
        }
    }

    public synchronized boolean upsertRoad(String locA, String locB, double km, double mins) {
        if (conn == null) return false;
        int ia = locationId(locA);
        int ib = locationId(locB);
        if (ia < 0 || ib < 0 || ia == ib) return false;

        String sql = "INSERT INTO roads (loc_a, loc_b, distance_km, travel_time_min) VALUES (?, ?, ?, ?) " +
                     "ON CONFLICT (loc_a, loc_b) DO UPDATE SET " +
                     "distance_km = excluded.distance_km, " +
                     "travel_time_min = excluded.travel_time_min, is_active = 1";
        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, Math.min(ia, ib));
            ps.setInt(2, Math.max(ia, ib));
            ps.setDouble(3, km);
            ps.setDouble(4, mins);
            return ps.executeUpdate() > 0;
        } catch (SQLException e) {
            System.err.println("  [DB error] upsertRoad: " + e.getMessage());
            return false;
        }
    }

    public synchronized boolean setRoadActive(String locA, String locB, boolean active) {
        if (conn == null) return false;
        int ia = locationId(locA);
        int ib = locationId(locB);
        if (ia < 0 || ib < 0) return false;

        String sql = "UPDATE roads SET is_active = ? WHERE loc_a = ? AND loc_b = ? AND is_active <> ?";
        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, active ? 1 : 0);
            ps.setInt(2, Math.min(ia, ib));
            ps.setInt(3, Math.max(ia, ib));
            ps.setInt(4, active ? 1 : 0);
            return ps.executeUpdate() > 0;
        } catch (SQLException e) {
            System.err.println("  [DB error] setRoadActive: " + e.getMessage());
            return false;
        }
    }

    public synchronized int closedRoadCount() {
        if (conn == null) return 0;
        try (Statement s = conn.createStatement();
             ResultSet rs = s.executeQuery("SELECT COUNT(*) FROM roads WHERE is_active = 0")) {
            if (rs.next()) return rs.getInt(1);
        } catch (SQLException e) {
            System.err.println("  [DB error] closedRoadCount: " + e.getMessage());
        }
        return 0;
    }

    public synchronized boolean addDriver(String name, String phone) {
        if (conn == null) return false;
        try (PreparedStatement ps = conn.prepareStatement("INSERT INTO drivers (name, phone) VALUES (?, ?)")) {
            ps.setString(1, name.trim());
            ps.setString(2, phone.trim());
            return ps.executeUpdate() > 0;
        } catch (SQLException e) {
            return false;
        }
    }

    public synchronized boolean addVehicle(String regNo, String type, double capacityKg) {
        if (conn == null) return false;
        try (PreparedStatement ps = conn.prepareStatement("INSERT INTO vehicles (reg_no, vehicle_type, capacity_kg) VALUES (?, ?, ?)")) {
            ps.setString(1, regNo.trim().toUpperCase());
            ps.setString(2, type.toUpperCase());
            ps.setDouble(3, capacityKg);
            return ps.executeUpdate() > 0;
        } catch (SQLException e) {
            return false;
        }
    }

    public synchronized boolean driverExists(int id) {
        if (conn == null || id <= 0) return false;
        try (PreparedStatement ps = conn.prepareStatement("SELECT 1 FROM drivers WHERE driver_id = ?")) {
            ps.setInt(1, id);
            try (ResultSet rs = ps.executeQuery()) {
                return rs.next();
            }
        } catch (SQLException e) {
            return false;
        }
    }

    public synchronized boolean vehicleExists(int id) {
        if (conn == null || id <= 0) return false;
        try (PreparedStatement ps = conn.prepareStatement("SELECT 1 FROM vehicles WHERE vehicle_id = ?")) {
            ps.setInt(1, id);
            try (ResultSet rs = ps.executeQuery()) {
                return rs.next();
            }
        } catch (SQLException e) {
            return false;
        }
    }

    // ---- Transactional Trip Saving -------------------------------------------
    public synchronized int saveTrip(String depot, List<String> stops, String criterion,
                                     double km, double mins, String routeText,
                                     Integer driverId, Integer vehicleId) {
        if (conn == null) return -1;
        int depotId = locationId(depot);
        if (depotId < 0) return -1;

        try {
            conn.setAutoCommit(false);
            int tripId = -1;

            String tripSql = "INSERT INTO delivery_trips (driver_id, vehicle_id, depot_id, criterion, " +
                             "total_km, total_min, route_text) VALUES (?, ?, ?, ?, ?, ?, ?)";
            try (PreparedStatement ps = conn.prepareStatement(tripSql, Statement.RETURN_GENERATED_KEYS)) {
                if (driverId != null && driverId > 0) ps.setInt(1, driverId); else ps.setNull(1, Types.INTEGER);
                if (vehicleId != null && vehicleId > 0) ps.setInt(2, vehicleId); else ps.setNull(2, Types.INTEGER);
                ps.setInt(3, depotId);
                ps.setString(4, criterion);
                ps.setDouble(5, km);
                ps.setDouble(6, mins);
                ps.setString(7, routeText);
                ps.executeUpdate();
                try (ResultSet rs = ps.getGeneratedKeys()) {
                    if (rs.next()) tripId = rs.getInt(1);
                }
            }

            if (tripId > 0 && stops != null) {
                String stopSql = "INSERT INTO trip_stops (trip_id, stop_seq, location_id) VALUES (?, ?, ?)";
                try (PreparedStatement ps = conn.prepareStatement(stopSql)) {
                    for (int i = 0; i < stops.size(); i++) {
                        int loc = locationId(stops.get(i));
                        if (loc < 0) throw new SQLException("Stop location not found: " + stops.get(i));
                        ps.setInt(1, tripId);
                        ps.setInt(2, i + 1);
                        ps.setInt(3, loc);
                        ps.addBatch();
                    }
                    ps.executeBatch();
                }
            }

            conn.commit();
            conn.setAutoCommit(true);
            return tripId;
        } catch (SQLException e) {
            System.err.println("  [DB error] saveTrip: " + e.getMessage());
            try { conn.rollback(); conn.setAutoCommit(true); } catch (SQLException ignored) {}
            return -1;
        }
    }

    public synchronized boolean resetMapData() {
        if (conn == null) return false;
        try (Statement s = conn.createStatement()) {
            s.executeUpdate("DELETE FROM trip_stops;");
            s.executeUpdate("DELETE FROM delivery_trips;");
            s.executeUpdate("DELETE FROM road_audit;");
            s.executeUpdate("DELETE FROM roads;");
            s.executeUpdate("DELETE FROM locations;");
            s.executeUpdate("DELETE FROM sqlite_sequence WHERE name IN ('delivery_trips','road_audit','roads','locations');");
            return true;
        } catch (SQLException e) {
            System.err.println("  [DB error] resetMapData: " + e.getMessage());
            return false;
        }
    }

    // ---- Data Retrieval for APIs and Reports ---------------------------------
    public synchronized List<Map<String, Object>> getAllRoadsList() {
        List<Map<String, Object>> list = new ArrayList<>();
        if (conn == null) return list;
        String sql = "SELECT r.road_id, a.name AS loc_a, b.name AS loc_b, " +
                     "r.distance_km, r.travel_time_min, r.is_active " +
                     "FROM roads r " +
                     "JOIN locations a ON a.location_id = r.loc_a " +
                     "JOIN locations b ON b.location_id = r.loc_b " +
                     "ORDER BY r.road_id";
        try (Statement s = conn.createStatement();
             ResultSet rs = s.executeQuery(sql)) {
            while (rs.next()) {
                Map<String, Object> map = new LinkedHashMap<>();
                map.put("roadId", rs.getInt("road_id"));
                map.put("locA", rs.getString("loc_a"));
                map.put("locB", rs.getString("loc_b"));
                map.put("distanceKm", rs.getDouble("distance_km"));
                map.put("travelTimeMin", rs.getDouble("travel_time_min"));
                map.put("isActive", rs.getInt("is_active") == 1);
                list.add(map);
            }
        } catch (SQLException e) {
            System.err.println("  [DB error] getAllRoadsList: " + e.getMessage());
        }
        return list;
    }

    public synchronized List<Map<String, Object>> getDriversList() {
        List<Map<String, Object>> list = new ArrayList<>();
        if (conn == null) return list;
        try (Statement s = conn.createStatement();
             ResultSet rs = s.executeQuery("SELECT driver_id, name, phone FROM drivers ORDER BY driver_id")) {
            while (rs.next()) {
                Map<String, Object> map = new LinkedHashMap<>();
                map.put("id", rs.getInt("driver_id"));
                map.put("name", rs.getString("name"));
                map.put("phone", rs.getString("phone"));
                list.add(map);
            }
        } catch (SQLException e) {
            System.err.println("  [DB error] getDriversList: " + e.getMessage());
        }
        return list;
    }

    public synchronized List<Map<String, Object>> getVehiclesList() {
        List<Map<String, Object>> list = new ArrayList<>();
        if (conn == null) return list;
        try (Statement s = conn.createStatement();
             ResultSet rs = s.executeQuery("SELECT vehicle_id, reg_no, vehicle_type, capacity_kg FROM vehicles ORDER BY vehicle_id")) {
            while (rs.next()) {
                Map<String, Object> map = new LinkedHashMap<>();
                map.put("id", rs.getInt("vehicle_id"));
                map.put("regNo", rs.getString("reg_no"));
                map.put("type", rs.getString("vehicle_type"));
                map.put("capacityKg", rs.getDouble("capacity_kg"));
                list.add(map);
            }
        } catch (SQLException e) {
            System.err.println("  [DB error] getVehiclesList: " + e.getMessage());
        }
        return list;
    }

    public synchronized List<Map<String, Object>> getTripHistoryList() {
        List<Map<String, Object>> list = new ArrayList<>();
        if (conn == null) return list;
        String sql = "SELECT trip_id, created_at, depot, driver, vehicle, criterion, stops, " +
                     "ROUND(total_km, 1) AS km, ROUND(total_min, 1) AS min, route_text " +
                     "FROM v_trip_summary ORDER BY trip_id DESC LIMIT 50";
        try (Statement s = conn.createStatement();
             ResultSet rs = s.executeQuery(sql)) {
            while (rs.next()) {
                Map<String, Object> map = new LinkedHashMap<>();
                map.put("id", rs.getInt("trip_id"));
                map.put("createdAt", rs.getString("created_at"));
                map.put("depot", rs.getString("depot"));
                map.put("driver", rs.getString("driver"));
                map.put("vehicle", rs.getString("vehicle"));
                map.put("criterion", rs.getString("criterion"));
                map.put("stops", rs.getInt("stops"));
                map.put("km", rs.getDouble("km"));
                map.put("min", rs.getDouble("min"));
                map.put("routeText", rs.getString("route_text"));
                list.add(map);
            }
        } catch (SQLException e) {
            System.err.println("  [DB error] getTripHistoryList: " + e.getMessage());
        }
        return list;
    }

    public synchronized List<Map<String, Object>> getDriverPerformanceList() {
        List<Map<String, Object>> list = new ArrayList<>();
        if (conn == null) return list;
        String sql = "SELECT d.name AS driver, COUNT(t.trip_id) AS trips, " +
                     "ROUND(COALESCE(SUM(t.total_km), 0), 1) AS total_km, " +
                     "ROUND(COALESCE(AVG(t.total_min), 0), 1) AS avg_minutes " +
                     "FROM drivers d LEFT JOIN delivery_trips t ON t.driver_id = d.driver_id " +
                     "GROUP BY d.driver_id ORDER BY trips DESC, d.name";
        try (Statement s = conn.createStatement();
             ResultSet rs = s.executeQuery(sql)) {
            while (rs.next()) {
                Map<String, Object> map = new LinkedHashMap<>();
                map.put("driver", rs.getString("driver"));
                map.put("trips", rs.getInt("trips"));
                map.put("totalKm", rs.getDouble("total_km"));
                map.put("avgMinutes", rs.getDouble("avg_minutes"));
                list.add(map);
            }
        } catch (SQLException e) {
            System.err.println("  [DB error] getDriverPerformanceList: " + e.getMessage());
        }
        return list;
    }

    public synchronized List<Map<String, Object>> getTopLocationsList() {
        List<Map<String, Object>> list = new ArrayList<>();
        if (conn == null) return list;
        String sql = "SELECT l.name AS location, l.loc_type AS type, COUNT(s.trip_id) AS deliveries " +
                     "FROM locations l LEFT JOIN trip_stops s ON s.location_id = l.location_id " +
                     "GROUP BY l.location_id ORDER BY deliveries DESC, l.name LIMIT 10";
        try (Statement s = conn.createStatement();
             ResultSet rs = s.executeQuery(sql)) {
            while (rs.next()) {
                Map<String, Object> map = new LinkedHashMap<>();
                map.put("location", rs.getString("location"));
                map.put("type", rs.getString("type"));
                map.put("deliveries", rs.getInt("deliveries"));
                list.add(map);
            }
        } catch (SQLException e) {
            System.err.println("  [DB error] getTopLocationsList: " + e.getMessage());
        }
        return list;
    }

    public synchronized List<Map<String, Object>> getRoadAuditLogList() {
        List<Map<String, Object>> list = new ArrayList<>();
        if (conn == null) return list;
        String sql = "SELECT audit_id, changed_at, road_id, action, details " +
                     "FROM road_audit ORDER BY audit_id DESC LIMIT 50";
        try (Statement s = conn.createStatement();
             ResultSet rs = s.executeQuery(sql)) {
            while (rs.next()) {
                Map<String, Object> map = new LinkedHashMap<>();
                map.put("id", rs.getInt("audit_id"));
                map.put("changedAt", rs.getString("changed_at"));
                map.put("roadId", rs.getInt("road_id"));
                map.put("action", rs.getString("action"));
                map.put("details", rs.getString("details"));
                list.add(map);
            }
        } catch (SQLException e) {
            System.err.println("  [DB error] getRoadAuditLogList: " + e.getMessage());
        }
        return list;
    }

    // ---- Console Reporting (matching C++ output) -----------------------------
    public void printQuery(String sql, String emptyMsg) {
        if (conn == null) return;
        try (Statement s = conn.createStatement();
             ResultSet rs = s.executeQuery(sql)) {
            ResultSetMetaData meta = rs.getMetaData();
            int cols = meta.getColumnCount();
            List<String[]> rows = new ArrayList<>();
            int[] widths = new int[cols];

            for (int i = 0; i < cols; i++) {
                widths[i] = meta.getColumnLabel(i + 1).length();
            }

            while (rs.next()) {
                String[] row = new String[cols];
                for (int i = 0; i < cols; i++) {
                    String val = rs.getString(i + 1);
                    row[i] = val != null ? val : "";
                    widths[i] = Math.max(widths[i], row[i].length());
                }
                rows.add(row);
            }

            if (rows.isEmpty()) {
                System.out.println(emptyMsg);
                return;
            }

            System.out.println();
            for (int i = 0; i < cols; i++) {
                System.out.printf("  %-" + (widths[i] + 2) + "s", meta.getColumnLabel(i + 1));
            }
            System.out.println();
            for (int i = 0; i < cols; i++) {
                StringBuilder dashes = new StringBuilder();
                for (int d = 0; d < widths[i]; d++) dashes.append("-");
                System.out.printf("  %-" + (widths[i] + 2) + "s", dashes.toString());
            }
            System.out.println();
            for (String[] row : rows) {
                for (int i = 0; i < cols; i++) {
                    System.out.printf("  %-" + (widths[i] + 2) + "s", row[i]);
                }
                System.out.println();
            }
        } catch (SQLException e) {
            System.err.println("  [DB error] printQuery: " + e.getMessage());
        }
    }

    public void tripHistory() {
        printQuery("SELECT trip_id AS ID, substr(created_at, 1, 16) AS \"When\", depot AS Depot, " +
                   "driver AS Driver, vehicle AS Vehicle, criterion AS Mode, stops AS Stops, " +
                   "ROUND(total_km, 1) AS km, ROUND(total_min, 1) AS min " +
                   "FROM v_trip_summary ORDER BY trip_id DESC LIMIT 20",
                   "  No trips saved yet.");
    }

    public void driverPerformance() {
        printQuery("SELECT d.name AS Driver, COUNT(t.trip_id) AS Trips, " +
                   "ROUND(COALESCE(SUM(t.total_km), 0), 1) AS \"Total km\", " +
                   "ROUND(COALESCE(AVG(t.total_min), 0), 1) AS \"Avg min/trip\" " +
                   "FROM drivers d LEFT JOIN delivery_trips t ON t.driver_id = d.driver_id " +
                   "GROUP BY d.driver_id ORDER BY Trips DESC, d.name",
                   "  No drivers yet.");
    }

    public void topLocations() {
        printQuery("SELECT l.name AS Location, l.loc_type AS Type, COUNT(*) AS Deliveries " +
                   "FROM trip_stops s JOIN locations l ON l.location_id = s.location_id " +
                   "GROUP BY l.location_id ORDER BY Deliveries DESC, l.name LIMIT 10",
                   "  No deliveries recorded yet.");
    }

    public void roadLog() {
        printQuery("SELECT audit_id AS ID, changed_at AS \"When\", road_id AS Road, " +
                   "action AS Action, details AS Details FROM road_audit " +
                   "ORDER BY audit_id DESC LIMIT 20",
                   "  No road changes recorded.");
    }

    public void closedRoads() {
        printQuery("SELECT from_location AS \"From\", to_location AS \"To\", " +
                   "distance_km AS km, travel_time_min AS min FROM v_active_roads WHERE is_active = 0",
                   "  No closed roads.");
    }

    public void listDrivers() {
        printQuery("SELECT driver_id AS ID, name AS Name, phone AS Phone FROM drivers ORDER BY driver_id",
                   "  No drivers yet.");
    }

    public void listVehicles() {
        printQuery("SELECT vehicle_id AS ID, reg_no AS Registration, vehicle_type AS Type, " +
                   "capacity_kg AS \"Capacity kg\" FROM vehicles ORDER BY vehicle_id",
                   "  No vehicles yet.");
    }
}

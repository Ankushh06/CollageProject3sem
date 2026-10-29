package delivery;

import java.io.*;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.sql.*;
import java.util.*;

/**
 * Database: Enterprise DBMS Layer supporting Oracle Database & SQLite (Auto-detect & Fallback).
 *
 * Configured via db.properties:
 * - Oracle Database (12c, 18c, 19c, 21c, 23c Free) via ojdbc11.jar
 * - Automatic seamless fallback to SQLite (delivery.db) if Oracle DB is not reachable
 */
public class Database implements AutoCloseable {
    private Connection conn = null;
    private String activeEngine = "SQLITE"; // "ORACLE" or "SQLITE"
    private String engineDetails = "SQLite (delivery.db)";
    private final Properties config = new Properties();

    public Database() {
        loadConfig();
    }

    private void loadConfig() {
        File f = new File("db.properties");
        if (f.exists()) {
            try (InputStream is = new FileInputStream(f)) {
                config.load(is);
            } catch (IOException e) {
                System.err.println("  [DB Config] Could not read db.properties: " + e.getMessage());
            }
        }
    }

    public synchronized boolean open(String dbPath) {
        String mode = config.getProperty("db.mode", "AUTO").trim().toUpperCase();

        if ("ORACLE".equals(mode) || "AUTO".equals(mode)) {
            if (tryConnectOracle()) {
                activeEngine = "ORACLE";
                return true;
            }
            if ("ORACLE".equals(mode)) {
                System.err.println("  [DB Error] Force Oracle mode enabled, but connection failed.");
                return false;
            }
        }

        // SQLite initialization
        return connectSqlite(dbPath != null ? dbPath : config.getProperty("sqlite.file", "delivery.db"));
    }

    private boolean tryConnectOracle() {
        String host = config.getProperty("oracle.host", "localhost");
        String port = config.getProperty("oracle.port", "1521");
        String service = config.getProperty("oracle.service", "");
        String sid = config.getProperty("oracle.sid", "");
        String user = config.getProperty("oracle.user", "SYSTEM");
        String pass = config.getProperty("oracle.password", "");

        String jdbcUrl;
        if (service != null && !service.trim().isEmpty()) {
            jdbcUrl = "jdbc:oracle:thin:@//" + host + ":" + port + "/" + service.trim();
        } else {
            jdbcUrl = "jdbc:oracle:thin:@" + host + ":" + port + ":" + (sid.isEmpty() ? "XE" : sid.trim());
        }

        try {
            Class.forName("oracle.jdbc.OracleDriver");
            DriverManager.setLoginTimeout(3); // 3-second quick probe timeout
            conn = DriverManager.getConnection(jdbcUrl, user, pass);
            activeEngine = "ORACLE";
            engineDetails = "Oracle Database (" + host + ":" + port + (service.isEmpty() ? ":" + sid : "/" + service) + ")";
            System.out.println("  [DB Success] Connected to " + engineDetails + " as user '" + user + "'");
            initOracleSchema();
            return true;
        } catch (Exception e) {
            System.out.println("  [DB Info] Oracle DB not reached (" + e.getMessage() + ").");
            System.out.println("  [DB Info] Seamlessly using SQLite fallback. (Edit db.properties to connect Oracle).");
            return false;
        }
    }

    private boolean connectSqlite(String dbPath) {
        try {
            Class.forName("org.sqlite.JDBC");
            conn = DriverManager.getConnection("jdbc:sqlite:" + dbPath);
            activeEngine = "SQLITE";
            engineDetails = "SQLite (" + dbPath + ")";
            try (Statement s = conn.createStatement()) {
                s.execute("PRAGMA foreign_keys = ON;");
            }
            initSqliteSchema();
            System.out.println("  [DB Connected] Active Engine: " + engineDetails);
            return true;
        } catch (Exception e) {
            System.err.println("  [DB Error] SQLite connect failed: " + e.getMessage());
            return false;
        }
    }

    public synchronized String getActiveEngine() {
        return activeEngine;
    }

    public synchronized String getEngineDetails() {
        return engineDetails;
    }

    public synchronized Map<String, Object> getEngineInfoMap() {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("engine", activeEngine);
        map.put("details", engineDetails);
        map.put("isOracle", "ORACLE".equalsIgnoreCase(activeEngine));
        map.put("host", config.getProperty("oracle.host", "localhost"));
        map.put("port", config.getProperty("oracle.port", "1521"));
        map.put("service", config.getProperty("oracle.service", "FREEPDB1"));
        map.put("user", config.getProperty("oracle.user", "SYSTEM"));
        return map;
    }

    // ---- Schema Setup --------------------------------------------------------
    private void initOracleSchema() {
        // Create tables if not present
        execIgnore("CREATE TABLE locations (location_id NUMBER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY, " +
                   "name VARCHAR2(100) NOT NULL UNIQUE, loc_type VARCHAR2(20) DEFAULT 'CUSTOMER' NOT NULL " +
                   "CHECK (loc_type IN ('WAREHOUSE', 'CUSTOMER', 'LANDMARK')), created_at TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL)");

        execIgnore("CREATE TABLE roads (road_id NUMBER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY, " +
                   "loc_a NUMBER NOT NULL REFERENCES locations(location_id) ON DELETE CASCADE, " +
                   "loc_b NUMBER NOT NULL REFERENCES locations(location_id) ON DELETE CASCADE, " +
                   "distance_km NUMBER(8,2) NOT NULL CHECK (distance_km > 0), " +
                   "travel_time_min NUMBER(8,2) NOT NULL CHECK (travel_time_min > 0), " +
                   "is_active NUMBER(1) DEFAULT 1 NOT NULL CHECK (is_active IN (0, 1)), " +
                   "CHECK (loc_a < loc_b), UNIQUE (loc_a, loc_b))");

        execIgnore("CREATE TABLE drivers (driver_id NUMBER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY, " +
                   "name VARCHAR2(100) NOT NULL, phone VARCHAR2(20) NOT NULL UNIQUE CHECK (LENGTH(phone) BETWEEN 7 AND 15))");

        execIgnore("CREATE TABLE vehicles (vehicle_id NUMBER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY, " +
                   "reg_no VARCHAR2(30) NOT NULL UNIQUE, vehicle_type VARCHAR2(20) NOT NULL CHECK (vehicle_type IN ('BIKE', 'VAN', 'TRUCK')), " +
                   "capacity_kg NUMBER(8,2) NOT NULL CHECK (capacity_kg > 0))");

        execIgnore("CREATE TABLE delivery_trips (trip_id NUMBER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY, " +
                   "driver_id NUMBER REFERENCES drivers(driver_id) ON DELETE SET NULL, " +
                   "vehicle_id NUMBER REFERENCES vehicles(vehicle_id) ON DELETE SET NULL, " +
                   "depot_id NUMBER NOT NULL REFERENCES locations(location_id), " +
                   "criterion VARCHAR2(20) NOT NULL CHECK (criterion IN ('DISTANCE', 'TIME')), " +
                   "total_km NUMBER(8,2) NOT NULL CHECK (total_km >= 0), " +
                   "total_min NUMBER(8,2) NOT NULL CHECK (total_min >= 0), " +
                   "route_text VARCHAR2(4000) NOT NULL, created_at TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL)");

        execIgnore("CREATE TABLE trip_stops (trip_id NUMBER NOT NULL REFERENCES delivery_trips(trip_id) ON DELETE CASCADE, " +
                   "stop_seq NUMBER(4) NOT NULL CHECK (stop_seq > 0), location_id NUMBER NOT NULL REFERENCES locations(location_id), " +
                   "PRIMARY KEY (trip_id, stop_seq))");

        execIgnore("CREATE TABLE road_audit (audit_id NUMBER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY, " +
                   "road_id NUMBER NOT NULL, action VARCHAR2(20) NOT NULL, details VARCHAR2(255), " +
                   "changed_at TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL)");

        // Views
        execIgnore("CREATE OR REPLACE VIEW v_active_roads AS SELECT r.road_id, a.name AS from_location, " +
                   "b.name AS to_location, r.distance_km, r.travel_time_min, r.is_active FROM roads r " +
                   "JOIN locations a ON a.location_id = r.loc_a JOIN locations b ON b.location_id = r.loc_b");

        execIgnore("CREATE OR REPLACE VIEW v_trip_summary AS SELECT t.trip_id, TO_CHAR(t.created_at, 'YYYY-MM-DD HH24:MI') AS created_at, " +
                   "l.name AS depot, NVL(d.name, 'Unassigned') AS driver, NVL(v.reg_no, '-') AS vehicle, t.criterion, " +
                   "(SELECT COUNT(*) FROM trip_stops s WHERE s.trip_id = t.trip_id) AS stops, " +
                   "ROUND(t.total_km, 1) AS total_km, ROUND(t.total_min, 1) AS total_min, t.route_text " +
                   "FROM delivery_trips t JOIN locations l ON l.location_id = t.depot_id " +
                   "LEFT JOIN drivers d ON d.driver_id = t.driver_id LEFT JOIN vehicles v ON v.vehicle_id = t.vehicle_id");

        // Triggers
        execIgnore("CREATE OR REPLACE TRIGGER trg_roads_insert AFTER INSERT ON roads FOR EACH ROW " +
                   "BEGIN INSERT INTO road_audit (road_id, action, details) VALUES (:NEW.road_id, 'ADDED', " +
                   "TO_CHAR(:NEW.distance_km, 'FM990.0') || ' km, ' || TO_CHAR(:NEW.travel_time_min, 'FM990.0') || ' min'); END;");

        execIgnore("CREATE OR REPLACE TRIGGER trg_roads_update AFTER UPDATE OF distance_km, travel_time_min, is_active ON roads FOR EACH ROW " +
                   "BEGIN INSERT INTO road_audit (road_id, action, details) VALUES (:NEW.road_id, " +
                   "CASE WHEN :OLD.is_active = 1 AND :NEW.is_active = 0 THEN 'CLOSED' " +
                   "WHEN :OLD.is_active = 0 AND :NEW.is_active = 1 THEN 'REOPENED' ELSE 'UPDATED' END, " +
                   "TO_CHAR(:NEW.distance_km, 'FM990.0') || ' km, ' || TO_CHAR(:NEW.travel_time_min, 'FM990.0') || ' min'); END;");
    }

    private void initSqliteSchema() {
        String schema =
            "CREATE TABLE IF NOT EXISTS locations (location_id INTEGER PRIMARY KEY AUTOINCREMENT, " +
            "name TEXT NOT NULL UNIQUE COLLATE NOCASE, loc_type TEXT NOT NULL DEFAULT 'CUSTOMER' " +
            "CHECK (loc_type IN ('WAREHOUSE', 'CUSTOMER', 'LANDMARK')), created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')));\n" +
            "CREATE TABLE IF NOT EXISTS roads (road_id INTEGER PRIMARY KEY AUTOINCREMENT, " +
            "loc_a INTEGER NOT NULL REFERENCES locations(location_id) ON DELETE CASCADE, " +
            "loc_b INTEGER NOT NULL REFERENCES locations(location_id) ON DELETE CASCADE, " +
            "distance_km REAL NOT NULL CHECK (distance_km > 0), travel_time_min REAL NOT NULL CHECK (travel_time_min > 0), " +
            "is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)), CHECK (loc_a < loc_b), UNIQUE (loc_a, loc_b));\n" +
            "CREATE TABLE IF NOT EXISTS drivers (driver_id INTEGER PRIMARY KEY AUTOINCREMENT, " +
            "name TEXT NOT NULL, phone TEXT NOT NULL UNIQUE CHECK (length(phone) BETWEEN 7 AND 15));\n" +
            "CREATE TABLE IF NOT EXISTS vehicles (vehicle_id INTEGER PRIMARY KEY AUTOINCREMENT, " +
            "reg_no TEXT NOT NULL UNIQUE, vehicle_type TEXT NOT NULL CHECK (vehicle_type IN ('BIKE', 'VAN', 'TRUCK')), " +
            "capacity_kg REAL NOT NULL CHECK (capacity_kg > 0));\n" +
            "CREATE TABLE IF NOT EXISTS delivery_trips (trip_id INTEGER PRIMARY KEY AUTOINCREMENT, " +
            "driver_id INTEGER REFERENCES drivers(driver_id) ON DELETE SET NULL, " +
            "vehicle_id INTEGER REFERENCES vehicles(vehicle_id) ON DELETE SET NULL, " +
            "depot_id INTEGER NOT NULL REFERENCES locations(location_id) ON DELETE RESTRICT, " +
            "criterion TEXT NOT NULL CHECK (criterion IN ('DISTANCE', 'TIME')), " +
            "total_km REAL NOT NULL CHECK (total_km >= 0), total_min REAL NOT NULL CHECK (total_min >= 0), " +
            "route_text TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')));\n" +
            "CREATE TABLE IF NOT EXISTS trip_stops (trip_id INTEGER NOT NULL REFERENCES delivery_trips(trip_id) ON DELETE CASCADE, " +
            "stop_seq INTEGER NOT NULL CHECK (stop_seq > 0), location_id INTEGER NOT NULL REFERENCES locations(location_id) ON DELETE RESTRICT, " +
            "PRIMARY KEY (trip_id, stop_seq));\n" +
            "CREATE TABLE IF NOT EXISTS road_audit (audit_id INTEGER PRIMARY KEY AUTOINCREMENT, " +
            "road_id INTEGER NOT NULL, action TEXT NOT NULL, details TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')));\n" +
            "CREATE VIEW IF NOT EXISTS v_active_roads AS SELECT r.road_id, a.name AS from_location, b.name AS to_location, " +
            "r.distance_km, r.travel_time_min, r.is_active FROM roads r " +
            "JOIN locations a ON a.location_id = r.loc_a JOIN locations b ON b.location_id = r.loc_b;\n" +
            "CREATE VIEW IF NOT EXISTS v_trip_summary AS SELECT t.trip_id, t.created_at, l.name AS depot, " +
            "COALESCE(d.name, 'Unassigned') AS driver, COALESCE(v.reg_no, '-') AS vehicle, t.criterion, " +
            "(SELECT COUNT(*) FROM trip_stops s WHERE s.trip_id = t.trip_id) AS stops, " +
            "t.total_km, t.total_min, t.route_text FROM delivery_trips t JOIN locations l ON l.location_id = t.depot_id " +
            "LEFT JOIN drivers d ON d.driver_id = t.driver_id LEFT JOIN vehicles v ON v.vehicle_id = t.vehicle_id;\n";

        for (String sql : schema.split(";\\s*(\\r?\\n)+")) {
            execIgnore(sql.trim());
        }
    }

    private void execIgnore(String sql) {
        if (conn == null || sql.isEmpty()) return;
        try (Statement s = conn.createStatement()) {
            s.execute(sql);
        } catch (SQLException ignored) {}
    }

    @Override
    public synchronized void close() {
        if (conn != null) {
            try { conn.close(); } catch (SQLException ignored) {}
            conn = null;
        }
    }

    // ---- Data Loading & Operations -------------------------------------------
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
        String sql = "SELECT location_id FROM locations WHERE UPPER(name) = UPPER(?)";
        try (PreparedStatement ps = conn.prepareStatement(sql)) {
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

        int minId = Math.min(ia, ib);
        int maxId = Math.max(ia, ib);

        if ("ORACLE".equalsIgnoreCase(activeEngine)) {
            String mergeSql =
                "MERGE INTO roads r " +
                "USING (SELECT ? AS la, ? AS lb, ? AS d, ? AS t FROM dual) v " +
                "ON (r.loc_a = v.la AND r.loc_b = v.lb) " +
                "WHEN MATCHED THEN UPDATE SET r.distance_km = v.d, r.travel_time_min = v.t, r.is_active = 1 " +
                "WHEN NOT MATCHED THEN INSERT (loc_a, loc_b, distance_km, travel_time_min, is_active) " +
                "VALUES (v.la, v.lb, v.d, v.t, 1)";
            try (PreparedStatement ps = conn.prepareStatement(mergeSql)) {
                ps.setInt(1, minId);
                ps.setInt(2, maxId);
                ps.setDouble(3, km);
                ps.setDouble(4, mins);
                return ps.executeUpdate() > 0;
            } catch (SQLException e) {
                System.err.println("  [Oracle error] upsertRoad: " + e.getMessage());
                return false;
            }
        } else {
            String sqliteSql =
                "INSERT INTO roads (loc_a, loc_b, distance_km, travel_time_min) VALUES (?, ?, ?, ?) " +
                "ON CONFLICT (loc_a, loc_b) DO UPDATE SET " +
                "distance_km = excluded.distance_km, travel_time_min = excluded.travel_time_min, is_active = 1";
            try (PreparedStatement ps = conn.prepareStatement(sqliteSql)) {
                ps.setInt(1, minId);
                ps.setInt(2, maxId);
                ps.setDouble(3, km);
                ps.setDouble(4, mins);
                return ps.executeUpdate() > 0;
            } catch (SQLException e) {
                System.err.println("  [SQLite error] upsertRoad: " + e.getMessage());
                return false;
            }
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
            try (ResultSet rs = ps.executeQuery()) { return rs.next(); }
        } catch (SQLException e) { return false; }
    }

    public synchronized boolean vehicleExists(int id) {
        if (conn == null || id <= 0) return false;
        try (PreparedStatement ps = conn.prepareStatement("SELECT 1 FROM vehicles WHERE vehicle_id = ?")) {
            ps.setInt(1, id);
            try (ResultSet rs = ps.executeQuery()) { return rs.next(); }
        } catch (SQLException e) { return false; }
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
                        if (loc < 0) throw new SQLException("Stop not found: " + stops.get(i));
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
            System.err.println("  [DB error] saveTrip transaction failed: " + e.getMessage());
            try { conn.rollback(); conn.setAutoCommit(true); } catch (SQLException ignored) {}
            return -1;
        }
    }

    public synchronized boolean resetMapData() {
        if (conn == null) return false;
        try (Statement s = conn.createStatement()) {
            s.executeUpdate("DELETE FROM trip_stops");
            s.executeUpdate("DELETE FROM delivery_trips");
            s.executeUpdate("DELETE FROM road_audit");
            s.executeUpdate("DELETE FROM roads");
            s.executeUpdate("DELETE FROM locations");
            return true;
        } catch (SQLException e) {
            System.err.println("  [DB error] resetMapData: " + e.getMessage());
            return false;
        }
    }

    // ---- Query Lists for REST APIs -------------------------------------------
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
                     "total_km, total_min, route_text FROM v_trip_summary ORDER BY trip_id DESC";
        if (!"ORACLE".equalsIgnoreCase(activeEngine)) sql += " LIMIT 50";
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
                map.put("km", rs.getDouble("total_km"));
                map.put("min", rs.getDouble("total_min"));
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
                     "GROUP BY d.driver_id, d.name ORDER BY trips DESC, d.name";
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
        String sql = "SELECT l.name AS location, l.loc_type AS loc_type, COUNT(s.trip_id) AS deliveries " +
                     "FROM locations l LEFT JOIN trip_stops s ON s.location_id = l.location_id " +
                     "GROUP BY l.location_id, l.name, l.loc_type ORDER BY deliveries DESC, l.name";
        try (Statement s = conn.createStatement();
             ResultSet rs = s.executeQuery(sql)) {
            while (rs.next()) {
                Map<String, Object> map = new LinkedHashMap<>();
                map.put("location", rs.getString("location"));
                map.put("type", rs.getString("loc_type"));
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
        String sql = "SELECT audit_id, changed_at, road_id, action, details FROM road_audit ORDER BY audit_id DESC";
        if (!"ORACLE".equalsIgnoreCase(activeEngine)) sql += " LIMIT 50";
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

    // ---- Console Reporting (CLI) ---------------------------------------------
    public void printQuery(String sql, String emptyMsg) {
        if (conn == null) return;
        try (Statement s = conn.createStatement();
             ResultSet rs = s.executeQuery(sql)) {
            ResultSetMetaData meta = rs.getMetaData();
            int cols = meta.getColumnCount();
            List<String[]> rows = new ArrayList<>();
            int[] widths = new int[cols];
            for (int i = 0; i < cols; i++) widths[i] = meta.getColumnLabel(i + 1).length();
            while (rs.next()) {
                String[] row = new String[cols];
                for (int i = 0; i < cols; i++) {
                    String val = rs.getString(i + 1);
                    row[i] = val != null ? val : "";
                    widths[i] = Math.max(widths[i], row[i].length());
                }
                rows.add(row);
            }
            if (rows.isEmpty()) { System.out.println(emptyMsg); return; }
            System.out.println();
            for (int i = 0; i < cols; i++) System.out.printf("  %-" + (widths[i] + 2) + "s", meta.getColumnLabel(i + 1));
            System.out.println();
            for (int i = 0; i < cols; i++) {
                StringBuilder dashes = new StringBuilder();
                for (int d = 0; d < widths[i]; d++) dashes.append("-");
                System.out.printf("  %-" + (widths[i] + 2) + "s", dashes.toString());
            }
            System.out.println();
            for (String[] row : rows) {
                for (int i = 0; i < cols; i++) System.out.printf("  %-" + (widths[i] + 2) + "s", row[i]);
                System.out.println();
            }
        } catch (SQLException e) { System.err.println("  [DB error] printQuery: " + e.getMessage()); }
    }

    public void tripHistory() {
        printQuery("SELECT trip_id AS ID, SUBSTR(created_at, 1, 16) AS \"When\", depot AS Depot, driver AS Driver, vehicle AS Vehicle, criterion AS Mode, stops AS Stops, ROUND(total_km, 1) AS km, ROUND(total_min, 1) AS min FROM v_trip_summary ORDER BY trip_id DESC", "  No trips saved yet.");
    }

    public void driverPerformance() {
        printQuery("SELECT d.name AS Driver, COUNT(t.trip_id) AS Trips, ROUND(COALESCE(SUM(t.total_km), 0), 1) AS \"Total km\", ROUND(COALESCE(AVG(t.total_min), 0), 1) AS \"Avg min/trip\" FROM drivers d LEFT JOIN delivery_trips t ON t.driver_id = d.driver_id GROUP BY d.driver_id, d.name ORDER BY Trips DESC, d.name", "  No drivers yet.");
    }

    public void topLocations() {
        printQuery("SELECT l.name AS Location, l.loc_type AS Type, COUNT(s.trip_id) AS Deliveries FROM locations l LEFT JOIN trip_stops s ON s.location_id = l.location_id GROUP BY l.location_id, l.name, l.loc_type ORDER BY Deliveries DESC, l.name", "  No deliveries recorded yet.");
    }

    public void roadLog() {
        printQuery("SELECT audit_id AS ID, changed_at AS \"When\", road_id AS Road, action AS Action, details AS Details FROM road_audit ORDER BY audit_id DESC", "  No road changes recorded.");
    }

    public void closedRoads() {
        printQuery("SELECT from_location AS \"From\", to_location AS \"To\", distance_km AS km, travel_time_min AS min FROM v_active_roads WHERE is_active = 0", "  No closed roads.");
    }

    public void listDrivers() {
        printQuery("SELECT driver_id AS ID, name AS Name, phone AS Phone FROM drivers ORDER BY driver_id", "  No drivers yet.");
    }

    public void listVehicles() {
        printQuery("SELECT vehicle_id AS ID, reg_no AS Registration, vehicle_type AS Type, capacity_kg AS \"Capacity kg\" FROM vehicles ORDER BY vehicle_id", "  No vehicles yet.");
    }
}

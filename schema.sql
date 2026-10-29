-- ============================================================================
--  DELIVERY ROUTE OPTIMIZATION SYSTEM : DATABASE SCHEMA (SQLite)
--  Tables : locations, roads, drivers, vehicles, delivery_trips, trip_stops,
--           road_audit
--  Views  : v_active_roads, v_trip_summary
--  Trigger: trg_roads_insert, trg_roads_update  (automatic road audit log)
-- ============================================================================
PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------------------
--  1. LOCATIONS  (graph nodes)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS locations (
    location_id  INTEGER PRIMARY KEY AUTOINCREMENT,
    name         TEXT    NOT NULL UNIQUE COLLATE NOCASE,
    loc_type     TEXT    NOT NULL DEFAULT 'CUSTOMER'
                 CHECK (loc_type IN ('WAREHOUSE', 'CUSTOMER', 'LANDMARK')),
    created_at   TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
);

-- ---------------------------------------------------------------------------
--  2. ROADS  (graph edges, one row per two-way road, loc_a < loc_b)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS roads (
    road_id          INTEGER PRIMARY KEY AUTOINCREMENT,
    loc_a            INTEGER NOT NULL REFERENCES locations(location_id) ON DELETE CASCADE,
    loc_b            INTEGER NOT NULL REFERENCES locations(location_id) ON DELETE CASCADE,
    distance_km      REAL    NOT NULL CHECK (distance_km > 0),
    travel_time_min  REAL    NOT NULL CHECK (travel_time_min > 0),
    is_active        INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    CHECK (loc_a < loc_b),
    UNIQUE (loc_a, loc_b)
);
CREATE INDEX IF NOT EXISTS idx_roads_loc_b ON roads(loc_b);

-- ---------------------------------------------------------------------------
--  3. DRIVERS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS drivers (
    driver_id  INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    phone      TEXT NOT NULL UNIQUE CHECK (length(phone) BETWEEN 7 AND 15)
);

-- ---------------------------------------------------------------------------
--  4. VEHICLES
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vehicles (
    vehicle_id    INTEGER PRIMARY KEY AUTOINCREMENT,
    reg_no        TEXT NOT NULL UNIQUE,
    vehicle_type  TEXT NOT NULL CHECK (vehicle_type IN ('BIKE', 'VAN', 'TRUCK')),
    capacity_kg   REAL NOT NULL CHECK (capacity_kg > 0)
);

-- ---------------------------------------------------------------------------
--  5. DELIVERY_TRIPS  (one row per planned / completed route)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS delivery_trips (
    trip_id     INTEGER PRIMARY KEY AUTOINCREMENT,
    driver_id   INTEGER REFERENCES drivers(driver_id)   ON DELETE SET NULL,
    vehicle_id  INTEGER REFERENCES vehicles(vehicle_id) ON DELETE SET NULL,
    depot_id    INTEGER NOT NULL REFERENCES locations(location_id) ON DELETE RESTRICT,
    criterion   TEXT    NOT NULL CHECK (criterion IN ('DISTANCE', 'TIME')),
    total_km    REAL    NOT NULL CHECK (total_km  >= 0),
    total_min   REAL    NOT NULL CHECK (total_min >= 0),
    route_text  TEXT    NOT NULL,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
);
CREATE INDEX IF NOT EXISTS idx_trips_driver ON delivery_trips(driver_id);

-- ---------------------------------------------------------------------------
--  6. TRIP_STOPS  (delivery stops of a trip, in the order they were served)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS trip_stops (
    trip_id      INTEGER NOT NULL REFERENCES delivery_trips(trip_id) ON DELETE CASCADE,
    stop_seq     INTEGER NOT NULL CHECK (stop_seq > 0),
    location_id  INTEGER NOT NULL REFERENCES locations(location_id) ON DELETE RESTRICT,
    PRIMARY KEY (trip_id, stop_seq)
);

-- ---------------------------------------------------------------------------
--  7. ROAD_AUDIT  (filled automatically by triggers)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS road_audit (
    audit_id    INTEGER PRIMARY KEY AUTOINCREMENT,
    road_id     INTEGER NOT NULL,
    action      TEXT    NOT NULL,
    details     TEXT,
    changed_at  TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
);

-- ---------------------------------------------------------------------------
--  TRIGGERS
-- ---------------------------------------------------------------------------
CREATE TRIGGER IF NOT EXISTS trg_roads_insert
AFTER INSERT ON roads
BEGIN
    INSERT INTO road_audit (road_id, action, details)
    VALUES (NEW.road_id, 'ADDED',
            printf('%.1f km, %.1f min', NEW.distance_km, NEW.travel_time_min));
END;

CREATE TRIGGER IF NOT EXISTS trg_roads_update
AFTER UPDATE OF distance_km, travel_time_min, is_active ON roads
BEGIN
    INSERT INTO road_audit (road_id, action, details)
    VALUES (NEW.road_id,
            CASE WHEN OLD.is_active = 1 AND NEW.is_active = 0 THEN 'CLOSED'
                 WHEN OLD.is_active = 0 AND NEW.is_active = 1 THEN 'REOPENED'
                 ELSE 'UPDATED' END,
            printf('%.1f km, %.1f min', NEW.distance_km, NEW.travel_time_min));
END;

-- ---------------------------------------------------------------------------
--  VIEWS
-- ---------------------------------------------------------------------------
CREATE VIEW IF NOT EXISTS v_active_roads AS
SELECT r.road_id,
       a.name AS from_location,
       b.name AS to_location,
       r.distance_km,
       r.travel_time_min,
       r.is_active
FROM   roads r
JOIN   locations a ON a.location_id = r.loc_a
JOIN   locations b ON b.location_id = r.loc_b;

CREATE VIEW IF NOT EXISTS v_trip_summary AS
SELECT t.trip_id,
       t.created_at,
       l.name                       AS depot,
       COALESCE(d.name, 'Unassigned') AS driver,
       COALESCE(v.reg_no, '-')        AS vehicle,
       t.criterion,
       (SELECT COUNT(*) FROM trip_stops s WHERE s.trip_id = t.trip_id) AS stops,
       t.total_km,
       t.total_min,
       t.route_text
FROM   delivery_trips t
JOIN   locations l      ON l.location_id = t.depot_id
LEFT JOIN drivers d     ON d.driver_id   = t.driver_id
LEFT JOIN vehicles v    ON v.vehicle_id  = t.vehicle_id;

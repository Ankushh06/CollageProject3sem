-- ============================================================================
--  DEMO QUERIES  (open delivery.db with:  sqlite3 delivery.db  then  .read queries.sql)
--  Covers: JOIN, GROUP BY / HAVING, aggregate functions, subqueries, views,
--          NOT EXISTS, transactions, triggers, constraints.
-- ============================================================================
.headers on
.mode column

-- Q1. All open roads with location names (uses VIEW v_active_roads)
SELECT from_location, to_location, distance_km, travel_time_min
FROM   v_active_roads
WHERE  is_active = 1
ORDER  BY distance_km;

-- Q2. Number of roads at every location (JOIN + GROUP BY) : busiest junctions first
SELECT l.name, COUNT(r.road_id) AS road_count
FROM   locations l
LEFT JOIN roads r ON l.location_id IN (r.loc_a, r.loc_b) AND r.is_active = 1
GROUP  BY l.location_id
ORDER  BY road_count DESC, l.name;

-- Q3. Locations having 4 or more roads (GROUP BY + HAVING)
SELECT l.name, COUNT(*) AS road_count
FROM   locations l
JOIN   roads r ON l.location_id IN (r.loc_a, r.loc_b)
WHERE  r.is_active = 1
GROUP  BY l.location_id
HAVING COUNT(*) >= 4;

-- Q4. Locations that are never used as a delivery stop (subquery with NOT IN)
SELECT name, loc_type
FROM   locations
WHERE  location_id NOT IN (SELECT location_id FROM trip_stops);

-- Q5. Trip history with driver and vehicle (uses VIEW v_trip_summary)
SELECT trip_id, depot, driver, vehicle, criterion, stops,
       ROUND(total_km, 1) AS km, ROUND(total_min, 1) AS minutes
FROM   v_trip_summary
ORDER  BY trip_id;

-- Q6. Driver performance report (LEFT JOIN + aggregate functions)
SELECT d.name,
       COUNT(t.trip_id)                         AS trips,
       ROUND(COALESCE(SUM(t.total_km), 0), 1)   AS total_km,
       ROUND(COALESCE(AVG(t.total_min), 0), 1)  AS avg_minutes
FROM   drivers d
LEFT JOIN delivery_trips t ON t.driver_id = d.driver_id
GROUP  BY d.driver_id
ORDER  BY trips DESC;

-- Q7. Drivers who have not done any trip (NOT EXISTS) - returns no rows while every driver has a trip
SELECT name
FROM   drivers d
WHERE  NOT EXISTS (SELECT 1 FROM delivery_trips t WHERE t.driver_id = d.driver_id);

-- Q8. Trips longer than the average trip distance (subquery)
SELECT trip_id, ROUND(total_km, 1) AS km
FROM   delivery_trips
WHERE  total_km > (SELECT AVG(total_km) FROM delivery_trips);

-- Q9. Distance driven per vehicle type (3-table JOIN + GROUP BY)
SELECT v.vehicle_type, COUNT(*) AS trips, ROUND(SUM(t.total_km), 1) AS total_km
FROM   delivery_trips t
JOIN   vehicles v ON v.vehicle_id = t.vehicle_id
GROUP  BY v.vehicle_type;

-- Q10. Delivery stops of one trip, in order (JOIN)
SELECT s.stop_seq, l.name AS location
FROM   trip_stops s
JOIN   locations l ON l.location_id = s.location_id
WHERE  s.trip_id = 3
ORDER  BY s.stop_seq;

-- Q11. Most delivered locations
SELECT l.name, COUNT(*) AS deliveries
FROM   trip_stops s
JOIN   locations l ON l.location_id = s.location_id
GROUP  BY l.location_id
ORDER  BY deliveries DESC, l.name;

-- Q12. Road change log filled automatically by the TRIGGERS
SELECT audit_id, road_id, action, details
FROM   road_audit
WHERE  action IN ('CLOSED', 'REOPENED', 'UPDATED');

-- ---------------------------------------------------------------------------
--  DML + TRIGGER + CONSTRAINT DEMO (wrapped in a transaction, then rolled back
--  so the database stays unchanged)
-- ---------------------------------------------------------------------------
BEGIN;
    -- closing a road fires trg_roads_update and writes a row in road_audit
    UPDATE roads SET is_active = 0
    WHERE  loc_a = (SELECT location_id FROM locations WHERE name = 'Market')
      AND  loc_b = (SELECT location_id FROM locations WHERE name = 'Mall');

    SELECT road_id, action, details FROM road_audit ORDER BY audit_id DESC LIMIT 1;
ROLLBACK;

-- Constraint demos (each statement below is REJECTED by the database):
-- INSERT INTO roads (loc_a, loc_b, distance_km, travel_time_min) VALUES (1, 2, -5, 10);   -- CHECK (distance_km > 0)
-- INSERT INTO roads (loc_a, loc_b, distance_km, travel_time_min) VALUES (5, 2, 5, 10);    -- CHECK (loc_a < loc_b)
-- INSERT INTO drivers (name, phone) VALUES ('Test', '9876500001');                         -- UNIQUE (phone)
-- INSERT INTO vehicles (reg_no, vehicle_type, capacity_kg) VALUES ('X1', 'PLANE', 10);     -- CHECK (vehicle_type)
-- DELETE FROM locations WHERE name = 'Warehouse';                                          -- RESTRICT: used by trips

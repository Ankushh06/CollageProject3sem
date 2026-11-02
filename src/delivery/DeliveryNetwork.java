package delivery;

import java.util.*;

/**
 * DeliveryNetwork: in-memory road network (graph) + Dijkstra's algorithm [DSA part]
 *
 * - Graph: Adjacency list (List<List<Edge>>)
 * - Min-heap: PriorityQueue<State> ordered by cost
 * - Hash map: Map<String, Integer> for O(1) location name to index lookup
 * - Dijkstra complexity: O((V + E) log V)
 */
public class DeliveryNetwork {
    public static final double INF = Double.POSITIVE_INFINITY;

    private final List<String> names = new ArrayList<>();
    private final List<String> types = new ArrayList<>();
    private final List<double[]> coords = new ArrayList<>(); // [x, y] coordinates
    private final Map<String, Integer> nameToId = new HashMap<>();
    private final List<List<Edge>> adj = new ArrayList<>();
    private Criterion criterion = Criterion.DISTANCE;

    public DeliveryNetwork() {}

    public synchronized void clear() {
        names.clear();
        types.clear();
        coords.clear();
        nameToId.clear();
        adj.clear();
    }

    public synchronized int size() {
        return names.size();
    }

    public synchronized Criterion getCriterion() {
        return criterion;
    }

    public synchronized void setCriterion(Criterion c) {
        this.criterion = c;
    }

    public synchronized String criterionName() {
        return criterion.getDisplayName();
    }

    public synchronized String criterionCode() {
        return criterion.getCode();
    }

    public synchronized int addLocation(String name, String type, double x, double y) {
        String lower = name.trim().toLowerCase();
        if (nameToId.containsKey(lower)) {
            int existingId = nameToId.get(lower);
            if (type != null && !type.isEmpty()) types.set(existingId, type);
            if (x > 0 && y > 0) coords.set(existingId, new double[]{x, y});
            return existingId;
        }
        int id = names.size();
        names.add(name.trim());
        types.add(type == null || type.isEmpty() ? "CUSTOMER" : type);
        coords.add(new double[]{x > 0 ? x : getDefaultX(id), y > 0 ? y : getDefaultY(id)});
        nameToId.put(lower, id);
        adj.add(new ArrayList<>());
        return id;
    }

    public synchronized int addLocation(String name, String type) {
        return addLocation(name, type, -1, -1);
    }

    public synchronized int addLocation(String name) {
        return addLocation(name, "CUSTOMER", -1, -1);
    }

    private double getDefaultX(int index) {
        // Layout nodes nicely if coordinates not supplied
        double[] defaultXs = {160, 340, 310, 490, 320, 570, 760, 150, 230, 680, 130, 430, 500, 840, 660, 390, 220, 790};
        if (index < defaultXs.length) return defaultXs[index];
        return 200 + (index * 73) % 650;
    }

    private double getDefaultY(int index) {
        double[] defaultYs = {240, 200, 80, 80, 390, 210, 130, 380, 460, 260, 90, 270, 370, 230, 430, 490, 310, 370};
        if (index < defaultYs.length) return defaultYs[index];
        return 120 + (index * 91) % 450;
    }

    public synchronized int findId(String name) {
        if (name == null) return -1;
        Integer id = nameToId.get(name.trim().toLowerCase());
        return id != null ? id : -1;
    }

    public synchronized String nameOf(int id) {
        return (id >= 0 && id < names.size()) ? names.get(id) : "";
    }

    public synchronized String typeOf(int id) {
        return (id >= 0 && id < types.size()) ? types.get(id) : "CUSTOMER";
    }

    public synchronized double[] coordsOf(int id) {
        return (id >= 0 && id < coords.size()) ? coords.get(id) : new double[]{100, 100};
    }

    public synchronized void setCoordinates(int id, double x, double y) {
        if (id >= 0 && id < coords.size()) {
            coords.set(id, new double[]{x, y});
        }
    }

    public synchronized void addRoad(int u, int v, double km, double mins) {
        if (u < 0 || u >= size() || v < 0 || v >= size() || u == v) return;
        removeRoad(u, v);
        adj.get(u).add(new Edge(v, km, mins));
        adj.get(v).add(new Edge(u, km, mins));
    }

    public synchronized void removeRoad(int u, int v) {
        if (u < 0 || u >= size() || v < 0 || v >= size()) return;
        adj.get(u).removeIf(e -> e.to == v);
        adj.get(v).removeIf(e -> e.to == u);
    }

    public synchronized double weight(Edge e) {
        return criterion == Criterion.DISTANCE ? e.distance : e.time;
    }

    public synchronized List<Edge> getNeighbors(int u) {
        return (u >= 0 && u < adj.size()) ? new ArrayList<>(adj.get(u)) : Collections.emptyList();
    }

    // ---- Dijkstra's Algorithm ------------------------------------------------
    private static class State implements Comparable<State> {
        final double cost;
        final int node;

        State(double cost, int node) {
            this.cost = cost;
            this.node = node;
        }

        @Override
        public int compareTo(State o) {
            return Double.compare(this.cost, o.cost);
        }
    }

    public synchronized DijkstraResult dijkstra(int src) {
        int n = size();
        DijkstraResult r = new DijkstraResult(n);
        if (src < 0 || src >= n) return r;

        PriorityQueue<State> pq = new PriorityQueue<>();
        r.dist[src] = 0.0;
        pq.add(new State(0.0, src));

        while (!pq.isEmpty()) {
            State top = pq.poll();
            double d = top.cost;
            int u = top.node;
            if (d > r.dist[u]) continue; // Stale heap entry

            for (Edge e : adj.get(u)) {
                double nd = d + weight(e);
                if (nd < r.dist[e.to]) { // Relaxation
                    r.dist[e.to] = nd;
                    r.parent[e.to] = u;
                    pq.add(new State(nd, e.to));
                }
            }
        }
        return r;
    }

    public synchronized List<Integer> buildPath(DijkstraResult r, int dst) {
        List<Integer> path = new ArrayList<>();
        if (dst < 0 || dst >= size() || r.dist[dst] == INF) return path;

        for (int cur = dst; cur != -1; cur = r.parent[cur]) {
            path.add(cur);
        }
        Collections.reverse(path);
        return path;
    }

    public synchronized double[] pathTotals(List<Integer> path) {
        double km = 0, mins = 0;
        for (int i = 0; i + 1 < path.size(); i++) {
            int u = path.get(i);
            int v = path.get(i + 1);
            for (Edge e : adj.get(u)) {
                if (e.to == v) {
                    km += e.distance;
                    mins += e.time;
                    break;
                }
            }
        }
        return new double[]{km, mins};
    }

    public synchronized String pathToString(List<Integer> path) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < path.size(); i++) {
            if (i > 0) sb.append(" -> ");
            sb.append(names.get(path.get(i)));
        }
        return sb.toString();
    }

    // ---- Single Route: A -> B ------------------------------------------------
    public synchronized TripPlan shortestRoute(int src, int dst) {
        TripPlan plan = new TripPlan();
        if (src < 0 || src >= size() || dst < 0 || dst >= size()) return plan;

        DijkstraResult r = dijkstra(src);
        List<Integer> path = buildPath(r, dst);

        if (path.isEmpty()) return plan;

        double[] totals = pathTotals(path);
        plan.valid = (path.size() >= 2);
        plan.depot = src;
        plan.order = Collections.singletonList(dst);
        plan.fullRoute = path;
        plan.km = totals[0];
        plan.minutes = totals[1];
        return plan;
    }

    // ---- Multi-Stop Route: Nearest-Neighbor with Dijkstra Legs ---------------
    public synchronized TripPlan planDelivery(int depot, List<Integer> requestedStops, boolean returnToDepot) {
        TripPlan plan = new TripPlan();
        if (depot < 0 || depot >= size() || requestedStops == null || requestedStops.isEmpty()) {
            return plan;
        }

        List<Integer> stops = new ArrayList<>();
        for (int s : requestedStops) {
            if (s >= 0 && s < size() && s != depot && !stops.contains(s)) {
                stops.add(s);
            }
        }
        if (stops.isEmpty()) return plan;

        plan.depot = depot;
        plan.fullRoute.add(depot);
        int current = depot;

        while (!stops.isEmpty()) {
            DijkstraResult r = dijkstra(current);
            int bestIdx = -1;
            for (int i = 0; i < stops.size(); i++) {
                int s = stops.get(i);
                if (r.dist[s] == INF) continue;
                if (bestIdx == -1 || r.dist[s] < r.dist[stops.get(bestIdx)]) {
                    bestIdx = i;
                }
            }

            if (bestIdx == -1) {
                // Remaining stops are unreachable from current location
                break;
            }

            int next = stops.get(bestIdx);
            List<Integer> leg = buildPath(r, next);
            double[] legTotals = pathTotals(leg);

            plan.km += legTotals[0];
            plan.minutes += legTotals[1];
            for (int i = 1; i < leg.size(); i++) {
                plan.fullRoute.add(leg.get(i));
            }
            plan.order.add(next);
            stops.remove(bestIdx);
            current = next;
        }

        if (returnToDepot && current != depot) {
            DijkstraResult r = dijkstra(current);
            List<Integer> leg = buildPath(r, depot);
            if (!leg.isEmpty() && leg.size() >= 2) {
                double[] legTotals = pathTotals(leg);
                plan.km += legTotals[0];
                plan.minutes += legTotals[1];
                for (int i = 1; i < leg.size(); i++) {
                    plan.fullRoute.add(leg.get(i));
                }
            }
        }

        plan.valid = !plan.order.isEmpty();
        return plan;
    }

    // ---- Console Helper Displays --------------------------------------------
    public synchronized void showNetwork() {
        if (size() == 0) {
            System.out.println("  Network is empty.");
            return;
        }
        System.out.println("\n  Locations: " + size());
        System.out.println("  ----------------------------------------------");
        for (int u = 0; u < size(); u++) {
            System.out.println("  [" + u + "] " + names.get(u) + " (" + types.get(u) + ")");
            if (adj.get(u).isEmpty()) {
                System.out.println("        (no roads)");
            }
            for (Edge e : adj.get(u)) {
                System.out.printf("        -> %-20s %6.1f km %7.1f min%n",
                        names.get(e.to), e.distance, e.time);
            }
        }
    }

    public synchronized void showLocationList() {
        for (int i = 0; i < size(); i++) {
            System.out.println("   " + i + ". " + names.get(i) + " [" + types.get(i) + "]");
        }
    }

    public synchronized void distancesFrom(int src) {
        if (src < 0 || src >= size()) return;
        DijkstraResult r = dijkstra(src);
        System.out.println("\n  Shortest paths from: " + names.get(src));
        System.out.println("  -------------------------------------------------------------");
        System.out.printf("  %-20s %-12s %s%n", "Destination", "Best Cost", "Full Path");
        System.out.println("  -------------------------------------------------------------");
        for (int i = 0; i < size(); i++) {
            if (i == src) continue;
            System.out.printf("  %-20s ", names.get(i));
            if (r.dist[i] == INF) {
                System.out.printf("%-12s %s%n", "unreachable", "-");
            } else {
                String unit = criterion == Criterion.DISTANCE ? "km" : "min";
                System.out.printf("%6.1f %-5s %s%n", r.dist[i], unit, pathToString(buildPath(r, i)));
            }
        }
    }

    public synchronized List<Map<String, Object>> getLocationsJsonList() {
        List<Map<String, Object>> list = new ArrayList<>();
        for (int i = 0; i < size(); i++) {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("id", i);
            map.put("name", names.get(i));
            map.put("type", types.get(i));
            map.put("x", coords.get(i)[0]);
            map.put("y", coords.get(i)[1]);
            map.put("roadCount", adj.get(i).size());
            list.add(map);
        }
        return list;
    }
}

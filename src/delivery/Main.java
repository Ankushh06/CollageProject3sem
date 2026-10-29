package delivery;

import java.util.*;

/**
 * Main: Interactive Menu + Web Server Launcher for Delivery Route Optimization System
 */
public class Main {
    private static final Scanner scanner = new Scanner(System.in);

    private static String readLine(String prompt) {
        System.out.print(prompt);
        if (!scanner.hasNextLine()) {
            System.out.println();
            System.exit(0);
        }
        return scanner.nextLine().trim();
    }

    private static int readInt(String prompt) {
        while (true) {
            String s = readLine(prompt);
            try {
                return Integer.parseInt(s);
            } catch (NumberFormatException ignored) {}
            System.out.println("  Invalid number, try again.");
        }
    }

    private static double readPositiveDouble(String prompt) {
        while (true) {
            String s = readLine(prompt);
            try {
                double v = Double.parseDouble(s);
                if (v > 0) return v;
            } catch (NumberFormatException ignored) {}
            System.out.println("  Enter a positive number.");
        }
    }

    private static boolean askYes(String prompt) {
        String a = readLine(prompt).toLowerCase();
        return a.equals("y") || a.equals("yes");
    }

    private static int askLocation(DeliveryNetwork net, String prompt) {
        while (true) {
            String s = readLine(prompt + " (name or number): ");
            if (s.isEmpty()) {
                System.out.println("  Cancelled.");
                return -1;
            }
            int id = net.findId(s);
            if (id != -1) return id;
            try {
                int v = Integer.parseInt(s);
                if (v >= 0 && v < net.size()) return v;
            } catch (NumberFormatException ignored) {}
            System.out.println("  Location not found. Press Enter to cancel.");
        }
    }

    private static int askOptionalId(String prompt, boolean isDriver, Database db) {
        while (true) {
            int id = readInt(prompt);
            if (id == 0) return 0;
            if (isDriver ? db.driverExists(id) : db.vehicleExists(id)) return id;
            System.out.println("  No record with that ID. Enter a listed ID, or 0 for none.");
        }
    }

    private static void offerSaveTrip(Database db, DeliveryNetwork net, TripPlan plan) {
        if (!plan.valid) return;
        if (!askYes("\n  Save this trip to the database? (y/n): ")) return;

        System.out.println("\n  Drivers:");
        db.listDrivers();
        int driver = askOptionalId("  Driver ID (0 = unassigned): ", true, db);

        System.out.println("\n  Vehicles:");
        db.listVehicles();
        int vehicle = askOptionalId("  Vehicle ID (0 = unassigned): ", false, db);

        List<String> stopNames = new ArrayList<>();
        for (int s : plan.order) stopNames.add(net.nameOf(s));

        int id = db.saveTrip(net.nameOf(plan.depot), stopNames, net.criterionCode(),
                             plan.km, plan.minutes, net.pathToString(plan.fullRoute),
                             driver > 0 ? driver : null, vehicle > 0 ? vehicle : null);
        if (id > 0) {
            System.out.println("  Trip #" + id + " saved (see option 12 for trip history).");
        } else {
            System.out.println("  Could not save the trip.");
        }
    }

    private static void printMenu(DeliveryNetwork net) {
        System.out.println("\n==============================================");
        System.out.println("   DELIVERY ROUTE OPTIMIZATION SYSTEM");
        System.out.println("   Dijkstra's Algorithm + SQLite Database (Java)");
        System.out.println("==============================================");
        System.out.println("  Mode: " + net.criterionName());
        System.out.println("----------------------------------------------");
        System.out.println("  ROUTES");
        System.out.println("   1. Add a location");
        System.out.println("   2. Add / update a road");
        System.out.println("   3. Close a road (road closure)");
        System.out.println("   4. Show network");
        System.out.println("   5. Find best route (A -> B)");
        System.out.println("   6. Best cost from one location to all");
        System.out.println("   7. Plan multi-stop delivery");
        System.out.println("   8. Switch optimisation mode (distance / time)");
        System.out.println("   9. Load sample city");
        System.out.println("  DATABASE");
        System.out.println("  10. Add a driver");
        System.out.println("  11. Add a vehicle");
        System.out.println("  12. Trip history");
        System.out.println("  13. Driver performance report");
        System.out.println("  14. Most delivered locations");
        System.out.println("  15. Road change log (audit trail)");
        System.out.println("  16. Reopen a closed road");
        System.out.println("   0. Exit");
        System.out.println("----------------------------------------------");
    }

    public static void main(String[] args) {
        DeliveryNetwork net = new DeliveryNetwork();
        Database db = new Database();

        if (!db.open("delivery.db")) {
            System.err.println("Could not open the database file delivery.db");
            return;
        }

        int activeRoads = db.loadInto(net);
        if (net.size() == 0) {
            SampleDataLoader.loadSampleData(db, net);
            activeRoads = db.loadInto(net);
        }

        // Start embedded web server
        int port = 8080;
        try {
            WebServer webServer = new WebServer(port, net, db, "web");
            webServer.start();
        } catch (Exception e) {
            System.err.println("Note: Web server could not bind to port " + port + ": " + e.getMessage());
        }

        System.out.println("Database connected (delivery.db): " + net.size() + " locations, "
                + activeRoads + " active roads loaded.");

        // Check if server-only flag is set
        for (String arg : args) {
            if ("--server".equalsIgnoreCase(arg) || "--web".equalsIgnoreCase(arg)) {
                System.out.println("Running in web server mode. Press Ctrl+C to exit.");
                try {
                    Thread.currentThread().join();
                } catch (InterruptedException ignored) {}
                return;
            }
        }

        // Interactive CLI Menu loop
        while (true) {
            printMenu(net);
            int choice = readInt("Enter choice: ");

            if (choice == 0) {
                System.out.println("Goodbye!");
                db.close();
                System.exit(0);
            }

            if (choice == 9) {
                if (askYes("  This replaces all current locations, roads and saved trips. Continue? (y/n): ")) {
                    SampleDataLoader.loadSampleData(db, net);
                    System.out.println("  Sample city reloaded: " + net.size() + " locations.");
                }
                continue;
            }

            if (choice == 8) {
                boolean toTime = (net.getCriterion() == Criterion.DISTANCE);
                net.setCriterion(toTime ? Criterion.TIME : Criterion.DISTANCE);
                System.out.println("  Now optimising for: " + net.criterionName());
                continue;
            }

            if (choice == 1) {
                String name = readLine("  Location name: ");
                String t = readLine("  Type (c = customer, l = landmark, w = warehouse) [c]: ").toLowerCase();
                String type = t.equals("w") ? "WAREHOUSE" : t.equals("l") ? "LANDMARK" : "CUSTOMER";
                if (name.isEmpty() || !db.addLocation(name, type)) {
                    System.out.println("  Name is empty or already exists.");
                } else {
                    net.addLocation(name, type);
                    System.out.println("  Added '" + name + "' (" + type + ") to the database.");
                }
                continue;
            }

            if (choice == 10) {
                String name = readLine("  Driver name: ");
                String phone = readLine("  Phone number (digits only): ");
                if (name.isEmpty() || phone.length() < 7 || phone.length() > 15 || !db.addDriver(name, phone)) {
                    System.out.println("  Could not add driver (phone must be 7-15 digits and unique).");
                } else {
                    System.out.println("  Driver added.");
                }
                continue;
            }

            if (choice == 11) {
                String reg = readLine("  Registration number: ");
                String t = readLine("  Type (b = bike, v = van, t = truck) [v]: ").toLowerCase();
                String type = t.equals("b") ? "BIKE" : t.equals("t") ? "TRUCK" : "VAN";
                double cap = readPositiveDouble("  Capacity (kg): ");
                if (reg.isEmpty() || !db.addVehicle(reg, type, cap)) {
                    System.out.println("  Could not add vehicle (registration must be unique).");
                } else {
                    System.out.println("  Vehicle added.");
                }
                continue;
            }

            if (choice == 12) { db.tripHistory(); continue; }
            if (choice == 13) { db.driverPerformance(); continue; }
            if (choice == 14) { db.topLocations(); continue; }
            if (choice == 15) { db.roadLog(); continue; }

            boolean needsMap = (choice >= 2 && choice <= 7 && choice != 4) || choice == 16;
            if (needsMap && net.size() < 2) {
                System.out.println("  Add at least two locations first (or load the sample city).");
                continue;
            }

            switch (choice) {
                case 2: {
                    net.showLocationList();
                    int u = askLocation(net, "  From"); if (u == -1) break;
                    int v = askLocation(net, "  To");   if (v == -1) break;
                    if (u == v) {
                        System.out.println("  A road must connect two different places.");
                        break;
                    }
                    double km = readPositiveDouble("  Distance (km): ");
                    double mins = readPositiveDouble("  Travel time (min): ");
                    if (db.upsertRoad(net.nameOf(u), net.nameOf(v), km, mins)) {
                        net.addRoad(u, v, km, mins);
                        System.out.println("  Road saved: " + net.nameOf(u) + " <-> " + net.nameOf(v));
                    } else {
                        System.out.println("  Could not save the road.");
                    }
                    break;
                }
                case 3: {
                    net.showLocationList();
                    int u = askLocation(net, "  From"); if (u == -1) break;
                    int v = askLocation(net, "  To");   if (v == -1) break;
                    if (db.setRoadActive(net.nameOf(u), net.nameOf(v), false)) {
                        net.removeRoad(u, v);
                        System.out.println("  Road closed (kept in the database, can be reopened with option 16).");
                    } else {
                        System.out.println("  No open road between these two locations.");
                    }
                    break;
                }
                case 4:
                    net.showNetwork();
                    break;
                case 5: {
                    net.showLocationList();
                    int s = askLocation(net, "  Source"); if (s == -1) break;
                    int d = askLocation(net, "  Destination"); if (d == -1) break;
                    TripPlan plan = net.shortestRoute(s, d);
                    System.out.println("\n  Optimising for: " + net.criterionName());
                    if (!plan.valid) {
                        System.out.println("  No route exists between " + net.nameOf(s) + " and " + net.nameOf(d) + ".");
                    } else {
                        System.out.println("  Route    : " + net.pathToString(plan.fullRoute));
                        System.out.println("  Distance : " + String.format("%.1f", plan.km) + " km");
                        System.out.println("  Time     : " + String.format("%.1f", plan.minutes) + " min");
                        offerSaveTrip(db, net, plan);
                    }
                    break;
                }
                case 6: {
                    net.showLocationList();
                    int s = askLocation(net, "  Source"); if (s == -1) break;
                    net.distancesFrom(s);
                    break;
                }
                case 7: {
                    net.showLocationList();
                    int depot = askLocation(net, "  Depot / warehouse"); if (depot == -1) break;
                    int k = readInt("  How many delivery stops? ");
                    List<Integer> stops = new ArrayList<>();
                    for (int i = 0; i < k; i++) {
                        int s = askLocation(net, "  Stop " + (i + 1));
                        if (s == -1) break;
                        if (s == depot || stops.contains(s)) {
                            System.out.println("  Already included, skipped.");
                            continue;
                        }
                        stops.add(s);
                    }
                    if (stops.isEmpty()) {
                        System.out.println("  No stops entered.");
                        break;
                    }
                    boolean back = askYes("  Return to depot at the end? (y/n): ");
                    TripPlan plan = net.planDelivery(depot, stops, back);
                    if (!plan.valid) {
                        System.out.println("  Could not plan route.");
                    } else {
                        System.out.println("\n  Optimising for: " + net.criterionName());
                        System.out.print("  Delivery order : " + net.nameOf(depot));
                        for (int s : plan.order) System.out.print(" => " + net.nameOf(s));
                        if (back) System.out.print(" => " + net.nameOf(depot));
                        System.out.println("\n  Full road route: " + net.pathToString(plan.fullRoute));
                        System.out.println("  Total distance : " + String.format("%.1f", plan.km) + " km");
                        System.out.println("  Total time     : " + String.format("%.1f", plan.minutes) + " min");
                        offerSaveTrip(db, net, plan);
                    }
                    break;
                }
                case 16: {
                    if (db.closedRoadCount() <= 0) {
                        System.out.println("  No closed roads.");
                        break;
                    }
                    db.closedRoads();
                    System.out.println();
                    int u = askLocation(net, "  From"); if (u == -1) break;
                    int v = askLocation(net, "  To");   if (v == -1) break;
                    if (db.setRoadActive(net.nameOf(u), net.nameOf(v), true)) {
                        // find distance and time
                        for (Map<String, Object> r : db.getAllRoadsList()) {
                            if ((net.nameOf(u).equalsIgnoreCase(String.valueOf(r.get("locA"))) &&
                                 net.nameOf(v).equalsIgnoreCase(String.valueOf(r.get("locB")))) ||
                                (net.nameOf(v).equalsIgnoreCase(String.valueOf(r.get("locA"))) &&
                                 net.nameOf(u).equalsIgnoreCase(String.valueOf(r.get("locB"))))) {
                                net.addRoad(u, v, ((Number) r.get("distanceKm")).doubleValue(),
                                                  ((Number) r.get("travelTimeMin")).doubleValue());
                                break;
                            }
                        }
                        System.out.println("  Road reopened.");
                    } else {
                        System.out.println("  That road is not in the closed list.");
                    }
                    break;
                }
                default:
                    System.out.println("  Invalid choice.");
            }
        }
    }
}

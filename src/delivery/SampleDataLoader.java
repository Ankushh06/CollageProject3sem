package delivery;

public class SampleDataLoader {

    public static class SampleLocation {
        public final String name;
        public final String type;
        public final double x;
        public final double y;

        public SampleLocation(String name, String type, double x, double y) {
            this.name = name;
            this.type = type;
            this.x = x;
            this.y = y;
        }
    }

    public static class SampleRoad {
        public final String a;
        public final String b;
        public final double km;
        public final double min;

        public SampleRoad(String a, String b, double km, double min) {
            this.a = a;
            this.b = b;
            this.km = km;
            this.min = min;
        }
    }

    public static final SampleLocation[] SAMPLE_LOCATIONS = {
        new SampleLocation("Warehouse", "WAREHOUSE", 160, 240),
        new SampleLocation("Market", "CUSTOMER", 340, 200),
        new SampleLocation("Hospital", "CUSTOMER", 310, 80),
        new SampleLocation("University", "CUSTOMER", 490, 80),
        new SampleLocation("Railway Station", "LANDMARK", 320, 390),
        new SampleLocation("Mall", "CUSTOMER", 570, 210),
        new SampleLocation("Airport", "LANDMARK", 760, 130),
        new SampleLocation("Bus Stand", "LANDMARK", 150, 380),
        new SampleLocation("Old City", "CUSTOMER", 230, 460),
        new SampleLocation("Tech Park", "CUSTOMER", 680, 260)
    };

    public static final SampleRoad[] SAMPLE_ROADS = {
        new SampleRoad("Warehouse", "Market", 4, 12),
        new SampleRoad("Warehouse", "Hospital", 7, 14),
        new SampleRoad("Warehouse", "Bus Stand", 3, 10),
        new SampleRoad("Market", "Hospital", 2, 8),
        new SampleRoad("Market", "Old City", 5, 20),
        new SampleRoad("Market", "Mall", 6, 15),
        new SampleRoad("Hospital", "University", 4, 9),
        new SampleRoad("Hospital", "Railway Station", 8, 22),
        new SampleRoad("University", "Tech Park", 5, 11),
        new SampleRoad("University", "Mall", 3, 10),
        new SampleRoad("Railway Station", "Old City", 3, 12),
        new SampleRoad("Railway Station", "Bus Stand", 6, 18),
        new SampleRoad("Mall", "Tech Park", 4, 9),
        new SampleRoad("Mall", "Airport", 11, 25),
        new SampleRoad("Tech Park", "Airport", 9, 16),
        new SampleRoad("Old City", "Bus Stand", 5, 15)
    };

    public static void loadSampleData(Database db, DeliveryNetwork net) {
        db.resetMapData();
        for (SampleLocation loc : SAMPLE_LOCATIONS) {
            db.addLocation(loc.name, loc.type);
            net.addLocation(loc.name, loc.type, loc.x, loc.y);
        }
        for (SampleRoad r : SAMPLE_ROADS) {
            db.upsertRoad(r.a, r.b, r.km, r.min);
        }

        // Add standard sample drivers
        db.addDriver("Ravi Kumar", "9876500001");
        db.addDriver("Amit Singh", "9876500002");
        db.addDriver("Neha Sharma", "9876500003");

        // Add standard sample vehicles
        db.addVehicle("PB-01-AA-1001", "VAN", 800);
        db.addVehicle("PB-01-AA-1002", "BIKE", 40);
        db.addVehicle("PB-01-AA-1003", "TRUCK", 3000);

        // Load into net graph
        db.loadInto(net);
        // Ensure coordinates are preserved
        for (SampleLocation loc : SAMPLE_LOCATIONS) {
            int id = net.findId(loc.name);
            if (id != -1) {
                net.setCoordinates(id, loc.x, loc.y);
            }
        }
    }
}

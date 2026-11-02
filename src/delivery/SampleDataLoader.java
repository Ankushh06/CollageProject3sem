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
        new SampleLocation("Tech Park", "CUSTOMER", 680, 260),
        new SampleLocation("Cargo Hub", "WAREHOUSE", 130, 90),
        new SampleLocation("City Center", "CUSTOMER", 430, 270),
        new SampleLocation("Financial District", "CUSTOMER", 500, 370),
        new SampleLocation("Port Terminal", "LANDMARK", 840, 230),
        new SampleLocation("Industrial Estate", "WAREHOUSE", 660, 430),
        new SampleLocation("Sports Complex", "LANDMARK", 390, 490),
        new SampleLocation("Metro Station", "LANDMARK", 220, 310),
        new SampleLocation("Eco Park", "CUSTOMER", 790, 370)
    };

    public static final SampleRoad[] SAMPLE_ROADS = {
        new SampleRoad("Warehouse", "Market", 4.0, 12.0),
        new SampleRoad("Warehouse", "Hospital", 7.0, 14.0),
        new SampleRoad("Warehouse", "Bus Stand", 3.0, 10.0),
        new SampleRoad("Market", "Hospital", 2.0, 8.0),
        new SampleRoad("Market", "Old City", 5.0, 20.0),
        new SampleRoad("Market", "Mall", 6.0, 15.0),
        new SampleRoad("Hospital", "University", 4.0, 9.0),
        new SampleRoad("Hospital", "Railway Station", 8.0, 22.0),
        new SampleRoad("University", "Tech Park", 5.0, 11.0),
        new SampleRoad("University", "Mall", 3.0, 10.0),
        new SampleRoad("Railway Station", "Old City", 3.0, 12.0),
        new SampleRoad("Railway Station", "Bus Stand", 6.0, 18.0),
        new SampleRoad("Mall", "Tech Park", 4.0, 9.0),
        new SampleRoad("Mall", "Airport", 11.0, 25.0),
        new SampleRoad("Tech Park", "Airport", 9.0, 16.0),
        new SampleRoad("Old City", "Bus Stand", 5.0, 15.0),
        new SampleRoad("Cargo Hub", "Warehouse", 3.5, 8.0),
        new SampleRoad("Cargo Hub", "Hospital", 4.5, 11.0),
        new SampleRoad("Metro Station", "Warehouse", 2.5, 7.0),
        new SampleRoad("Metro Station", "Market", 3.0, 8.0),
        new SampleRoad("Metro Station", "Bus Stand", 2.0, 6.0),
        new SampleRoad("Metro Station", "Railway Station", 3.5, 9.0),
        new SampleRoad("City Center", "Market", 2.5, 7.0),
        new SampleRoad("City Center", "Mall", 3.0, 8.0),
        new SampleRoad("City Center", "Railway Station", 3.5, 10.0),
        new SampleRoad("City Center", "University", 4.0, 10.0),
        new SampleRoad("Financial District", "City Center", 2.0, 6.0),
        new SampleRoad("Financial District", "Railway Station", 4.0, 11.0),
        new SampleRoad("Financial District", "Mall", 4.5, 12.0),
        new SampleRoad("Financial District", "Industrial Estate", 4.0, 10.0),
        new SampleRoad("Sports Complex", "Railway Station", 3.0, 8.0),
        new SampleRoad("Sports Complex", "Old City", 3.5, 10.0),
        new SampleRoad("Sports Complex", "Financial District", 3.5, 9.0),
        new SampleRoad("Industrial Estate", "Tech Park", 4.5, 12.0),
        new SampleRoad("Industrial Estate", "Eco Park", 3.5, 9.0),
        new SampleRoad("Industrial Estate", "Sports Complex", 6.0, 16.0),
        new SampleRoad("Port Terminal", "Airport", 5.0, 10.0),
        new SampleRoad("Port Terminal", "Tech Park", 4.0, 9.0),
        new SampleRoad("Port Terminal", "Eco Park", 4.5, 11.0),
        new SampleRoad("Eco Park", "Tech Park", 5.0, 12.0)
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

    public static void main(String[] args) {
        Database db = new Database();
        if (db.open("delivery.db")) {
            DeliveryNetwork net = new DeliveryNetwork();
            loadSampleData(db, net);
            System.out.println("Loaded " + net.size() + " locations into " + db.getEngineDetails());
        }
    }
}

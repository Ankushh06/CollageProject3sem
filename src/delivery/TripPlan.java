package delivery;

import java.util.ArrayList;
import java.util.List;

public class TripPlan {
    public boolean valid = false;
    public int depot = -1;
    public List<Integer> order = new ArrayList<>();     // delivery stops in served sequence
    public List<Integer> fullRoute = new ArrayList<>(); // complete node path driven
    public double km = 0;
    public double minutes = 0;

    public TripPlan() {}

    public TripPlan(boolean valid, int depot, List<Integer> order, List<Integer> fullRoute, double km, double minutes) {
        this.valid = valid;
        this.depot = depot;
        this.order = order;
        this.fullRoute = fullRoute;
        this.km = km;
        this.minutes = minutes;
    }
}

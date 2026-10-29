package delivery;

public class Edge {
    public final int to;
    public final double distance; // kilometres
    public final double time;     // minutes

    public Edge(int to, double distance, double time) {
        this.to = to;
        this.distance = distance;
        this.time = time;
    }
}

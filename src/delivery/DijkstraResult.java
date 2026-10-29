package delivery;

import java.util.Arrays;

public class DijkstraResult {
    public final double[] dist;   // dist[v] = best cost from source to v
    public final int[] parent;    // parent[v] = predecessor on best path

    public DijkstraResult(int n) {
        this.dist = new double[n];
        Arrays.fill(this.dist, Double.POSITIVE_INFINITY);
        this.parent = new int[n];
        Arrays.fill(this.parent, -1);
    }
}

package delivery;

public enum Criterion {
    DISTANCE("Shortest DISTANCE (km)", "DISTANCE"),
    TIME("Fastest TIME (minutes)", "TIME");

    private final String displayName;
    private final String code;

    Criterion(String displayName, String code) {
        this.displayName = displayName;
        this.code = code;
    }

    public String getDisplayName() {
        return displayName;
    }

    public String getCode() {
        return code;
    }
}

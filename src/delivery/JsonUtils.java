package delivery;

import java.util.*;

/**
 * Lightweight JSON parser and serializer for Java with zero dependencies.
 */
public class JsonUtils {

    public static String toJson(Object obj) {
        if (obj == null) return "null";
        if (obj instanceof String) return quote((String) obj);
        if (obj instanceof Number || obj instanceof Boolean) return obj.toString();
        if (obj instanceof Map) {
            Map<?, ?> map = (Map<?, ?>) obj;
            StringBuilder sb = new StringBuilder("{");
            boolean first = true;
            for (Map.Entry<?, ?> entry : map.entrySet()) {
                if (!first) sb.append(",");
                first = false;
                sb.append(quote(String.valueOf(entry.getKey()))).append(":");
                sb.append(toJson(entry.getValue()));
            }
            sb.append("}");
            return sb.toString();
        }
        if (obj instanceof Collection) {
            Collection<?> col = (Collection<?>) obj;
            StringBuilder sb = new StringBuilder("[");
            boolean first = true;
            for (Object item : col) {
                if (!first) sb.append(",");
                first = false;
                sb.append(toJson(item));
            }
            sb.append("]");
            return sb.toString();
        }
        if (obj instanceof double[]) {
            double[] arr = (double[]) obj;
            StringBuilder sb = new StringBuilder("[");
            for (int i = 0; i < arr.length; i++) {
                if (i > 0) sb.append(",");
                sb.append(arr[i]);
            }
            sb.append("]");
            return sb.toString();
        }
        if (obj instanceof int[]) {
            int[] arr = (int[]) obj;
            StringBuilder sb = new StringBuilder("[");
            for (int i = 0; i < arr.length; i++) {
                if (i > 0) sb.append(",");
                sb.append(arr[i]);
            }
            sb.append("]");
            return sb.toString();
        }
        return quote(obj.toString());
    }

    private static String quote(String s) {
        if (s == null) return "null";
        StringBuilder sb = new StringBuilder("\"");
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            switch (c) {
                case '"': sb.append("\\\""); break;
                case '\\': sb.append("\\\\"); break;
                case '\b': sb.append("\\b"); break;
                case '\f': sb.append("\\f"); break;
                case '\n': sb.append("\\n"); break;
                case '\r': sb.append("\\r"); break;
                case '\t': sb.append("\\t"); break;
                default:
                    if (c < ' ') {
                        sb.append(String.format("\\u%04x", (int) c));
                    } else {
                        sb.append(c);
                    }
            }
        }
        sb.append("\"");
        return sb.toString();
    }

    // Simple JSON Object Parser
    public static Map<String, Object> parseObject(String json) {
        if (json == null) return Collections.emptyMap();
        json = json.trim();
        if (!json.startsWith("{") || !json.endsWith("}")) return Collections.emptyMap();

        Map<String, Object> map = new LinkedHashMap<>();
        int i = 1;
        int len = json.length() - 1;

        while (i < len) {
            // skip whitespace
            while (i < len && Character.isWhitespace(json.charAt(i))) i++;
            if (i >= len) break;

            if (json.charAt(i) == ',') {
                i++;
                continue;
            }

            // parse key
            if (json.charAt(i) != '"') break;
            i++;
            int keyStart = i;
            while (i < len && json.charAt(i) != '"') {
                if (json.charAt(i) == '\\') i++;
                i++;
            }
            String key = json.substring(keyStart, i);
            i++; // skip closing quote

            // skip to colon
            while (i < len && (Character.isWhitespace(json.charAt(i)) || json.charAt(i) == ':')) i++;

            // parse value
            while (i < len && Character.isWhitespace(json.charAt(i))) i++;
            if (i >= len) break;

            char firstChar = json.charAt(i);
            if (firstChar == '"') {
                i++;
                int valStart = i;
                while (i < len && json.charAt(i) != '"') {
                    if (json.charAt(i) == '\\') i++;
                    i++;
                }
                String val = json.substring(valStart, i);
                i++;
                map.put(key, unescape(val));
            } else if (firstChar == '[') {
                int arrayStart = i;
                int depth = 0;
                while (i < len) {
                    if (json.charAt(i) == '[') depth++;
                    else if (json.charAt(i) == ']') {
                        depth--;
                        if (depth == 0) { i++; break; }
                    }
                    i++;
                }
                String arrStr = json.substring(arrayStart, i);
                map.put(key, parseArray(arrStr));
            } else if (firstChar == '{') {
                int objStart = i;
                int depth = 0;
                while (i < len) {
                    if (json.charAt(i) == '{') depth++;
                    else if (json.charAt(i) == '}') {
                        depth--;
                        if (depth == 0) { i++; break; }
                    }
                    i++;
                }
                String objStr = json.substring(objStart, i);
                map.put(key, parseObject(objStr));
            } else {
                int valStart = i;
                while (i < len && json.charAt(i) != ',' && json.charAt(i) != '}') i++;
                String raw = json.substring(valStart, i).trim();
                if ("true".equalsIgnoreCase(raw)) map.put(key, Boolean.TRUE);
                else if ("false".equalsIgnoreCase(raw)) map.put(key, Boolean.FALSE);
                else if ("null".equalsIgnoreCase(raw)) map.put(key, null);
                else {
                    try {
                        if (raw.contains(".")) {
                            map.put(key, Double.parseDouble(raw));
                        } else {
                            map.put(key, Long.parseLong(raw));
                        }
                    } catch (NumberFormatException e) {
                        map.put(key, raw);
                    }
                }
            }
        }
        return map;
    }

    public static List<Object> parseArray(String json) {
        List<Object> list = new ArrayList<>();
        if (json == null) return list;
        json = json.trim();
        if (!json.startsWith("[") || !json.endsWith("]")) return list;

        String inner = json.substring(1, json.length() - 1).trim();
        if (inner.isEmpty()) return list;

        int i = 0;
        int len = inner.length();
        while (i < len) {
            while (i < len && Character.isWhitespace(inner.charAt(i))) i++;
            if (i >= len) break;

            if (inner.charAt(i) == ',') {
                i++;
                continue;
            }

            char c = inner.charAt(i);
            if (c == '"') {
                i++;
                int start = i;
                while (i < len && inner.charAt(i) != '"') {
                    if (inner.charAt(i) == '\\') i++;
                    i++;
                }
                list.add(unescape(inner.substring(start, i)));
                i++;
            } else if (c == '{') {
                int start = i;
                int depth = 0;
                while (i < len) {
                    if (inner.charAt(i) == '{') depth++;
                    else if (inner.charAt(i) == '}') {
                        depth--;
                        if (depth == 0) { i++; break; }
                    }
                    i++;
                }
                list.add(parseObject(inner.substring(start, i)));
            } else {
                int start = i;
                while (i < len && inner.charAt(i) != ',') i++;
                String raw = inner.substring(start, i).trim();
                if ("true".equalsIgnoreCase(raw)) list.add(Boolean.TRUE);
                else if ("false".equalsIgnoreCase(raw)) list.add(Boolean.FALSE);
                else if ("null".equalsIgnoreCase(raw)) list.add(null);
                else {
                    try {
                        if (raw.contains(".")) list.add(Double.parseDouble(raw));
                        else list.add(Long.parseLong(raw));
                    } catch (Exception e) {
                        list.add(raw);
                    }
                }
            }
        }
        return list;
    }

    private static String unescape(String s) {
        if (!s.contains("\\")) return s;
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            if (c == '\\' && i + 1 < s.length()) {
                char next = s.charAt(i + 1);
                switch (next) {
                    case '"': sb.append('"'); i++; break;
                    case '\\': sb.append('\\'); i++; break;
                    case 'n': sb.append('\n'); i++; break;
                    case 'r': sb.append('\r'); i++; break;
                    case 't': sb.append('\t'); i++; break;
                    case 'b': sb.append('\b'); i++; break;
                    case 'f': sb.append('\f'); i++; break;
                    default: sb.append(next); i++; break;
                }
            } else {
                sb.append(c);
            }
        }
        return sb.toString();
    }
}

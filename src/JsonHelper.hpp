#ifndef JSON_HELPER_HPP
#define JSON_HELPER_HPP

#include <string>
#include <vector>
#include <sstream>
#include <algorithm>
#include <cctype>

namespace JsonHelper {

inline std::string trim(const std::string& str) {
    size_t first = str.find_first_not_of(" \t\r\n");
    if (first == std::string::npos) return "";
    size_t last = str.find_last_not_of(" \t\r\n");
    return str.substr(first, (last - first + 1));
}

inline std::string escape(const std::string& s) {
    std::ostringstream o;
    for (char c : s) {
        switch (c) {
            case '"': o << "\\\""; break;
            case '\\': o << "\\\\"; break;
            case '\b': o << "\\b"; break;
            case '\f': o << "\\f"; break;
            case '\n': o << "\\n"; break;
            case '\r': o << "\\r"; break;
            case '\t': o << "\\t"; break;
            default:
                if (static_cast<unsigned char>(c) <= 0x1f) {
                    o << "\\u00";
                    char hex[3];
                    sprintf(hex, "%02x", static_cast<unsigned char>(c));
                    o << hex;
                } else {
                    o << c;
                }
        }
    }
    return o.str();
}

inline std::string extractString(const std::string& json, const std::string& key, const std::string& defaultVal = "") {
    std::string pattern = "\"" + key + "\"";
    size_t pos = json.find(pattern);
    if (pos == std::string::npos) return defaultVal;

    size_t colon = json.find(':', pos + pattern.length());
    if (colon == std::string::npos) return defaultVal;

    size_t quoteStart = json.find('"', colon + 1);
    if (quoteStart == std::string::npos) return defaultVal;

    std::string res;
    bool escaped = false;
    for (size_t i = quoteStart + 1; i < json.length(); ++i) {
        char c = json[i];
        if (escaped) {
            if (c == '"') res += '"';
            else if (c == '\\') res += '\\';
            else if (c == 'n') res += '\n';
            else if (c == 't') res += '\t';
            else if (c == 'r') res += '\r';
            else res += c;
            escaped = false;
        } else if (c == '\\') {
            escaped = true;
        } else if (c == '"') {
            return res;
        } else {
            res += c;
        }
    }
    return defaultVal;
}

inline double extractDouble(const std::string& json, const std::string& key, double defaultVal = 0.0) {
    std::string pattern = "\"" + key + "\"";
    size_t pos = json.find(pattern);
    if (pos == std::string::npos) return defaultVal;

    size_t colon = json.find(':', pos + pattern.length());
    if (colon == std::string::npos) return defaultVal;

    size_t valStart = json.find_first_not_of(" \t\r\n\"", colon + 1);
    if (valStart == std::string::npos) return defaultVal;

    size_t valEnd = json.find_first_of(" ,\r\n}\"]", valStart);
    std::string valStr = (valEnd == std::string::npos) ? json.substr(valStart) : json.substr(valStart, valEnd - valStart);
    try {
        return std::stod(valStr);
    } catch (...) {
        return defaultVal;
    }
}

inline int extractInt(const std::string& json, const std::string& key, int defaultVal = 0) {
    return static_cast<int>(extractDouble(json, key, defaultVal));
}

inline bool extractBool(const std::string& json, const std::string& key, bool defaultVal = false) {
    std::string pattern = "\"" + key + "\"";
    size_t pos = json.find(pattern);
    if (pos == std::string::npos) return defaultVal;

    size_t colon = json.find(':', pos + pattern.length());
    if (colon == std::string::npos) return defaultVal;

    size_t valStart = json.find_first_not_of(" \t\r\n\"", colon + 1);
    if (valStart == std::string::npos) return defaultVal;

    if (json.compare(valStart, 4, "true") == 0) return true;
    if (json.compare(valStart, 5, "false") == 0) return false;
    return defaultVal;
}

inline std::vector<std::string> extractStringArray(const std::string& json, const std::string& key) {
    std::vector<std::string> result;
    std::string pattern = "\"" + key + "\"";
    size_t pos = json.find(pattern);
    if (pos == std::string::npos) return result;

    size_t bracketOpen = json.find('[', pos + pattern.length());
    if (bracketOpen == std::string::npos) return result;

    size_t bracketClose = json.find(']', bracketOpen + 1);
    if (bracketClose == std::string::npos) return result;

    size_t cur = bracketOpen + 1;
    while (cur < bracketClose) {
        size_t qStart = json.find('"', cur);
        if (qStart == std::string::npos || qStart >= bracketClose) break;

        size_t qEnd = json.find('"', qStart + 1);
        if (qEnd == std::string::npos || qEnd > bracketClose) break;

        result.push_back(json.substr(qStart + 1, qEnd - qStart - 1));
        cur = qEnd + 1;
    }
    return result;
}

} // namespace JsonHelper

#endif // JSON_HELPER_HPP


package com.omniprice.utils;

import java.util.Arrays;
import java.util.Comparator;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Mirrors Python {@code utils.product_utils.generate_product_key} for MongoDB lookups
 * when the client passes a plain search string instead of a precomputed key.
 */
public final class ProductKeyUtil {

    private ProductKeyUtil() {}

    private static final Pattern NORMALIZE = Pattern.compile("[^a-z0-9\\s]");
    private static final Pattern SPACES = Pattern.compile("\\s+");

    private static final Pattern STORAGE_1TB = Pattern.compile("\\b1\\s*(?:tb|tera(?:byte)?)\\b", Pattern.CASE_INSENSITIVE);
    private static final Pattern STORAGE_GB = Pattern.compile(
            "\\b(32|64|128|256|512|1024)\\s*(?:gb|g)\\b(?!\\s*(?:ram|ddr|memory))",
            Pattern.CASE_INSENSITIVE);

        private static final Pattern RAM_GB = Pattern.compile(
            "\\b(2|3|4|6|8|12|16|24|32|48|64)\\s*(?:gb|g)\\s*(?:ram|ddr|memory)\\b",
            Pattern.CASE_INSENSITIVE);

        // Prefer compact model tokens like: m56, s23, a15, z11x, pixel9a, edge60, nordce5, iphone16e
        private static final Pattern MODEL_TOKEN = Pattern.compile(
            "\\b([a-z]{1,10}\\d{1,4}[a-z]{0,6})\\b",
            Pattern.CASE_INSENSITIVE);
        private static final Pattern MODEL_WORD_PLUS_NUMBER = Pattern.compile(
            "\\b([a-z]{2,20})\\s*(\\d{1,4}[a-z]{0,3})\\b",
            Pattern.CASE_INSENSITIVE);

        private static final Pattern APPLE_IPHONE = Pattern.compile(
            "\\biphone\\s*(\\d{1,2})\\s*(pro\\s*max|pro|max|plus|mini|e|se)?\\b",
            Pattern.CASE_INSENSITIVE);
        private static final Pattern APPLE_IPAD = Pattern.compile(
            "\\bipad\\s*(pro|air|mini)?\\s*(\\d{1,2})?\\b",
            Pattern.CASE_INSENSITIVE);
        private static final Pattern APPLE_MACBOOK = Pattern.compile(
            "\\bmacbook\\s*(air|pro)?\\b",
            Pattern.CASE_INSENSITIVE);

        // Multi-word colors / finishes first (strip phrases before stripping words)
        private static final Set<String> COLOR_TERMS = new HashSet<>(Arrays.asList(
            "space gray", "space grey", "midnight black", "phantom black",
            "natural titanium", "desert titanium", "rose gold", "product red",
            "sierra blue", "deep purple"));

        private static final Set<String> COLOR_WORDS = new HashSet<>(Arrays.asList(
            "black", "white", "blue", "green", "red", "pink", "gold", "silver", "purple",
            "lavender", "yellow", "orange", "brown", "beige", "cream", "coral", "grey", "gray",
            "charcoal", "bronze", "copper", "navy", "teal", "mint", "burgundy", "titanium",
            "midnight", "starlight", "graphite", "phantom", "mystic", "obsidian",
            "lime", "maroon", "sand", "pearl", "ceramic", "cloud", "sunrise", "dawn", "dusk",
            "aqua", "frost", "ice", "jet", "onyx", "slate", "stone", "tan", "wine",
            "volcanic", "arctic", "glacier"));

    private static final Set<String> MARKETING = new HashSet<>(Arrays.asList(
            "new", "latest", "original", "authentic", "genuine", "buy", "online", "india", "indian",
            "free", "shipping", "delivery", "warranty", "year", "years", "certified", "global",
            "version", "edition", "special", "limited", "combo", "pack", "offer", "deal", "sale",
            "discount", "imported", "with", "without", "only", "mobile", "smartphone", "phone",
            "cellular", "dual", "sim", "esim", "unlocked", "factory", "sealed", "box", "retail",
            "best", "price", "stock", "ready", "ship", "fast"));

        // Extra marketing/spec noise to strip for canonical matching.
    private static final Set<String> MARKETING_EXTRA = new HashSet<>(Arrays.asList(
            "camera", "cameras", "mp", "rear", "front", "selfie",
            "gaming", "game", "lag", "lagfree", "esports",
            "slim", "thin", "lightweight",
            "display", "screen", "inch", "hz", "amoled", "oled", "lcd", "fhd", "uhd", "hdr",
            "battery", "mah", "charging", "charger", "fastcharge", "supervooc", "vooc", "turbo",
            "processor", "chip", "chipset", "snapdragon", "dimensity", "mediatek", "helio", "exynos",
            "storage", "rom", "memory",
            "wifi", "bluetooth", "5g", "4g", "lte", "dual",
            "with", "without"));

        private static final Set<String> KNOWN_BRANDS = new HashSet<>(Arrays.asList(
            "apple", "samsung", "google", "xiaomi", "redmi", "poco", "realme", "oppo", "vivo",
            "oneplus", "motorola", "nothing", "honor", "asus", "nokia", "sony", "lg", "htc",
            // laptops
            "hp", "dell", "lenovo", "acer", "msi", "gigabyte", "microsoft"));

    /**
     * Canonical cross-platform matching key.
     *
     * Goal: same real-world product from different platforms yields the same key,
     * even when listing titles include heavy marketing/spec text.
     *
    * Format: brand_model[_storage]
    * Example: "Samsung Galaxy M56 5G 8GB 128GB" -> "samsung_m56_128gb"
     */
    public static String generateStandardProductKey(String titleOrKey) {
        if (titleOrKey == null || titleOrKey.isBlank()) {
            return "";
        }

        String s = normalizeKeyInput(titleOrKey);

        // Extract storage + RAM first (then strip out those spans).
        StorageResult storage = extractStorage(s);
        s = storage.rest;
        s = extractRam(s);

        // Remove colors + marketing noise.
        s = stripColors(s);
        s = stripMarketing(s);
        s = stripMarketingExtra(s);

        // Brand + model
        BrandModel bm = inferBrandAndModel(s);
        String brand = compact(bm.brand);

        String model = compact(extractModelToken(bm.modelRest, bm.brand));
        if (model.isEmpty()) {
            model = compact(extractModelToken(s, bm.brand));
        }
        if (model.isEmpty()) {
            model = compact(fallbackModelToken(bm.modelRest, bm.brand));
        }
        if (model.isEmpty()) {
            model = compact(fallbackModelToken(s, bm.brand));
        }

        if (brand.isEmpty() && model.isEmpty()) {
            return compact(s);
        }
        if (brand.isEmpty()) {
            return model;
        }
        if (model.isEmpty() || model.equals(brand)) {
            // Brand-only query or failed model extraction: avoid brand_brand keys.
            return brand;
        }

        StringBuilder key = new StringBuilder();
        key.append(brand).append('_').append(model);
        // IMPORTANT: RAM is intentionally NOT part of the canonical key.
        // Listings inconsistently include RAM text; including it creates duplicates.
        if (storage.token != null) {
            key.append('_').append(storage.token);
        }
        return key.toString();
    }

    private static String fallbackModelToken(String cleanedText, String brand) {
        if (cleanedText == null || cleanedText.isBlank()) {
            return "";
        }

        String s = normalizeKeyInput(cleanedText);
        if (s.isBlank()) {
            return "";
        }

        String b = compact(brand);
        String[] parts = s.split("\\s+");

        // Prefer tokens containing digits (often model numbers).
        String best = "";
        for (String p : parts) {
            String tc = compact(p);
            if (tc.isBlank()) {
                continue;
            }
            if (!b.isBlank() && tc.equals(b)) {
                continue;
            }
            if (MARKETING.contains(tc) || MARKETING_EXTRA.contains(tc) || COLOR_WORDS.contains(tc)) {
                continue;
            }
            if (tc.matches("\\d+(gb|tb)") || tc.equals("gb") || tc.equals("tb")) {
                continue;
            }
            if (tc.chars().anyMatch(Character::isDigit)) {
                return tc;
            }
            if (best.isBlank()) {
                best = tc;
            }
        }

        return best;
    }

    public static String generateProductKey(String title) {
        // Keep one canonical algorithm to avoid Java/Python drift.
        return generateStandardProductKey(title);
    }

    private static String extractRam(String text) {
        Matcher m = RAM_GB.matcher(text);
        if (m.find()) {
            return removeSpan(text, m.start(), m.end());
        }
        return text;
    }

    private static String stripMarketingExtra(String s) {
        String text = " " + s + " ";
        for (String w : MARKETING_EXTRA) {
            text = text.replaceAll("(?i)\\b" + Pattern.quote(w) + "\\b", " ");
        }
        return SPACES.matcher(text).replaceAll(" ").trim();
    }

    private static String extractModelToken(String text, String brand) {
        if (text == null) {
            return "";
        }
        String s = normalizeKeyInput(text);

        // Apple: prioritize product family.
        Matcher mi = APPLE_IPHONE.matcher(s);
        if (mi.find()) {
            String num = mi.group(1);
            String suf = mi.group(2);
            String suffix = suf != null ? suf.toLowerCase(Locale.ROOT).replaceAll("\\s+", "") : "";
            return "iphone" + num + suffix;
        }
        Matcher mip = APPLE_IPAD.matcher(s);
        if (mip.find()) {
            String variant = mip.group(1);
            String gen = mip.group(2);
            StringBuilder out = new StringBuilder("ipad");
            if (variant != null && !variant.isBlank()) {
                out.append(variant.toLowerCase(Locale.ROOT));
            }
            if (gen != null && !gen.isBlank()) {
                out.append(gen);
            }
            return out.toString();
        }
        Matcher mm = APPLE_MACBOOK.matcher(s);
        if (mm.find()) {
            String variant = mm.group(1);
            return "macbook" + (variant != null ? variant.toLowerCase(Locale.ROOT) : "");
        }

        // Remove common family words that should not dominate model.
        String core = s;
        for (String w : Arrays.asList("galaxy", "iphone", "ipad", "macbook", "mobile", "smartphone", "laptop", "notebook")) {
            core = core.replaceAll("(?i)\\b" + Pattern.quote(w) + "\\b", " ");
        }
        core = SPACES.matcher(core).replaceAll(" ").trim();

        // Prefer brand-specific known patterns.
        String b = (brand == null ? "" : brand.toLowerCase(Locale.ROOT));
        if (b.equals("samsung")) {
            // e.g. m56, s23, a15, f55, zfold6, zflip6
            String collapsed = core.replaceAll("\\s+", "");
            Matcher mt = Pattern.compile("\\b([asfmz]\\d{1,3}[a-z]{0,6})\\b", Pattern.CASE_INSENSITIVE).matcher(core);
            if (mt.find()) {
                return mt.group(1);
            }
            Matcher zf = Pattern.compile("\\bz\\s*(fold|flip)\\s*(\\d{1,2})\\b", Pattern.CASE_INSENSITIVE).matcher(s);
            if (zf.find()) {
                return "z" + zf.group(1).toLowerCase(Locale.ROOT) + zf.group(2);
            }
            if (collapsed.contains("s") && collapsed.matches(".*s\\d{1,3}.*")) {
                // fallback to generic below
            }
        }

        // 2-token pattern like "edge 60" => edge60, "pixel 9a" => pixel9a, "inspiron 15" => inspiron15
        Matcher mw = MODEL_WORD_PLUS_NUMBER.matcher(core);
        if (mw.find()) {
            String w = mw.group(1);
            String n = mw.group(2);
            // Skip if word is clearly noise.
            if (!MARKETING.contains(w.toLowerCase(Locale.ROOT)) && !MARKETING_EXTRA.contains(w.toLowerCase(Locale.ROOT))) {
                return w + n;
            }
        }

        // Single token like z11x / m56 / ce5 / x300
        Matcher m = MODEL_TOKEN.matcher(core);
        while (m.find()) {
            String tok = m.group(1);
            String tl = tok.toLowerCase(Locale.ROOT);
            if (tl.length() < 2) {
                continue;
            }
            if (MARKETING.contains(tl) || MARKETING_EXTRA.contains(tl) || COLOR_WORDS.contains(tl)) {
                continue;
            }
            // Avoid picking storage/ram artifacts.
            if (tl.endsWith("gb") || tl.endsWith("tb")) {
                continue;
            }
            return tok;
        }

        return "";
    }

    private static String normalizeKeyInput(String title) {
        String s = title.toLowerCase(Locale.ROOT);
        s = NORMALIZE.matcher(s).replaceAll(" ");
        s = SPACES.matcher(s).replaceAll(" ").trim();
        return s;
    }

    private static final class StorageResult {
        final String token;
        final String rest;

        StorageResult(String token, String rest) {
            this.token = token;
            this.rest = rest;
        }
    }

    private static StorageResult extractStorage(String text) {
        Matcher m1 = STORAGE_1TB.matcher(text);
        if (m1.find()) {
            return new StorageResult("1tb", removeSpan(text, m1.start(), m1.end()));
        }
        Matcher m2 = STORAGE_GB.matcher(text);
        if (m2.find()) {
            String tok = m2.group(1) + "gb";
            return new StorageResult(tok, removeSpan(text, m2.start(), m2.end()));
        }
        return new StorageResult(null, text);
    }

    private static String removeSpan(String text, int start, int end) {
        String merged = text.substring(0, start) + " " + text.substring(end);
        return SPACES.matcher(merged).replaceAll(" ").trim();
    }

    private static String stripColors(String s) {
        String text = " " + s + " ";

        // Phrases first
        String[] phrases = COLOR_TERMS.toArray(new String[0]);
        Arrays.sort(phrases, Comparator.comparingInt(String::length).reversed());
        for (String p : phrases) {
            text = text.replaceAll("(?i)\\b" + Pattern.quote(p) + "\\b", " ");
        }

        // Then words
        String[] words = COLOR_WORDS.toArray(new String[0]);
        Arrays.sort(words, Comparator.comparingInt(String::length).reversed());
        for (String w : words) {
            text = text.replaceAll("(?i)\\b" + Pattern.quote(w) + "\\b", " ");
        }
        return SPACES.matcher(text).replaceAll(" ").trim();
    }

    private static String stripMarketing(String s) {
        String text = " " + s + " ";
        for (String w : MARKETING) {
            text = text.replaceAll("(?i)\\b" + Pattern.quote(w) + "\\b", " ");
        }
        return SPACES.matcher(text).replaceAll(" ").trim();
    }

    private static final class BrandModel {
        final String brand;
        final String modelRest;

        BrandModel(String brand, String modelRest) {
            this.brand = brand;
            this.modelRest = modelRest;
        }
    }

    private static BrandModel inferBrandAndModel(String core) {
        String s = core.trim();
        if (s.isEmpty()) {
            return new BrandModel("", "");
        }
        String sl = s.toLowerCase(Locale.ROOT);

        if (sl.matches(".*\\biphone\\b.*") || sl.matches(".*\\bipad\\b.*") || sl.matches(".*\\bairpods\\b.*")) {
            String rem = sl.replaceFirst("(?i)^apple\\s+", "").trim();
            return new BrandModel("apple", rem);
        }
        if (sl.startsWith("apple ") || sl.equals("apple")) {
            String rem = sl.replaceFirst("(?i)^apple\\s+", "").trim();
            return new BrandModel("apple", rem);
        }

        if (sl.matches(".*\\bone\\s*plus\\b.*") || sl.matches(".*\\boneplus\\b.*")) {
            String rem = sl.replaceFirst("(?i)^oneplus\\s+", "").replaceFirst("(?i)^one\\s+plus\\s+", "").trim();
            return new BrandModel("oneplus", rem);
        }
        if (sl.matches(".*\\bsamsung\\b.*")) {
            String rem = sl.replaceFirst("(?i)^samsung\\s+", "").trim();
            return new BrandModel("samsung", rem);
        }
        if (sl.matches(".*\\bgalaxy\\b.*")) {
            return new BrandModel("samsung", sl);
        }
        if (sl.matches(".*\\bgoogle\\b.*")) {
            String rem = sl.replaceFirst("(?i)^google\\s+", "").trim();
            return new BrandModel("google", rem);
        }
        if (sl.matches(".*\\bpixel\\b.*")) {
            return new BrandModel("google", sl);
        }
        if (sl.matches(".*\\bxiaomi\\b.*")) {
            String rem = sl.replaceFirst("(?i)^xiaomi\\s+", "").trim();
            return new BrandModel("xiaomi", rem);
        }
        if (sl.matches(".*\\bredmi\\b.*")) {
            String rem = sl.replaceFirst("(?i)^redmi\\s+", "").trim();
            return new BrandModel("redmi", rem);
        }
        if (sl.matches(".*\\bpoco\\b.*")) {
            String rem = sl.replaceFirst("(?i)^poco\\s+", "").trim();
            return new BrandModel("poco", rem);
        }
        if (sl.matches(".*\\brealme\\b.*")) {
            String rem = sl.replaceFirst("(?i)^realme\\s+", "").trim();
            return new BrandModel("realme", rem);
        }
        if (sl.matches(".*\\boppo\\b.*")) {
            String rem = sl.replaceFirst("(?i)^oppo\\s+", "").trim();
            return new BrandModel("oppo", rem);
        }
        if (sl.matches(".*\\bvivo\\b.*")) {
            String rem = sl.replaceFirst("(?i)^vivo\\s+", "").trim();
            return new BrandModel("vivo", rem);
        }
        if (sl.matches(".*\\bmotorola\\b.*")) {
            String rem = sl.replaceFirst("(?i)^motorola\\s+", "").replaceFirst("(?i)^moto\\s+", "").trim();
            return new BrandModel("motorola", rem);
        }
        if (sl.matches(".*\\bmoto\\b.*")) {
            String rem = sl.replaceFirst("(?i)^moto\\s+", "").trim();
            return new BrandModel("motorola", rem);
        }
        if (sl.matches(".*\\bnothing\\b.*")) {
            String rem = sl.replaceFirst("(?i)^nothing\\s+", "").trim();
            return new BrandModel("nothing", rem);
        }
        if (sl.matches(".*\\bhonor\\b.*")) {
            String rem = sl.replaceFirst("(?i)^honor\\s+", "").trim();
            return new BrandModel("honor", rem);
        }
        if (sl.matches(".*\\basus\\b.*") || sl.matches(".*\\brog\\b.*")) {
            String rem = sl.replaceFirst("(?i)^asus\\s+", "").trim();
            return new BrandModel("asus", rem);
        }

        String[] parts = s.split("\\s+");
        if (parts.length > 0 && KNOWN_BRANDS.contains(parts[0].toLowerCase(Locale.ROOT))) {
            return new BrandModel(parts[0].toLowerCase(Locale.ROOT),
                    String.join(" ", Arrays.copyOfRange(parts, 1, parts.length)));
        }
        if (parts.length > 0) {
            return new BrandModel(parts[0].toLowerCase(Locale.ROOT),
                    String.join(" ", Arrays.copyOfRange(parts, 1, parts.length)));
        }
        return new BrandModel("", s);
    }

    private static String compact(String s) {
        if (s == null) {
            return "";
        }
        return s.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]", "");
    }
}

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

    private static final Set<String> COLOR_WORDS = new HashSet<>(Arrays.asList(
            "black", "white", "blue", "green", "red", "pink", "gold", "silver", "purple",
            "lavender", "yellow", "orange", "brown", "beige", "cream", "coral", "grey", "gray",
            "charcoal", "bronze", "copper", "navy", "teal", "mint", "burgundy", "titanium",
            "midnight", "starlight", "graphite", "phantom", "mystic", "obsidian"));

    private static final Set<String> MARKETING = new HashSet<>(Arrays.asList(
            "new", "latest", "original", "authentic", "genuine", "buy", "online", "india", "indian",
            "free", "shipping", "delivery", "warranty", "year", "years", "certified", "global",
            "version", "edition", "special", "limited", "combo", "pack", "offer", "deal", "sale",
            "discount", "imported", "with", "without", "only", "mobile", "smartphone", "phone",
            "cellular", "dual", "sim", "esim", "unlocked", "factory", "sealed", "box", "retail",
            "best", "price", "stock", "ready", "ship", "fast"));

    private static final Set<String> KNOWN_BRANDS = new HashSet<>(Arrays.asList(
            "apple", "samsung", "google", "xiaomi", "redmi", "poco", "realme", "oppo", "vivo",
            "oneplus", "motorola", "nothing", "honor", "asus", "nokia", "sony", "lg", "htc"));

    public static String generateProductKey(String title) {
        if (title == null || title.isBlank()) {
            return "";
        }

        String s = normalizeKeyInput(title);
        StorageResult sr = extractStorage(s);
        s = sr.rest;
        s = stripColors(s);
        s = stripMarketing(s);
        BrandModel bm = inferBrandAndModel(s);
        String brandC = compact(bm.brand);
        String modelC = compact(bm.modelRest);

        if (brandC.isEmpty() && !modelC.isEmpty()) {
            modelC = compact(s);
        }

        StringBuilder key = new StringBuilder();
        if (!brandC.isEmpty()) {
            key.append(brandC);
        }
        if (!modelC.isEmpty()) {
            if (key.length() > 0) {
                key.append('_');
            }
            key.append(modelC);
        }
        if (key.length() == 0) {
            return compact(s);
        }
        if (sr.token != null) {
            key.append('_').append(sr.token);
        }
        return key.toString();
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
        String[] words = COLOR_WORDS.toArray(new String[0]);
        Arrays.sort(words, Comparator.comparingInt(String::length).reversed());
        String text = " " + s + " ";
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

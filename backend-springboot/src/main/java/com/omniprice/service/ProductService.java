package com.omniprice.service;

import com.omniprice.model.Product;
import com.omniprice.model.PriceHistory;
import com.omniprice.repository.ProductRepository;
import com.omniprice.repository.PriceHistoryRepository;
import com.omniprice.utils.ProductKeyUtil;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Pattern;

@Service
public class ProductService {

    private static final Logger log = LoggerFactory.getLogger(ProductService.class);

    private static final int DB_MIN_RESULTS_FOR_RELAXED_FALLBACK = 5;
    private static final int DB_MIN_RESULTS_FOR_API_FALLBACK = 5;
    private static final long NO_RESULT_CACHE_TTL_MILLIS = 5L * 60L * 1000L;
    private static final ConcurrentHashMap<String, Long> NO_RESULT_API_CACHE = new ConcurrentHashMap<>();

    @Autowired
    private RestTemplate restTemplate;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private PriceHistoryRepository priceHistoryRepository;

    @Autowired
    private MongoTemplate mongoTemplate;

    @Value("${python.ai.service.url}")
    private String pythonApiUrl;

    @Value("${python.ai.predict.url}")
    private String pythonPredictUrl;

    // ----------------------------
    // SEARCH METHOD — DB-first with smart API enrichment for mobiles/laptops
    // ----------------------------
    public Map<String, Object> searchProduct(String productName) {

        Map<String, Object> empty = emptySearchResponse();

        String rawQuery = (productName == null) ? "" : productName.trim();
        if (rawQuery.isBlank()) {
            return empty;
        }

        String query = normalizeSearchQuery(rawQuery);
        if (query.isBlank()) {
            return empty;
        }

        String category = inferCategory(query);
        boolean eligibleForApiEnrichment = isEligibleCategoryForApi(category);

        // EXACT MATCH (OPTIONAL): optimization only
        String queryKeyCandidate = ProductKeyUtil.generateStandardProductKey(query);
        List<Product> exact = List.of();
        if (queryKeyCandidate != null && !queryKeyCandidate.isBlank()) {
            exact = safeList(productRepository.findByProductKey(queryKeyCandidate));
            log.info(
                    "DB {} (exact-opt) query='{}' candidateKey='{}' results={}",
                    exact.isEmpty() ? "MISS" : "HIT",
                    query,
                    queryKeyCandidate,
                    exact.size());
        }

        // SEARCH INTELLIGENCE (PRIMARY = flexible DB search)
        // STEP 1-4:
        // - query normalized already
        // - split tokens
        // - expand alnum tokens: a12 -> [a12, a 12]
        // - AND across token groups, OR within variants
        List<String> tokens = splitTokens(query);
        List<List<String>> tokenGroups = buildTokenVariantGroups(tokens);

        List<Product> partial = tokenGroups.isEmpty()
                ? List.of()
                : flexibleTokenSearchByNormalizedName(tokenGroups, 50, true);
        int partialUnique = countUniqueByProductKeyPlatform(partial);
        log.info(
                "DB {} (flex-and) query='{}' tokens={} unique={} limit=50",
                partial.isEmpty() ? "MISS" : "HIT",
                query,
                tokens.size(),
                partialUnique);

        // STEP 4 (continued): OR fallback if strict AND is too small
        if (partialUnique < DB_MIN_RESULTS_FOR_RELAXED_FALLBACK) {
            List<String> orTokens = filterOrTokens(tokens);
            List<List<String>> orGroups = buildTokenVariantGroups(orTokens);
            if (!orGroups.isEmpty()) {
                List<Product> orResults = flexibleTokenSearchByNormalizedName(orGroups, 50, false);
                int orUnique = countUniqueByProductKeyPlatform(orResults);
                log.info(
                        "DB {} (flex-or) query='{}' tokensUsed={} unique={}",
                        orResults.isEmpty() ? "MISS" : "HIT",
                        query,
                        orTokens.size(),
                        orUnique);
                if (orUnique > partialUnique) {
                    partial = orResults;
                    partialUnique = orUnique;
                }
            }
        }

        // STEP 5: brand-only fallback (remove model tokens)
        if (partialUnique < DB_MIN_RESULTS_FOR_RELAXED_FALLBACK) {
            String brand = detectBrandToken(tokens);
            if (!brand.isBlank()) {
                List<Product> brandOnly = flexibleTokenSearchByNormalizedName(List.of(List.of(brand)), 50, true);
                int brandUnique = countUniqueByProductKeyPlatform(brandOnly);
                log.info(
                        "DB {} (brand-only) query='{}' brand='{}' unique={}",
                        brandOnly.isEmpty() ? "MISS" : "HIT",
                        query,
                        brand,
                        brandUnique);
                if (brandUnique > partialUnique) {
                    partial = brandOnly;
                    partialUnique = brandUnique;
                }
            }
        }

        // DB results (NO DEDUPE YET — dedupe only after merge)
        List<Product> dbResults = concat(exact, partial);
        int dbUnique = countUniqueByProductKeyPlatform(dbResults);

        log.info(
                "SEARCH DB RESULTS query='{}' category='{}' resultsRaw={} resultsUnique={} threshold={}",
                query,
                category,
                dbResults.size(),
                dbUnique,
            DB_MIN_RESULTS_FOR_API_FALLBACK);

        // FALLBACK CONTROL + NO-RESULT CACHE
        boolean noResultCacheHit = eligibleForApiEnrichment && isNoResultApiCached(query);
        boolean apiCalled = false;
        boolean apiTriggered = eligibleForApiEnrichment && dbUnique < DB_MIN_RESULTS_FOR_API_FALLBACK && !noResultCacheHit;
        log.info(
                "SEARCH API {} query='{}' category='{}' dbUnique={} cachedNoResult={}",
                apiTriggered ? "TRIGGERED" : "SKIPPED",
                query,
                category,
                dbUnique,
                noResultCacheHit);

        if (!apiTriggered) {
            List<Product> mergedDeduped = dedupeByProductKeyPlatform(dbResults);
            LinkedHashMap<String, List<Product>> groups = groupAndRankByProductKey(mergedDeduped);
            List<Product> flattened = flattenGroups(groups);

            String keyForPrediction = pickBestPredictionKeyFromGroups(groups);
            Map<String, Object> prediction = keyForPrediction.isBlank()
                    ? new HashMap<>()
                    : predictProduct(keyForPrediction, null, null);

            double predictedPrice = extractPrediction(prediction);
            for (Product p : flattened) {
                p.setPredictedPrice(predictedPrice);
            }

            log.info("SEARCH DONE query='{}' apiCalled={} productsReturned={}", query, apiCalled, flattened.size());

            Map<String, Object> out = new HashMap<>();
            out.put("products", flattened);
            out.put("prediction", prediction);
            return out;
        }

        // API enrichment path (mobiles/laptops only)
        apiCalled = true;
        ApiSearchResult api = fetchProductsFromApi(query);
        List<Product> apiProducts = api.products == null ? List.of() : api.products;
        log.info("SEARCH API RESULTS query='{}' results={}", query, apiProducts.size());

        if (api.success && apiProducts.isEmpty()) {
            cacheNoResultApi(query);
        }

        // Always insert price_history for API results
        if (!apiProducts.isEmpty()) {
            savePriceHistory(apiProducts);
        }

        // Insert into products only if productKey+platform not exists
        List<Product> trulyNewProducts = filterTrulyNewProducts(apiProducts);
        if (!trulyNewProducts.isEmpty()) {
            productRepository.saveAll(trulyNewProducts);
        }

        // FINAL MERGE + DEDUP (dedupe ONLY AFTER merge)
        List<Product> combined = concat(dbResults, apiProducts);
        List<Product> combinedDeduped = dedupeByProductKeyPlatform(combined);

        // GROUPING + ranking + flattening for response
        LinkedHashMap<String, List<Product>> groups = groupAndRankByProductKey(combinedDeduped);
        List<Product> flattened = flattenGroups(groups);

        // PREDICTION KEY SELECTION: derived from groups only; NEVER queryKey
        String keyForPrediction = pickBestPredictionKeyFromGroups(groups);
        Map<String, Object> prediction = keyForPrediction.isBlank()
                ? new HashMap<>()
                : predictProduct(keyForPrediction, null, null);

        double predictedPrice = extractPrediction(prediction);
        for (Product p : flattened) {
            p.setPredictedPrice(predictedPrice);
        }

        log.info("SEARCH DONE query='{}' apiCalled={} productsReturned={} newProductsInserted={} apiEmptyCached={}",
                query,
                apiCalled,
                flattened.size(),
                trulyNewProducts.size(),
                apiProducts.isEmpty());

        Map<String, Object> out = new HashMap<>();
        out.put("products", flattened);
        out.put("prediction", prediction);
        return out;
    }

    private static final Set<String> GENERIC_TOKENS = Set.of(
            "phone",
            "mobile",
            "mobiles",
            "smartphone",
            "laptop",
            "laptops",
            "notebook"
    );

    private static List<String> filterOrTokens(List<String> tokens) {
        if (tokens == null || tokens.isEmpty()) {
            return List.of();
        }
        List<String> out = new ArrayList<>();
        for (String t : tokens) {
            if (t == null || t.isBlank()) {
                continue;
            }
            String s = t.trim().toLowerCase(Locale.ROOT);
            if (GENERIC_TOKENS.contains(s)) {
                continue;
            }
            out.add(s);
        }
        return out;
    }

    private static String detectBrandToken(List<String> tokens) {
        if (tokens == null || tokens.isEmpty()) {
            return "";
        }
        for (String t : tokens) {
            if (t == null || t.isBlank()) {
                continue;
            }
            String s = t.trim().toLowerCase(Locale.ROOT);
            if (GENERIC_TOKENS.contains(s)) {
                continue;
            }
            if (s.matches("\\d+")) {
                continue;
            }
            if (s.length() < 2) {
                continue;
            }
            return s;
        }
        return "";
    }

    private static List<List<String>> buildTokenVariantGroups(List<String> tokens) {
        if (tokens == null || tokens.isEmpty()) {
            return List.of();
        }
        List<List<String>> groups = new ArrayList<>();
        for (String t : tokens) {
            if (t == null || t.isBlank()) {
                continue;
            }
            List<String> variants = expandTokenVariants(t.trim().toLowerCase(Locale.ROOT));
            if (!variants.isEmpty()) {
                groups.add(variants);
            }
        }
        return groups;
    }

    private static List<String> expandTokenVariants(String token) {
        if (token == null) {
            return List.of();
        }
        String t = token.trim();
        if (t.isBlank()) {
            return List.of();
        }
        LinkedHashSet<String> out = new LinkedHashSet<>();
        out.add(t);

        // Token expansion (critical): letters+numbers -> add spaced variant
        // Examples: a12 -> a 12 ; v30 -> v 30 ; i5 -> i 5
        if (t.matches("^[a-z]+\\d+[a-z0-9]*$")) {
            String spaced = t.replaceFirst("^([a-z]+)(\\d+)(.*)$", "$1 $2$3").trim();
            if (!spaced.isBlank()) {
                out.add(spaced);
            }
        } else if (t.matches("^\\d+[a-z]+[a-z0-9]*$")) {
            String spaced = t.replaceFirst("^(\\d+)([a-z]+)(.*)$", "$1 $2$3").trim();
            if (!spaced.isBlank()) {
                out.add(spaced);
            }
        }

        return new ArrayList<>(out);
    }

    private List<Product> flexibleTokenSearchByNormalizedName(List<List<String>> tokenGroups, int limit, boolean preferAnd) {
        if (tokenGroups == null || tokenGroups.isEmpty()) {
            return List.of();
        }

        List<Criteria> groupCriteria = new ArrayList<>();
        for (List<String> group : tokenGroups) {
            if (group == null || group.isEmpty()) {
                continue;
            }
            List<Criteria> variants = new ArrayList<>();
            for (String v : group) {
                if (v == null || v.isBlank()) {
                    continue;
                }
                Pattern p = Pattern.compile(Pattern.quote(v), Pattern.CASE_INSENSITIVE);
                variants.add(Criteria.where("normalizedName").regex(p));
            }
            if (variants.isEmpty()) {
                continue;
            }
            if (variants.size() == 1) {
                groupCriteria.add(variants.get(0));
            } else {
                groupCriteria.add(new Criteria().orOperator(variants.toArray(new Criteria[0])));
            }
        }

        if (groupCriteria.isEmpty()) {
            return List.of();
        }

        Criteria c = preferAnd
                ? new Criteria().andOperator(groupCriteria.toArray(new Criteria[0]))
                : new Criteria().orOperator(groupCriteria.toArray(new Criteria[0]));
        Query q = new Query(c).limit(Math.max(1, limit));
        return safeList(mongoTemplate.find(q, Product.class));
    }

    private static List<String> splitTokens(String normalizedQuery) {
        String q = (normalizedQuery == null) ? "" : normalizedQuery.trim();
        if (q.isBlank()) {
            return List.of();
        }
        String[] parts = q.split("\\s+");
        List<String> out = new ArrayList<>();
        for (String p : parts) {
            if (p != null && !p.isBlank()) {
                out.add(p);
            }
        }
        return out;
    }

    private static int countUniqueByProductKeyPlatform(List<Product> in) {
        if (in == null || in.isEmpty()) {
            return 0;
        }
        Set<String> seen = new HashSet<>();
        for (Product p : in) {
            seen.add(compositeKey(p));
        }
        return seen.size();
    }

    private static boolean isNoResultApiCached(String normalizedQuery) {
        String key = (normalizedQuery == null) ? "" : normalizedQuery.trim();
        if (key.isBlank()) {
            return false;
        }
        Long expiresAt = NO_RESULT_API_CACHE.get(key);
        if (expiresAt == null) {
            return false;
        }
        long now = System.currentTimeMillis();
        if (expiresAt <= now) {
            NO_RESULT_API_CACHE.remove(key, expiresAt);
            return false;
        }
        return true;
    }

    private static void cacheNoResultApi(String normalizedQuery) {
        String key = (normalizedQuery == null) ? "" : normalizedQuery.trim();
        if (key.isBlank()) {
            return;
        }
        NO_RESULT_API_CACHE.put(key, System.currentTimeMillis() + NO_RESULT_CACHE_TTL_MILLIS);
    }

    private List<Product> filterTrulyNewProducts(List<Product> apiProducts) {
        if (apiProducts == null || apiProducts.isEmpty()) {
            return List.of();
        }

        // Build a single OR query for all (productKey, platform) pairs.
        List<Criteria> orParts = new ArrayList<>();
        for (Product p : apiProducts) {
            if (p == null) {
                continue;
            }
            String pk = p.getProductKey() == null ? "" : p.getProductKey().trim();
            String platform = p.getPlatform() == null ? "" : p.getPlatform().trim();
            if (pk.isBlank() || platform.isBlank()) {
                continue;
            }
            Pattern platformRx = Pattern.compile("^" + Pattern.quote(platform) + "$", Pattern.CASE_INSENSITIVE);
            orParts.add(new Criteria().andOperator(
                    Criteria.where("productKey").is(pk),
                    Criteria.where("platform").regex(platformRx)
            ));
        }

        Set<String> existing = new HashSet<>();
        if (!orParts.isEmpty()) {
            Query q = new Query(new Criteria().orOperator(orParts.toArray(new Criteria[0])));
            q.fields().include("productKey").include("platform");
            List<Product> found = mongoTemplate.find(q, Product.class);
            for (Product p : safeList(found)) {
                existing.add(compositeKey(p));
            }
        }

        List<Product> out = new ArrayList<>();
        for (Product p : apiProducts) {
            if (p == null) {
                continue;
            }
            if (!existing.contains(compositeKey(p))) {
                out.add(p);
            }
        }
        return out;
    }

    private static final class ApiSearchResult {
        final List<Product> products;
        final boolean success;

        ApiSearchResult(List<Product> products, boolean success) {
            this.products = products == null ? List.of() : products;
            this.success = success;
        }
    }

    @SuppressWarnings("unchecked")
    private ApiSearchResult fetchProductsFromApi(String query) {

        URI uri = UriComponentsBuilder
                .fromUriString(pythonApiUrl)
                .queryParam("product", query)
                .build()
                .encode() // 🔥 IMPORTANT FIX
                .toUri();

        log.info("API CALLED /api/search query='{}' uri={}", query, uri);

        try {
            ResponseEntity<Map<String, Object>> response =
                    restTemplate.exchange(
                            uri,
                            HttpMethod.GET,
                            null,
                            new ParameterizedTypeReference<Map<String, Object>>() {}
                    );

            Map<String, Object> body = response.getBody();
            if (body == null) return new ApiSearchResult(List.of(), true);

            List<Map<String, Object>> productData =
                    (List<Map<String, Object>>) body.getOrDefault("products", new ArrayList<>());

                // Prediction is always derived from grouped search results in Spring; do not trust query-derived API prediction.
                List<Product> products = convertToProductList(productData, 0);

            log.info("RESULTS FOUND (api) query='{}' results={}", query, products.size());

            return new ApiSearchResult(products, true);

        } catch (Exception e) {
            log.warn("API ERROR /api/search query='{}' err={}", query, e.getMessage());
            return new ApiSearchResult(List.of(), false);
        }
    }

    private static List<Product> concat(List<Product> a, List<Product> b) {
        if ((a == null || a.isEmpty()) && (b == null || b.isEmpty())) {
            return List.of();
        }
        List<Product> out = new ArrayList<>();
        if (a != null) out.addAll(a);
        if (b != null) out.addAll(b);
        return out;
    }

    private static String normalizeSearchQuery(String query) {
        if (query == null) {
            return "";
        }
        String s = query.toLowerCase(Locale.ROOT).trim();
        // Keep spaces, drop special chars
        s = s.replaceAll("[^a-z0-9\\s]", " ");
        s = s.replaceAll("\\s+", " ").trim();
        return s;
    }


    private static String compositeKey(Product p) {
        if (p == null) {
            return "|";
        }
        String platform = (p.getPlatform() == null) ? "" : p.getPlatform().trim().toLowerCase(Locale.ROOT);
        String key = (p.getProductKey() == null) ? "" : p.getProductKey().trim();
        if (key.isBlank()) {
            String name = (p.getProductName() == null) ? "" : p.getProductName().trim();
            key = ProductKeyUtil.generateStandardProductKey(name);
        }
        return key + "|" + platform;
    }

    private static List<Product> dedupeByProductKeyPlatform(List<Product> in) {
        if (in == null || in.isEmpty()) {
            return List.of();
        }
        Set<String> seen = new HashSet<>();
        List<Product> out = new ArrayList<>();
        for (Product p : in) {
            String ck = compositeKey(p);
            if (seen.add(ck)) {
                out.add(p);
            }
        }
        return out;
    }

    private static LinkedHashMap<String, List<Product>> groupByProductKey(List<Product> in) {
        LinkedHashMap<String, List<Product>> groups = new LinkedHashMap<>();
        if (in == null || in.isEmpty()) {
            return groups;
        }
        for (Product p : in) {
            if (p == null) {
                continue;
            }
            String key = (p.getProductKey() == null) ? "" : p.getProductKey().trim();
            if (key.isBlank()) {
                String name = (p.getProductName() == null) ? "" : p.getProductName().trim();
                key = ProductKeyUtil.generateStandardProductKey(name);
                if (key == null) {
                    key = "";
                }
            }
            if (key.isBlank()) {
                // Skip un-keyed items; they are not safe for grouping/prediction.
                continue;
            }
            groups.computeIfAbsent(key, k -> new ArrayList<>()).add(p);
        }
        return groups;
    }

    private static LinkedHashMap<String, List<Product>> groupAndRankByProductKey(List<Product> in) {
        LinkedHashMap<String, List<Product>> groups = groupByProductKey(in);
        if (groups.isEmpty()) {
            return groups;
        }

        // Rank groups: most frequent desc, lowest non-zero price asc, stable by insertion
        List<Map.Entry<String, List<Product>>> entries = new ArrayList<>(groups.entrySet());
        Map<String, Integer> firstIndex = firstSeenIndex(in);

        entries.sort((a, b) -> {
            int ca = a.getValue() == null ? 0 : a.getValue().size();
            int cb = b.getValue() == null ? 0 : b.getValue().size();
            if (ca != cb) {
                return Integer.compare(cb, ca);
            }
            double pa = minNonZeroPrice(a.getValue());
            double pb = minNonZeroPrice(b.getValue());
            int cmpPrice = Double.compare(pa, pb);
            if (cmpPrice != 0) {
                return cmpPrice;
            }
            int ia = firstIndex.getOrDefault(a.getKey(), Integer.MAX_VALUE);
            int ib = firstIndex.getOrDefault(b.getKey(), Integer.MAX_VALUE);
            return Integer.compare(ia, ib);
        });

        LinkedHashMap<String, List<Product>> ranked = new LinkedHashMap<>();
        for (Map.Entry<String, List<Product>> e : entries) {
            ranked.put(e.getKey(), e.getValue());
        }
        return ranked;
    }

    private static Map<String, Integer> firstSeenIndex(List<Product> in) {
        Map<String, Integer> idx = new HashMap<>();
        if (in == null) {
            return idx;
        }
        for (int i = 0; i < in.size(); i++) {
            Product p = in.get(i);
            if (p == null) {
                continue;
            }
            String k = p.getProductKey() == null ? "" : p.getProductKey().trim();
            if (k.isBlank()) {
                continue;
            }
            idx.putIfAbsent(k, i);
        }
        return idx;
    }

    private static double minNonZeroPrice(List<Product> products) {
        if (products == null || products.isEmpty()) {
            return Double.POSITIVE_INFINITY;
        }
        double min = Double.POSITIVE_INFINITY;
        for (Product p : products) {
            if (p == null) {
                continue;
            }
            double price = p.getPrice();
            if (price > 0 && price < min) {
                min = price;
            }
        }
        return min;
    }

    private static List<Product> flattenGroups(LinkedHashMap<String, List<Product>> groups) {
        if (groups == null || groups.isEmpty()) {
            return List.of();
        }
        List<Product> out = new ArrayList<>();
        for (Map.Entry<String, List<Product>> e : groups.entrySet()) {
            List<Product> items = e.getValue();
            if (items == null || items.isEmpty()) {
                continue;
            }
            out.addAll(items);
        }
        // Final safety: ensure unique by productKey+platform
        return dedupeByProductKeyPlatform(out);
    }

    private static String pickBestPredictionKeyFromGroups(LinkedHashMap<String, List<Product>> groups) {
        if (groups == null || groups.isEmpty()) {
            return "";
        }
        // groups should already be ranked by groupAndRankByProductKey; pick the first stable key.
        for (Map.Entry<String, List<Product>> e : groups.entrySet()) {
            String k = e.getKey();
            if (k != null && !k.isBlank()) {
                return k;
            }
        }
        return "";
    }


    private static boolean isEligibleCategoryForApi(String category) {
        if (category == null) {
            return false;
        }
        String c = category.trim().toLowerCase(Locale.ROOT);
        return c.equals("mobiles") || c.equals("laptops");
    }

    private static String inferCategory(String query) {
        String q = (query == null) ? "" : query.toLowerCase(Locale.ROOT);
        if (q.isBlank()) {
            return "other";
        }

        // CATEGORY DETECTION (required)
        // mobiles: phone, mobile, samsung, iphone
        if (q.contains("phone") || q.contains("mobile") || q.contains("samsung") || q.contains("iphone")) {
            return "mobiles";
        }

        // laptops: laptop, dell, hp, lenovo
        if (q.contains("laptop") || q.contains("dell") || q.contains("hp") || q.contains("lenovo")) {
            return "laptops";
        }

        return "other";
    }

    /**
     * Calls FastAPI /predict only (no scrape). Aligns with Python resolve_product_key_from_client.
     */
    public Map<String, Object> predictProduct(String productKey, String productName, String legacyProduct) {
        UriComponentsBuilder b = UriComponentsBuilder.fromUriString(pythonPredictUrl);

        String key = (productKey == null) ? "" : productKey.trim();
        if (key.isBlank()) {
            String raw = (productName != null && !productName.isBlank()) ? productName : legacyProduct;
            if (raw != null && !raw.isBlank()) {
                key = ProductKeyUtil.generateStandardProductKey(raw);
            }
        }

        if (!key.isBlank()) {
            // Internal contract: always use productKey for prediction (avoid raw titles).
            b.queryParam("productKey", key);
        } else {
            // Safety fallback only.
            if (productName != null && !productName.isBlank()) {
                b.queryParam("product_name", productName);
            }
            if (legacyProduct != null && !legacyProduct.isBlank()) {
                b.queryParam("product", legacyProduct);
            }
        }

        URI uri = b.build().encode().toUri();
        log.info("API CALLED /api/predict key='{}' uri={}", key, uri);
        try {
            ResponseEntity<Map<String, Object>> response =
                    restTemplate.exchange(
                            uri,
                            HttpMethod.GET,
                            null,
                            new ParameterizedTypeReference<Map<String, Object>>() {});
            Map<String, Object> body = response.getBody();
            return body != null ? body : new HashMap<>();
        } catch (Exception e) {
            log.warn("API ERROR /api/predict key='{}' err={}", key, e.getMessage());
            return new HashMap<>();
        }
    }

    // ----------------------------
    private List<Product> convertToProductList(
            List<Map<String, Object>> data,
            double predictedPrice
    ) {

        List<Product> products = new ArrayList<>();

        for (Map<String, Object> item : data) {

            Product product = new Product();

            String name = String.valueOf(item.getOrDefault("productName", ""));

            product.setProductName(name);
            product.setNormalizedName(normalizeName(name));
            // Canonicalize productKey (never store raw/un-normalized keys)
            String canonicalKey = canonicalizeProductKey(item.get("productKey"), name);
            product.setProductKey(canonicalKey);

            String platform = String.valueOf(item.getOrDefault("platform", ""));
            platform = platform == null ? "" : platform.trim().toLowerCase(Locale.ROOT);
            product.setPlatform(platform);
            product.setBrand(String.valueOf(item.getOrDefault("brand", "")));
            product.setOffer(String.valueOf(item.getOrDefault("offer", "")));
            product.setLink(String.valueOf(item.getOrDefault("link", "")));
            product.setImage(String.valueOf(item.getOrDefault("image", "")));

            product.setPrice(parsePrice(item.get("price")));
            product.setRating(parseDouble(item.get("rating")));

            product.setPredictedPrice(predictedPrice);

            products.add(product);
        }

        return products;
    }

    private static String canonicalizeProductKey(Object rawKey, String name) {
        String rk = rawKey == null ? "" : rawKey.toString().trim();
        if (!rk.isBlank()) {
            // allow legacy keys like "amazon::iphone-15" by stripping prefix
            String canonicalSource = rk.replaceFirst("^[a-zA-Z0-9]+::", "");
            String canonical = ProductKeyUtil.generateStandardProductKey(canonicalSource);
            return (canonical == null) ? "" : canonical;
        }
        return ProductKeyUtil.generateStandardProductKey(name);
    }

    // ----------------------------
    private void savePriceHistory(List<Product> products) {

        for (Product p : products) {

            PriceHistory history = new PriceHistory();

            history.setProductName(p.getProductName());
            history.setNormalizedName(p.getNormalizedName());
            history.setProductKey(p.getProductKey());
            history.setPlatform(p.getPlatform());
            history.setPrice(p.getPrice());
            history.setCreatedAt(LocalDateTime.now());

            priceHistoryRepository.save(history);
        }
    }

    // ----------------------------
    private double extractPrediction(Map<String, Object> prediction) {
        try {
            Object value = prediction.get("predictedPrice");
            return value != null ? Double.parseDouble(value.toString()) : 0;
        } catch (Exception e) {
            return 0;
        }
    }

    // ----------------------------
    /** Same rules as Python {@code utils.product_utils.generate_product_key} */
    public String generateProductKey(String title) {
        return ProductKeyUtil.generateProductKey(title);
    }


    private static <T> List<T> safeList(List<T> in) {
        return in == null ? List.of() : in;
    }

    private static Map<String, Object> emptySearchResponse() {
        Map<String, Object> empty = new HashMap<>();
        empty.put("products", new ArrayList<Product>());
        empty.put("prediction", new HashMap<String, Object>());
        return empty;
    }

    private String normalizeName(String name) {
        return name == null ? "" : name.toLowerCase().replaceAll("[^a-z0-9 ]", "").trim();
    }

    private double parsePrice(Object priceObj) {
        try {
            return Double.parseDouble(priceObj.toString().replaceAll("[^0-9.]", ""));
        } catch (Exception e) {
            return 0;
        }
    }

    private double parseDouble(Object value) {
        try {
            return Double.parseDouble(value.toString());
        } catch (Exception e) {
            return 0;
        }
    }

    public List<PriceHistory> getPriceHistoryByKey(String productKey) {
        return priceHistoryRepository.findByProductKeyOrderByCreatedAtAsc(productKey);
    }
}
package com.omniprice.controller;

import com.omniprice.model.PriceHistory;
import com.omniprice.model.Product;
import com.omniprice.service.ProductService;
import com.omniprice.utils.ProductKeyUtil;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/products")
@CrossOrigin(origins = "http://localhost:5173", allowCredentials = "true", allowedHeaders = "*", methods = {RequestMethod.GET, RequestMethod.POST, RequestMethod.OPTIONS})
public class ProductController {

    @Autowired
    private ProductService productService;

    // ----------------------------
    // SEARCH API (FINAL FIXED)
    // ----------------------------
    @GetMapping("/search")
    @SuppressWarnings("unchecked")
    public Map<String, Object> searchProducts(@RequestParam String product) {

        Map<String, Object> result = productService.searchProduct(product);
        List<Product> products = (List<Product>) result.getOrDefault("products", new ArrayList<>());
        Map<String, Object> prediction = (Map<String, Object>) result.getOrDefault("prediction", new HashMap<>());

        Map<String, Object> response = new HashMap<>();
        response.put("products", products);
        // FastAPI is the source of truth for trend / deal / notifications / cacheHit
        response.put("prediction", prediction);

        return response;
    }

    // ----------------------------
    // OPTIONAL: DIRECT PREDICT API
    // ----------------------------
    @GetMapping("/predict")
    public Map<String, Object> predict(
            @RequestParam(required = false) String product_key,
            @RequestParam(required = false) String product_name,
            @RequestParam(required = false) String product) {

        // Keep public API the same, but internally ensure prediction uses canonical productKey.
        String key = (product_key != null) ? product_key.trim() : "";
        if (key.isBlank()) {
            String raw = (product_name != null && !product_name.isBlank()) ? product_name : product;
            if (raw != null && !raw.isBlank()) {
                key = ProductKeyUtil.generateStandardProductKey(raw);
            }
        }

        if (key.isBlank()) {
            return new HashMap<>();
        }

        // Only pass productKey (do not pass raw product title).
        return productService.predictProduct(key, null, null);
    }

    // ----------------------------
    // HEALTH CHECK
    // ----------------------------
    @GetMapping("/health")
    public String healthCheck() { 
        return "OmniPrice Backend Running";
    }

    // ----------------------------
    // 🔥 PRICE HISTORY API (FIXED)
    // ----------------------------
@GetMapping("/price-history")
public List<Map<String, Object>> getPriceHistory(
        @RequestParam(required = false) String product_key,
        @RequestParam(required = false) String product_name,
        @RequestParam(required = false) String product) {

    String productKey;
    if (product_key != null && !product_key.isBlank()) {
        productKey = product_key.trim();
    } else {
        String raw = (product_name != null && !product_name.isBlank()) ? product_name : product;
        if (raw == null || raw.isBlank()) {
            return new ArrayList<>();
        }
        productKey = productService.generateProductKey(raw);
    }

    List<PriceHistory> historyList =
            productService.getPriceHistoryByKey(productKey);

    List<Map<String, Object>> response = new ArrayList<>();

    for (PriceHistory h : historyList) {
        Map<String, Object> item = new HashMap<>();
        item.put("price", h.getPrice());
        item.put("createdAt", h.getCreatedAt());
        response.add(item);
    }

    return response;
}
}
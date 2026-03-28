package com.omniprice.controller;

import com.omniprice.model.PriceHistory;
import com.omniprice.model.Product;
import com.omniprice.service.ProductService;

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
    public Map<String, Object> searchProducts(@RequestParam String product) {

        List<Product> products = productService.searchProduct(product);

        Map<String, Object> response = new HashMap<>();

        // ----------------------------
        // Products
        // ----------------------------
        response.put("products", products);

        // ----------------------------
        // 🔥 Prediction (FULL OBJECT)
        // ----------------------------
        Map<String, Object> prediction = new HashMap<>();

        if (!products.isEmpty()) {

            double predictedPrice = products.get(0).getPredictedPrice();
            double currentPrice = products.get(0).getPrice();

            prediction.put("currentPrice", currentPrice);
            prediction.put("predictedPrice", predictedPrice);

            // Trend logic
            if (predictedPrice < currentPrice) {
                prediction.put("trend", "falling");
            } else if (predictedPrice > currentPrice) {
                prediction.put("trend", "rising");
            } else {
                prediction.put("trend", "stable");
            }

        } else {
            prediction.put("currentPrice", 0);
            prediction.put("predictedPrice", 0);
            prediction.put("trend", "unknown");
        }

        response.put("prediction", prediction);

        return response;
    }

    // ----------------------------
    // OPTIONAL: DIRECT PREDICT API
    // ----------------------------
    @GetMapping("/predict")
    public Map<String, Object> predict(@RequestParam String product) {

        // This calls Python directly via service (optional)
        List<Product> products = productService.searchProduct(product);

        Map<String, Object> response = new HashMap<>();

        if (!products.isEmpty()) {
            response.put("predictedPrice", products.get(0).getPredictedPrice());
        } else {
            response.put("predictedPrice", 0);
        }

        return response;
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
public List<Map<String, Object>> getPriceHistory(@RequestParam String product) {

    // 🔥 convert query → productKey
    String productKey = product.toLowerCase().contains("iphone")
            ? product.toLowerCase().replaceAll(".*(iphone\\s?\\d+).*", "$1").trim()
            : product.toLowerCase();

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
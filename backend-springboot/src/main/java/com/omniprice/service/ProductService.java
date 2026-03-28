package com.omniprice.service;

import com.omniprice.model.Product;
import com.omniprice.model.PriceHistory;
import com.omniprice.repository.ProductRepository;
import com.omniprice.repository.PriceHistoryRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.time.LocalDateTime;
import java.util.*;

@Service
public class ProductService {

    @Autowired
    private RestTemplate restTemplate;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private PriceHistoryRepository priceHistoryRepository;

    @Value("${python.ai.service.url}")
    private String pythonApiUrl;

    // ----------------------------
    // SEARCH METHOD
    // ----------------------------
    public List<Product> searchProduct(String productName) {

        URI uri = UriComponentsBuilder
                .fromUriString(pythonApiUrl)
                .queryParam("product", productName)
                .build()
                .encode() // 🔥 IMPORTANT FIX
                .toUri();

        System.out.println("🔥 Calling FastAPI: " + uri);

        try {
            ResponseEntity<Map<String, Object>> response =
                    restTemplate.exchange(
                            uri,
                            HttpMethod.GET,
                            null,
                            new ParameterizedTypeReference<Map<String, Object>>() {}
                    );

            Map<String, Object> body = response.getBody();
            if (body == null) return new ArrayList<>();

            List<Map<String, Object>> productData =
                    (List<Map<String, Object>>) body.getOrDefault("products", new ArrayList<>());

            Map<String, Object> prediction =
                    (Map<String, Object>) body.getOrDefault("prediction", new HashMap<>());

            double predictedPrice = extractPrediction(prediction);

            List<Product> products = convertToProductList(productData, predictedPrice);

            if (!products.isEmpty()) {
                productRepository.saveAll(products);
                savePriceHistory(products);
            }

            return products;

        } catch (Exception e) {
            System.err.println("❌ ERROR calling FastAPI: " + e.getMessage());
            return new ArrayList<>();
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
            product.setProductKey(generateProductKey(name));

            product.setPlatform(String.valueOf(item.getOrDefault("platform", "")));
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
    private String generateProductKey(String title) {
        if (title == null) return "";
        title = title.toLowerCase();

        if (title.contains("iphone")) {
            return title.replaceAll(".*(iphone\\s?\\d+).*", "$1").trim();
        }

        String[] words = title.split(" ");
        return words.length >= 2 ? words[0] + " " + words[1] : title;
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
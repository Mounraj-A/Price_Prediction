package com.omniprice.service;

import com.omniprice.model.PriceHistory;
import com.omniprice.repository.PriceHistoryRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class PricePredictionService {

    private final PriceHistoryRepository repository;

    public PricePredictionService(PriceHistoryRepository repository) {
        this.repository = repository;
    }

    // ----------------------------
    // 🔥 SMART FALLBACK PREDICTION
    // ----------------------------
    public PredictionResult predictPrice(String productKey) {

        List<PriceHistory> history =
                repository.findByProductKeyOrderByCreatedAtAsc(productKey);

        // Not enough data
        if (history == null || history.size() < 3) {
            return new PredictionResult(0, "unknown", 0);
        }

        double totalChange = 0;
        int validChanges = 0;

        for (int i = 1; i < history.size(); i++) {

            double prev = history.get(i - 1).getPrice();
            double curr = history.get(i).getPrice();

            if (prev > 0 && curr > 0) {
                totalChange += (curr - prev);
                validChanges++;
            }
        }

        if (validChanges == 0) {
            return new PredictionResult(0, "unknown", 0);
        }

        double avgChange = totalChange / validChanges;

        double latestPrice = history.get(history.size() - 1).getPrice();

        double predictedPrice = latestPrice + avgChange;

        // 🔥 Safety (no negative prices)
        if (predictedPrice < 0) {
            predictedPrice = latestPrice;
        }

        // ----------------------------
        // Trend Detection
        // ----------------------------
        String trend;

        if (predictedPrice < latestPrice) {
            trend = "falling";
        } else if (predictedPrice > latestPrice) {
            trend = "rising";
        } else {
            trend = "stable";
        }

        // ----------------------------
        // Confidence (simple)
        // ----------------------------
        double confidence = Math.min(1.0, validChanges / 10.0);

        return new PredictionResult(predictedPrice, trend, confidence);
    }

    // ----------------------------
    // RESULT CLASS (IMPORTANT)
    // ----------------------------
    public static class PredictionResult {

        private double predictedPrice;
        private String trend;
        private double confidence;

        public PredictionResult(double predictedPrice, String trend, double confidence) {
            this.predictedPrice = predictedPrice;
            this.trend = trend;
            this.confidence = confidence;
        }

        public double getPredictedPrice() {
            return predictedPrice;
        }

        public String getTrend() {
            return trend;
        }

        public double getConfidence() {
            return confidence;
        }
    }
}
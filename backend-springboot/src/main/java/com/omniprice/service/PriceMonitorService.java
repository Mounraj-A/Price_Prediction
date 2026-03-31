package com.omniprice.service;

import com.omniprice.model.Alert;
import com.omniprice.model.NotificationType;
import com.omniprice.model.PriceHistory;
import com.omniprice.model.Product;
import com.omniprice.model.SavedProduct;
import com.omniprice.repository.AlertRepository;
import com.omniprice.repository.NotificationRepository;
import com.omniprice.repository.PriceHistoryRepository;
import com.omniprice.repository.SavedProductRepository;
import com.omniprice.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Scheduled price checks for saved products and active alerts. Uses existing
 * {@link ProductService} search/predict — does not change their behaviour.
 */
@Service
public class PriceMonitorService {

    private static final Logger log = LoggerFactory.getLogger(PriceMonitorService.class);

    @Value("${omni.notifications.monitor.enabled:true}")
    private boolean monitorEnabled;

    @Autowired
    private SavedProductRepository savedProductRepository;

    @Autowired
    private AlertRepository alertRepository;

    @Autowired
    private PriceHistoryRepository priceHistoryRepository;

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private EmailService emailService;

    @Autowired
    private ProductService productService;

    @Autowired
    private UserRepository userRepository;

    @Scheduled(fixedRateString = "${omni.notifications.monitor.interval-ms:300000}")
    public void runPriceChecks() {
        if (!monitorEnabled) {
            return;
        }
        try {
            for (SavedProduct saved : savedProductRepository.findAll()) {
                processSavedProduct(saved);
            }
            for (Alert alert : alertRepository.findByIsActiveTrue()) {
                processTargetPriceAlert(alert);
            }
        } catch (Exception e) {
            log.error("Price monitor run failed: {}", e.getMessage(), e);
        }
    }

    @SuppressWarnings("unchecked")
    private void processSavedProduct(SavedProduct saved) {
        String userId = saved.getUserId();
        String productKey = saved.getProductKey();
        String productName = saved.getProductName();
        if (productName == null || productName.isBlank()) {
            return;
        }

        Optional<PriceHistory> lastBefore =
                priceHistoryRepository.findFirstByProductKeyOrderByCreatedAtDesc(productKey);
        double previousPrice = lastBefore.map(PriceHistory::getPrice).orElse(parseSavedPrice(saved.getPrice()));

        Map<String, Object> searchResult = productService.searchProduct(productName);
        List<Product> products = (List<Product>) searchResult.getOrDefault("products", List.of());
        double currentPrice = findCurrentPrice(products, productKey, saved.getPlatform());
        if (currentPrice <= 0) {
            log.debug("No current price for saved product userId={} productKey={}", userId, productKey);
            return;
        }

        if (previousPrice > 0 && currentPrice < previousPrice) {
            String msg = String.format(
                    "Price dropped for %s: %.0f → %.0f",
                    productKey, previousPrice, currentPrice);
            log.info("PRICE DROP detected for {}", productKey);
            notifyIfAllowed(userId, productKey, NotificationType.PRICE_DROP, msg, true);
        }

        Map<String, Object> pred = productService.predictProduct(productKey, productName, null);
        double predicted = parseDouble(pred, "predictedPrice");
        if (predicted > 0 && currentPrice < predicted) {
            String msg = String.format(
                    "Best deal: current %.0f is below predicted %.0f (%s)",
                    currentPrice, predicted, productKey);
            notifyIfAllowed(userId, productKey, NotificationType.BEST_DEAL, msg, false);
        }

        String trendText = extractTrendText(pred);
        if (trendText != null && isSignificantTrend(trendText)) {
            String msg = String.format("Trend update for %s: %s", productKey, trendText);
            notifyIfAllowed(userId, productKey, NotificationType.TREND, msg, false);
        }
    }

    @SuppressWarnings("unchecked")
    private void processTargetPriceAlert(Alert alert) {
        String userId = alert.getUserId();
        String productKey = alert.getProductKey();
        double target = alert.getTargetPrice();

        List<SavedProduct> userSaved = savedProductRepository.findByUserIdOrderBySavedAtDesc(userId);
        SavedProduct ref = userSaved.stream()
                .filter(s -> productKey != null && productKey.equals(s.getProductKey()))
                .findFirst()
                .orElse(null);

        String productName = ref != null && ref.getProductName() != null
                ? ref.getProductName()
                : productKey;

        Map<String, Object> searchResult = productService.searchProduct(productName);
        List<Product> products = (List<Product>) searchResult.getOrDefault("products", List.of());
        String platform = ref != null ? ref.getPlatform() : null;
        double currentPrice = findCurrentPrice(products, productKey, platform);
        if (currentPrice <= 0) {
            return;
        }

        if (currentPrice <= target) {
            String msg = String.format(
                    "Target price reached for %s: current %.0f (target %.0f)",
                    productKey, currentPrice, target);
            log.info("TARGET PRICE hit for {}", productKey);
            notifyIfAllowed(userId, productKey, NotificationType.TARGET_PRICE, msg, true);
        }
    }

    private void notifyIfAllowed(
            String userId,
            String productKey,
            NotificationType type,
            String message,
            boolean sendEmail) {

        LocalDateTime since = LocalDateTime.now().minusHours(1);
        if (notificationRepository.existsByUserIdAndProductKeyAndTypeAndCreatedAtAfter(
                userId, productKey, type, since)) {
            return;
        }

        notificationService.createNotification(userId, productKey, type, message);

        if (sendEmail && (type == NotificationType.PRICE_DROP || type == NotificationType.TARGET_PRICE)) {
            userRepository.findById(userId).ifPresent(user -> {
                if (Boolean.TRUE.equals(user.getEmailVerified())) {
                    String subject = "OmniPrice: " + type.name().replace('_', ' ');
                    emailService.sendEmail(user.getEmail(), subject, message);
                } else {
                    log.info("Skipping email (user not verified): userId={} type={}", userId, type);
                }
            });
        }
    }

    private static double findCurrentPrice(List<Product> products, String productKey, String platform) {
        if (products == null || products.isEmpty()) {
            return -1;
        }
        for (Product p : products) {
            if (productKey != null && productKey.equals(p.getProductKey())) {
                if (platform == null || platform.equalsIgnoreCase(p.getPlatform())) {
                    return p.getPrice();
                }
            }
        }
        for (Product p : products) {
            if (productKey != null && productKey.equals(p.getProductKey())) {
                return p.getPrice();
            }
        }
        return products.get(0).getPrice();
    }

    private static double parseSavedPrice(String s) {
        if (s == null || s.isBlank()) {
            return 0;
        }
        try {
            return Double.parseDouble(s.replaceAll("[^0-9.]", ""));
        } catch (Exception e) {
            return 0;
        }
    }

    private static double parseDouble(Map<String, Object> map, String key) {
        Object v = map.get(key);
        if (v == null) {
            return 0;
        }
        if (v instanceof Number n) {
            return n.doubleValue();
        }
        try {
            return Double.parseDouble(v.toString());
        } catch (Exception e) {
            return 0;
        }
    }

    private static String extractTrendText(Map<String, Object> pred) {
        Object t = pred.get("trend");
        if (t == null) {
            return null;
        }
        if (t instanceof Map<?, ?> m) {
            Object inner = m.get("trend");
            return inner != null ? inner.toString() : t.toString();
        }
        return t.toString();
    }

    private static boolean isSignificantTrend(String trendText) {
        String s = trendText.toLowerCase();
        return s.contains("rising") || s.contains("falling");
    }
}

package com.omniprice.service;

import com.omniprice.model.Alert;
import com.omniprice.repository.AlertRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class AlertService {

    private static final Logger log = LoggerFactory.getLogger(AlertService.class);

    @Autowired
    private AlertRepository alertRepository;

    /**
     * Create a new price alert for a user
     *
     * @param userId        User's ID from JWT
     * @param productKey    Unique product key (e.g., "amazon::iphone-15")
     * @param targetPrice   Target price threshold
     * @return Created alert
     */
    public Alert createAlert(String userId, String productKey, double targetPrice) {
        // Check if alert already exists for this user + product
        List<Alert> existing = alertRepository.findByUserIdAndIsActive(userId, true);
        for (Alert a : existing) {
            if (productKey != null && productKey.equals(a.getProductKey())) {
                log.info("Alert already exists for userId={} productKey={}", userId, productKey);
                return a;
            }
        }

        Alert alert = Alert.builder()
                .userId(userId)
                .productKey(productKey)
                .targetPrice(targetPrice)
                .isActive(true)
                .createdAt(LocalDateTime.now())
                .build();

        Alert saved = alertRepository.save(alert);
        log.info("Alert created: id={} userId={} productKey={} targetPrice={}", 
                saved.getId(), userId, productKey, targetPrice);
        return saved;
    }

    /**
     * Get all active alerts for a user
     */
    public List<Alert> getUserAlerts(String userId) {
        return alertRepository.findByUserIdAndIsActive(userId, true);
    }

    /**
     * Delete/deactivate an alert
     */
    public void deleteAlert(String alertId, String userId) {
        Optional<Alert> opt = alertRepository.findById(alertId);
        if (opt.isPresent()) {
            Alert alert = opt.get();
            if (alert.getUserId().equals(userId)) {
                alert.setActive(false);
                alertRepository.save(alert);
                log.info("Alert deactivated: id={}", alertId);
            }
        }
    }

    /**
     * Update alert target price
     */
    public Alert updateAlert(String alertId, String userId, double newTargetPrice) {
        Optional<Alert> opt = alertRepository.findById(alertId);
        if (opt.isPresent()) {
            Alert alert = opt.get();
            if (alert.getUserId().equals(userId)) {
                alert.setTargetPrice(newTargetPrice);
                Alert updated = alertRepository.save(alert);
                log.info("Alert updated: id={} newTargetPrice={}", alertId, newTargetPrice);
                return updated;
            }
        }
        return null;
    }
}

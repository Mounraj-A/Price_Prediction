package com.omniprice.controller;

import com.omniprice.dto.AlertRequest;
import com.omniprice.model.Alert;
import com.omniprice.model.User;
import com.omniprice.repository.UserRepository;
import com.omniprice.service.AlertService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@RestController
@RequestMapping("/api/alerts")
public class AlertController {

    private static final Logger log = LoggerFactory.getLogger(AlertController.class);

    @Autowired
    private AlertService alertService;

    @Autowired
    private UserRepository userRepository;

    /**
     * Extract userId from JWT token
     */
    private Optional<String> userId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        
        if (auth == null) {
            log.warn("🔴 ALERT AUTH ERROR: SecurityContextHolder.getAuthentication() returned NULL");
            return Optional.empty();
        }
        
        log.info("✅ Auth object found: principal={}, authenticated={}", auth.getPrincipal(), auth.isAuthenticated());
        
        if (!auth.isAuthenticated()) {
            log.warn("🔴 ALERT AUTH ERROR: Authentication is not authenticated");
            return Optional.empty();
        }
        
        String email = auth.getName();
        log.info("✅ Extracted email from JWT: {}", email);
        
        Optional<String> userId = userRepository.findByEmail(email).map(User::getId);
        if (userId.isEmpty()) {
            log.warn("🔴 ALERT AUTH ERROR: User not found in DB with email: {}", email);
        } else {
            log.info("✅ Found user in DB: {}", userId.get());
        }
        return userId;
    }

    /**
     * Create a new price alert
     * POST /api/alerts
     */
    @PostMapping
    public ResponseEntity<?> createAlert(@RequestBody AlertRequest request) {
        log.info("📌 POST /api/alerts - Creating alert for product: {}", request.getProductKey());
        
        Optional<String> uidOpt = userId();
        if (uidOpt.isEmpty()) {
            log.warn("🔴 ALERT CREATE FAILED: User not authenticated/found");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                    "status", 401,
                    "message", "User not authenticated. Please login again."
            ));
        }

        if (request.getTargetPrice() <= 0) {
            log.warn("🔴 ALERT CREATE FAILED: Invalid target price: {}", request.getTargetPrice());
            return ResponseEntity.badRequest().body(Map.of(
                    "status", 400,
                    "message", "Target price must be greater than 0"
            ));
        }

        if (request.getProductKey() == null || request.getProductKey().isBlank()) {
            log.warn("🔴 ALERT CREATE FAILED: Missing product key");
            return ResponseEntity.badRequest().body(Map.of(
                    "status", 400,
                    "message", "Product key is required"
            ));
        }

        Alert alert = alertService.createAlert(
                uidOpt.get(),
                request.getProductKey(),
                request.getTargetPrice()
        );

        log.info("✅ ALERT CREATED: id={} userId={} productKey={} targetPrice={}", 
                alert.getId(), uidOpt.get(), request.getProductKey(), request.getTargetPrice());

        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                "id", alert.getId(),
                "productKey", alert.getProductKey(),
                "targetPrice", alert.getTargetPrice(),
                "isActive", alert.isActive(),
                "message", "Alert created successfully"
        ));
    }

    /**
     * Get all active alerts for current user
     * GET /api/alerts
     */
    @GetMapping
    public ResponseEntity<?> getUserAlerts() {
        Optional<String> uidOpt = userId();
        if (uidOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        List<Alert> alerts = alertService.getUserAlerts(uidOpt.get());
        return ResponseEntity.ok(alerts);
    }

    /**
     * Update alert target price
     * PUT /api/alerts/{id}
     */
    @PutMapping("/{id}")
    public ResponseEntity<?> updateAlert(@PathVariable String id, @RequestBody AlertRequest request) {
        Optional<String> uidOpt = userId();
        if (uidOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        if (request.getTargetPrice() <= 0) {
            return ResponseEntity.badRequest().body(Map.of(
                    "status", 400,
                    "message", "Target price must be greater than 0"
            ));
        }

        Alert updated = alertService.updateAlert(id, uidOpt.get(), request.getTargetPrice());
        if (updated == null) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok(Map.of(
                "id", updated.getId(),
                "targetPrice", updated.getTargetPrice(),
                "message", "Alert updated successfully"
        ));
    }

    /**
     * Delete/deactivate an alert
     * DELETE /api/alerts/{id}
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteAlert(@PathVariable String id) {
        Optional<String> uidOpt = userId();
        if (uidOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        alertService.deleteAlert(id, uidOpt.get());
        return ResponseEntity.ok(Map.of(
                "message", "Alert deleted successfully"
        ));
    }
}

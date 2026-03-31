package com.omniprice.controller;

import com.omniprice.model.Notification;
import com.omniprice.model.User;
import com.omniprice.repository.UserRepository;
import com.omniprice.service.NotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private UserRepository userRepository;

    @GetMapping
    public ResponseEntity<List<Notification>> list() {
        return userId()
                .map(uid -> ResponseEntity.ok(notificationService.getUserNotifications(uid)))
                .orElse(ResponseEntity.status(HttpStatus.UNAUTHORIZED).build());
    }

    @GetMapping("/unread")
    public ResponseEntity<List<Notification>> unread() {
        return userId()
                .map(uid -> ResponseEntity.ok(notificationService.getUnreadNotifications(uid)))
                .orElse(ResponseEntity.status(HttpStatus.UNAUTHORIZED).build());
    }

    @PostMapping("/read/{id}")
    public ResponseEntity<?> markRead(@PathVariable String id) {
        Optional<String> uidOpt = userId();
        if (uidOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return notificationService
                .markAsRead(id, uidOpt.get())
                .<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    private Optional<String> userId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            return Optional.empty();
        }
        String email = auth.getName();
        return userRepository.findByEmail(email).map(User::getId);
    }
}

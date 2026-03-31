package com.omniprice.service;

import com.omniprice.model.Notification;
import com.omniprice.model.NotificationType;
import com.omniprice.repository.NotificationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
public class NotificationService {

    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);

    @Autowired
    private NotificationRepository notificationRepository;

    public Notification createNotification(String userId, String productKey, NotificationType type, String message) {
        Notification n = Notification.builder()
                .userId(userId)
                .productKey(productKey)
                .type(type)
                .message(message)
                .isRead(false)
                .build();
        Notification saved = notificationRepository.save(n);
        log.info("Notification created: id={} userId={} type={} productKey={}", saved.getId(), userId, type, productKey);
        return saved;
    }

    public List<Notification> getUserNotifications(String userId) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    public List<Notification> getUnreadNotifications(String userId) {
        return notificationRepository.findByUserIdAndIsReadOrderByCreatedAtDesc(userId, false);
    }

    public long countUnread(String userId) {
        return notificationRepository.countByUserIdAndIsRead(userId, false);
    }

    public Optional<Notification> markAsRead(String notificationId, String userId) {
        Optional<Notification> opt = notificationRepository.findByIdAndUserId(notificationId, userId);
        if (opt.isEmpty()) {
            return Optional.empty();
        }
        Notification n = opt.get();
        n.setRead(true);
        return Optional.of(notificationRepository.save(n));
    }
}

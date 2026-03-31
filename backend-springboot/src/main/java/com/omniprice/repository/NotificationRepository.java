package com.omniprice.repository;

import com.omniprice.model.Notification;
import com.omniprice.model.NotificationType;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface NotificationRepository extends MongoRepository<Notification, String> {

    List<Notification> findByUserIdOrderByCreatedAtDesc(String userId);

    List<Notification> findByUserIdAndIsReadOrderByCreatedAtDesc(String userId, boolean isRead);

    long countByUserIdAndIsRead(String userId, boolean isRead);

    Optional<Notification> findByIdAndUserId(String id, String userId);

    boolean existsByUserIdAndProductKeyAndTypeAndCreatedAtAfter(
            String userId,
            String productKey,
            NotificationType type,
            LocalDateTime createdAt);
}

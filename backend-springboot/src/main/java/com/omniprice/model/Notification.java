package com.omniprice.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "notifications")
public class Notification {

    @Id
    private String id;

    @Indexed
    private String userId;

    @Indexed
    private String productKey;

    private NotificationType type;

    private String message;

    @Builder.Default
    private boolean isRead = false;

    @Indexed
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}

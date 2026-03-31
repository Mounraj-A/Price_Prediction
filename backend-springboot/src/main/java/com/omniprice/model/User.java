package com.omniprice.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.index.Indexed;
import java.time.LocalDateTime;

@Document(collection = "users")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class User {
    @Id
    private String id;

    @Indexed(unique = true)
    private String username;

    @Indexed(unique = true)
    private String email;

    private String password;

    private String fullName;

    private String avatar;

    private boolean enabled;

    /**
     * Email verification status.
     * Existing users without verification should be blocked until verified.
     */
    @Builder.Default
    private Boolean emailVerified = false;

    /** 6-digit OTP for email verification (cleared after verification) */
    private String otp;

    /** OTP expiry (cleared after verification) */
    private LocalDateTime otpExpiry;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    @Builder.Default
    private LocalDateTime lastLogin = null;
}

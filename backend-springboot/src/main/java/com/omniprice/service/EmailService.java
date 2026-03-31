package com.omniprice.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

/**
 * Sends email when {@code omni.notifications.email.enabled=true} and a {@link JavaMailSender} is available.
 */
@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    @Value("${omni.notifications.email.enabled:false}")
    private boolean emailEnabled;

    @Value("${omni.auth.otp.email.enabled:true}")
    private boolean otpEmailEnabled;

    @Value("${spring.mail.username:}")
    private String mailUsername;

    private final JavaMailSender mailSender;

    public EmailService(ObjectProvider<JavaMailSender> mailSenderProvider) {
        this.mailSender = mailSenderProvider.getIfAvailable();
    }

    public void sendEmail(String to, String subject, String message) {
        if (!emailEnabled) {
            log.debug("Email not sent (omni.notifications.email.enabled=false): subject={}", subject);
            return;
        }
        if (mailSender == null) {
            log.warn("Email not sent (no JavaMailSender bean). Configure spring.mail.*. subject={}", subject);
            return;
        }
        try {
            SimpleMailMessage mail = new SimpleMailMessage();
            mail.setTo(to);
            mail.setSubject(subject);
            mail.setText(message);
            mailSender.send(mail);
            log.info("Email sent to {} subject={}", to, subject);
        } catch (Exception e) {
            log.warn("Email send failed to {}: {}", to, e.getMessage());
        }
    }

    public void sendOtpEmail(String email, String otp) {
        if (!otpEmailEnabled) {
            log.debug("OTP email not sent (omni.auth.otp.email.enabled=false)");
            return;
        }
        if (mailUsername == null || mailUsername.isBlank()) {
            log.warn("OTP email not sent: spring.mail.username is not configured (empty).");
            return;
        }
        if (mailSender == null) {
            log.warn("OTP email not sent (no JavaMailSender bean). Configure spring.mail.*.");
            return;
        }
        try {
            SimpleMailMessage mail = new SimpleMailMessage();
            mail.setTo(email);
            mail.setSubject("Email Verification OTP");
            mail.setText("Your OTP is: " + otp + " (valid for 5 minutes)");
            mailSender.send(mail);
            log.info("OTP email sent to {}", email);
        } catch (Exception e) {
            log.warn("OTP email send failed to {} using SMTP user '{}': {}", email, mailUsername, e.getMessage());
        }
    }
}

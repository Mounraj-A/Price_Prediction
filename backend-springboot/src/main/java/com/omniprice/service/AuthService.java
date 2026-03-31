package com.omniprice.service;

import com.omniprice.dto.AuthResponse;
import com.omniprice.dto.LoginRequest;
import com.omniprice.dto.RegisterRequest;
import com.omniprice.dto.ResendOtpRequest;
import com.omniprice.dto.VerifyOtpRequest;
import com.omniprice.model.User;
import com.omniprice.repository.UserRepository;
import com.omniprice.utils.JwtUtil;
import com.omniprice.utils.OtpUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.regex.Pattern;

@Service
public class AuthService {

    private static final Pattern EMAIL_REGEX = Pattern.compile(
            "^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+$"
    );

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private EmailService emailService;

    /**
     * Register a new user
     */
    public AuthResponse register(RegisterRequest request) {
        String email = (request.getEmail() == null) ? "" : request.getEmail().trim().toLowerCase();
        if (!EMAIL_REGEX.matcher(email).matches()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid email format");
        }

        // Check if email already exists
        if (userRepository.existsByEmail(email)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Email already registered"
            );
        }

        // Check if username already exists
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Username already taken"
            );
        }

        String otp = OtpUtil.generate6DigitOtp();
        LocalDateTime otpExpiry = LocalDateTime.now().plusMinutes(5);

        // Create new user
        User user = User.builder()
                .username(request.getUsername())
                .email(email)
                .password(passwordEncoder.encode(request.getPassword()))
                .fullName(request.getFullName())
                .enabled(true)
                .emailVerified(false)
                .otp(otp)
                .otpExpiry(otpExpiry)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        User savedUser = userRepository.save(user);

        try {
            emailService.sendOtpEmail(savedUser.getEmail(), otp);
        } catch (Exception ignored) {
            // never crash registration on email failure
        }

        return AuthResponse.builder()
                .username(savedUser.getUsername())
                .email(savedUser.getEmail())
                .fullName(savedUser.getFullName())
                .avatar(savedUser.getAvatar())
                .createdAt(savedUser.getCreatedAt())
                .emailVerified(savedUser.getEmailVerified())
                .message("OTP sent to email")
                .build();
    }

    /**
     * Login user and return JWT token
     */
    public AuthResponse login(LoginRequest request) {
        // Find user by email
        String email = (request.getEmail() == null) ? "" : request.getEmail().trim().toLowerCase();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.UNAUTHORIZED,
                                "Invalid email or password"
                        )
                );

        // Check if password matches
        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Invalid email or password"
            );
        }

        if (!Boolean.TRUE.equals(user.getEmailVerified())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Email not verified");
        }

        // Update last login
        user.setLastLogin(LocalDateTime.now());
        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);

        // Generate token
        String token = jwtUtil.generateToken(user.getEmail(), user.getUsername());

        return AuthResponse.builder()
                .token(token)
                .username(user.getUsername())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .avatar(user.getAvatar())
                .createdAt(user.getCreatedAt())
                .emailVerified(user.getEmailVerified())
                .build();
    }

    public AuthResponse verifyOtp(VerifyOtpRequest request) {
        String email = (request.getEmail() == null) ? "" : request.getEmail().trim().toLowerCase();
        String otp = (request.getOtp() == null) ? "" : request.getOtp().trim();

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        if (Boolean.TRUE.equals(user.getEmailVerified())) {
            return AuthResponse.builder()
                    .email(user.getEmail())
                    .emailVerified(true)
                    .message("Email already verified")
                    .build();
        }

        if (user.getOtp() == null || user.getOtpExpiry() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "OTP not generated. Please resend OTP.");
        }

        if (!user.getOtp().equals(otp)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid OTP");
        }

        if (LocalDateTime.now().isAfter(user.getOtpExpiry())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "OTP expired");
        }

        user.setEmailVerified(true);
        user.setOtp(null);
        user.setOtpExpiry(null);
        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);

        return AuthResponse.builder()
                .email(user.getEmail())
                .emailVerified(true)
                .message("Email verified successfully")
                .build();
    }

    public AuthResponse resendOtp(ResendOtpRequest request) {
        String email = (request.getEmail() == null) ? "" : request.getEmail().trim().toLowerCase();
        if (!EMAIL_REGEX.matcher(email).matches()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid email format");
        }

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        if (Boolean.TRUE.equals(user.getEmailVerified())) {
            return AuthResponse.builder()
                    .email(user.getEmail())
                    .emailVerified(true)
                    .message("Email already verified")
                    .build();
        }

        String otp = OtpUtil.generate6DigitOtp();
        user.setOtp(otp);
        user.setOtpExpiry(LocalDateTime.now().plusMinutes(5));
        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);

        try {
            emailService.sendOtpEmail(user.getEmail(), otp);
        } catch (Exception ignored) {
        }

        return AuthResponse.builder()
                .email(user.getEmail())
                .emailVerified(false)
                .message("OTP sent to email")
                .build();
    }

    /**
     * Get user by email (for validation)
     */
    public User getUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "User not found"
                        )
                );
    }
}

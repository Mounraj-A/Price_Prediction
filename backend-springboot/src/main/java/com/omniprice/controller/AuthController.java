package com.omniprice.controller;

import com.omniprice.dto.AuthResponse;
import com.omniprice.dto.LoginRequest;
import com.omniprice.dto.ResendOtpRequest;
import com.omniprice.dto.RegisterRequest;
import com.omniprice.dto.VerifyOtpRequest;
import com.omniprice.service.AuthService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "http://localhost:5173", allowCredentials = "true")
public class AuthController {

    @Autowired
    private AuthService authService;

    /**
     * POST /api/auth/register
     * Register a new user
     */
    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@RequestBody RegisterRequest request) {
        AuthResponse response = authService.register(request);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    /**
     * POST /api/auth/login
     * Login user and return JWT token
     */
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@RequestBody LoginRequest request) {
        AuthResponse response = authService.login(request);
        return new ResponseEntity<>(response, HttpStatus.OK);
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<AuthResponse> verifyOtp(@RequestBody VerifyOtpRequest request) {
        AuthResponse response = authService.verifyOtp(request);
        return new ResponseEntity<>(response, HttpStatus.OK);
    }

    @PostMapping("/resend-otp")
    public ResponseEntity<AuthResponse> resendOtp(@RequestBody ResendOtpRequest request) {
        AuthResponse response = authService.resendOtp(request);
        return new ResponseEntity<>(response, HttpStatus.OK);
    }

    /**
     * GET /api/auth/validate
     * Validate token (protected endpoint)
     */
    @GetMapping("/validate")
    public ResponseEntity<AuthResponse> validateToken() {
        // This endpoint is protected - only accessible with valid JWT
        return new ResponseEntity<>(HttpStatus.OK);
    }
}

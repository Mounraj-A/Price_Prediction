package com.omniprice.utils;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit Tests for JwtUtil
 * Verifies JWT token generation, validation, and claim extraction
 */
public class JwtUtilTest {

    private JwtUtil jwtUtil;

    @BeforeEach
    public void setUp() {
        jwtUtil = new JwtUtil();
        // Set JWT secret and expiration using reflection
        ReflectionTestUtils.setField(jwtUtil, "jwtSecret", 
            "OmniPriceSecretKeyForJWT2026ProductComparison123456789SecureAuthentication");
        ReflectionTestUtils.setField(jwtUtil, "jwtExpiration", 86400000L);
    }

    @Test
    public void testGenerateToken() {
        System.out.println("\n========== TEST: Generate Token ==========");
        
        String email = "test@example.com";
        String username = "testuser";
        
        String token = jwtUtil.generateToken(email, username);
        
        assertNotNull(token, "Token should not be null");
        assertTrue(token.contains("."), "Token should have 3 parts separated by dots");
        System.out.println("✅ Token Generated: " + token.substring(0, 50) + "...");
        System.out.println("✅ Token Length: " + token.length() + " characters");
    }

    @Test
    public void testValidateToken() {
        System.out.println("\n========== TEST: Validate Token ==========");
        
        String email = "user@test.com";
        String username = "user123";
        String token = jwtUtil.generateToken(email, username);
        
        boolean isValid = jwtUtil.validateToken(token);
        
        assertTrue(isValid, "Valid token should pass validation");
        System.out.println("✅ Token Validation: PASSED");
    }

    @Test
    public void testInvalidToken() {
        System.out.println("\n========== TEST: Invalid Token ==========");
        
        String invalidToken = "invalid.token.here";
        boolean isValid = jwtUtil.validateToken(invalidToken);
        
        assertFalse(isValid, "Invalid token should fail validation");
        System.out.println("✅ Invalid Token Rejection: PASSED");
    }

    @Test
    public void testExtractEmail() {
        System.out.println("\n========== TEST: Extract Email ==========");
        
        String email = "john@example.com";
        String username = "john_doe";
        String token = jwtUtil.generateToken(email, username);
        
        String extractedEmail = jwtUtil.getEmailFromToken(token);
        
        assertEquals(email, extractedEmail, "Email should match");
        System.out.println("✅ Email Extracted: " + extractedEmail);
    }

    @Test
    public void testExtractUsername() {
        System.out.println("\n========== TEST: Extract Username ==========");
        
        String email = "jane@example.com";
        String username = "jane_doe";
        String token = jwtUtil.generateToken(email, username);
        
        String extractedUsername = jwtUtil.getUsernameFromToken(token);
        
        assertEquals(username, extractedUsername, "Username should match");
        System.out.println("✅ Username Extracted: " + extractedUsername);
    }

    @Test
    public void testTokenExpiration() {
        System.out.println("\n========== TEST: Token Expiration ==========");
        
        String email = "test@example.com";
        String username = "testuser";
        String token = jwtUtil.generateToken(email, username);
        
        boolean isExpired = jwtUtil.isTokenExpired(token);
        
        assertFalse(isExpired, "Fresh token should not be expired");
        System.out.println("✅ Token Not Expired: PASSED");
    }

    @Test
    public void testTokenConsistency() {
        System.out.println("\n========== TEST: Token Consistency ==========");
        
        String email = "consistency@test.com";
        String username = "consistent_user";
        String token = jwtUtil.generateToken(email, username);
        
        // Validate multiple times
        for (int i = 0; i < 5; i++) {
            assertTrue(jwtUtil.validateToken(token), 
                "Token should remain valid across multiple validations");
        }
        
        // Extract claims multiple times
        assertEquals(email, jwtUtil.getEmailFromToken(token));
        assertEquals(username, jwtUtil.getUsernameFromToken(token));
        
        System.out.println("✅ Token Consistency: PASSED (5 validations successful)");
    }

    @Test
    public void testDifferentTokens() {
        System.out.println("\n========== TEST: Different Tokens ==========");
        
        String token1 = jwtUtil.generateToken("user1@test.com", "user1");
        String token2 = jwtUtil.generateToken("user2@test.com", "user2");
        
        assertNotEquals(token1, token2, "Different inputs should produce different tokens");
        assertTrue(jwtUtil.validateToken(token1), "Token 1 should be valid");
        assertTrue(jwtUtil.validateToken(token2), "Token 2 should be valid");
        
        assertEquals("user1@test.com", jwtUtil.getEmailFromToken(token1));
        assertEquals("user2@test.com", jwtUtil.getEmailFromToken(token2));
        
        System.out.println("✅ Different Tokens Correctly Generated");
    }
}

package com.omniprice.utils;

import java.security.SecureRandom;

public final class OtpUtil {

    private static final SecureRandom RNG = new SecureRandom();

    private OtpUtil() {}

    public static String generate6DigitOtp() {
        int n = 100000 + RNG.nextInt(900000);
        return Integer.toString(n);
    }
}


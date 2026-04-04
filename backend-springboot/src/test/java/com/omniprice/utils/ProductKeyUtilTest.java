package com.omniprice.utils;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class ProductKeyUtilTest {

    @Test
    void standardKey_samsungGalaxyM56_128gb() {
        String title = "Samsung Galaxy M56 5G 8GB 128GB";
        assertEquals("samsung_m56_128gb", ProductKeyUtil.generateStandardProductKey(title));
    }

    @Test
    void standardKey_iphone15ProMax_256gb() {
        String title = "Apple iPhone 15 Pro Max 256GB";
        assertEquals("apple_iphone15promax_256gb", ProductKeyUtil.generateStandardProductKey(title));
    }

    @Test
    void standardKey_pixel9a_128gb() {
        String title = "Google Pixel 9a 128GB";
        assertEquals("google_pixel9a_128gb", ProductKeyUtil.generateStandardProductKey(title));
    }

    @Test
    void standardKey_stripsRamFromCanonicalKey() {
        String title = "Samsung Galaxy S23 8GB RAM 128GB";
        assertEquals("samsung_s23_128gb", ProductKeyUtil.generateStandardProductKey(title));
    }

    @Test
    void standardKey_brandOnlyQueryDoesNotDuplicateBrand() {
        assertEquals("oppo", ProductKeyUtil.generateStandardProductKey("Oppo"));
        assertEquals("vivo", ProductKeyUtil.generateStandardProductKey("Vivo mobile"));
    }
}

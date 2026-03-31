package com.omniprice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AlertRequest {

    private String productName;      // Display name (e.g., "Apple iPhone 15")
    private String productKey;       // Unique key (e.g., "amazon::iphone-15")
    private double targetPrice;      // Price threshold
}

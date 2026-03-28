package com.omniprice.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import com.fasterxml.jackson.annotation.JsonFormat;

import java.time.LocalDateTime;

@Data
@Document(collection = "price_history")
public class PriceHistory {

    @Id
    private String id;

    private String productName;
    private String normalizedName;
    private String platform;

    private double price;

    // 🔥 Product identity
    private String productKey;

    // 🔥 AUTO TIME (IMPORTANT FIX)
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdAt = LocalDateTime.now();
}
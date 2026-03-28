package com.omniprice.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@Document(collection = "products")
public class Product {

    @Id
    private String id;

    private String productName;
    private String normalizedName;   // 🔥 IMPORTANT
    private String platform;

    private double price;
    private double rating;

    private String brand;
    private String offer;
    private String link;
    private String image;

    // ML Prediction
    private double predictedPrice;

    // 🔥 IMPORTANT FOR GROUPING
    private String productKey;
}
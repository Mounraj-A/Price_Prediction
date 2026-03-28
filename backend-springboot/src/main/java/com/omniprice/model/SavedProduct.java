package com.omniprice.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.util.Date;

@Document(collection = "saved_products")
public class SavedProduct {

    @Id
    private String id;
    
    // 🔥 The most important field for privacy:
    private String userId; 

    private String productKey;
    private String productName; // Differentiates variants (e.g., Blue vs Green)
    private String platform;
    private String price;
    private String image;
    private String link;
    private Date savedAt;

    public SavedProduct() {
        this.savedAt = new Date();
    }

    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public String getProductKey() { return productKey; }
    public void setProductKey(String productKey) { this.productKey = productKey; }

    public String getProductName() { return productName; }
    public void setProductName(String productName) { this.productName = productName; }

    public String getPlatform() { return platform; }
    public void setPlatform(String platform) { this.platform = platform; }

    public String getPrice() { return price; }
    public void setPrice(String price) { this.price = price; }

    public String getImage() { return image; }
    public void setImage(String image) { this.image = image; }

    public String getLink() { return link; }
    public void setLink(String link) { this.link = link; }

    public Date getSavedAt() { return savedAt; }
    public void setSavedAt(Date savedAt) { this.savedAt = savedAt; }
}
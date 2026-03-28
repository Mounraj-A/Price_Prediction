package com.omniprice.repository;

import com.omniprice.model.SavedProduct;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SavedProductRepository extends MongoRepository<SavedProduct, String> {
    
    // Get all saved products for a specific user
    List<SavedProduct> findByUserIdOrderBySavedAtDesc(String userId);
    
    // Check for duplicates using the exact product name to allow saving different variants!
    Optional<SavedProduct> findByUserIdAndProductNameAndPlatform(String userId, String productName, String platform);
    
    // Delete a specific saved product
    void deleteByUserIdAndProductNameAndPlatform(String userId, String productName, String platform);
    
    // Clear all for a specific user
    void deleteAllByUserId(String userId);
}
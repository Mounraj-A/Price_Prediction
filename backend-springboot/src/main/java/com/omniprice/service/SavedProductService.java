package com.omniprice.service;

import com.omniprice.model.SavedProduct;
import com.omniprice.repository.SavedProductRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class SavedProductService {

    @Autowired
    private SavedProductRepository savedProductRepository;

    public List<SavedProduct> getUserSavedProducts(String userId) {
        return savedProductRepository.findByUserIdOrderBySavedAtDesc(userId);
    }

    public SavedProduct saveProduct(String userId, SavedProduct product) {
        // 🔥 Duplicate Check: Uses precise productName so they can save multiple variants!
        Optional<SavedProduct> existing = savedProductRepository
            .findByUserIdAndProductNameAndPlatform(userId, product.getProductName(), product.getPlatform());
            
        if (existing.isPresent()) {
            return existing.get(); // Already saved, just return it
        }

        product.setUserId(userId);
        return savedProductRepository.save(product);
    }

    public void removeProduct(String userId, String productName, String platform) {
        savedProductRepository.deleteByUserIdAndProductNameAndPlatform(userId, productName, platform);
    }

    public void clearAllUserProducts(String userId) {
        savedProductRepository.deleteAllByUserId(userId);
    }
}
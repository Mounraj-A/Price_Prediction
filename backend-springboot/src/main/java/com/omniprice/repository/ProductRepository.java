package com.omniprice.repository;

import com.omniprice.model.Product;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface ProductRepository extends MongoRepository<Product, String> {

    // 🔥 Useful for filtering by product
    List<Product> findByNormalizedName(String normalizedName);

}
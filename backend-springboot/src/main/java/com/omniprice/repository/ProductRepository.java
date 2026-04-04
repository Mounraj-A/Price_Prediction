package com.omniprice.repository;

import com.omniprice.model.Product;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import java.util.List;

public interface ProductRepository extends MongoRepository<Product, String> {

    // 🔥 Useful for filtering by product
    List<Product> findByNormalizedName(String normalizedName);

    // Exact match on canonical productKey
    List<Product> findByProductKey(String productKey);

    /**
     * Flexible search: normalizedName/productName/brand contains query (regex, case-insensitive).
     * Use Pageable to enforce LIMIT (e.g., 50).
     */
    @Query("{ '$or': [ " +
            "{ 'normalizedName': { $regex: ?0, $options: 'i' } }, " +
            "{ 'productName':   { $regex: ?0, $options: 'i' } }, " +
            "{ 'brand':         { $regex: ?0, $options: 'i' } } " +
            "] }")
    List<Product> findByLooseQuery(String queryRegex, Pageable pageable);

}
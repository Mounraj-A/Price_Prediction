package com.omniprice.repository;

import com.omniprice.model.PriceHistory;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface PriceHistoryRepository extends MongoRepository<PriceHistory, String> {

    // List<PriceHistory> findByNormalizedNameOrderByCreatedAtAsc(String normalizedName);

    // 🔥 BEST FOR ML
    List<PriceHistory> findByProductKeyOrderByCreatedAtAsc(String productKey);
}
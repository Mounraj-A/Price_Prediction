package com.omniprice.repository;

import com.omniprice.model.PriceHistory;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface PriceHistoryRepository extends MongoRepository<PriceHistory, String> {

    // List<PriceHistory> findByNormalizedNameOrderByCreatedAtAsc(String normalizedName);

    // 🔥 BEST FOR ML
    List<PriceHistory> findByProductKeyOrderByCreatedAtAsc(String productKey);

    /** Latest snapshot for a variant (used by price monitor before new search writes history). */
    Optional<PriceHistory> findFirstByProductKeyOrderByCreatedAtDesc(String productKey);
}
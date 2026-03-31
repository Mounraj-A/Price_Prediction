package com.omniprice.repository;

import com.omniprice.model.Alert;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AlertRepository extends MongoRepository<Alert, String> {

    List<Alert> findByIsActiveTrue();

    List<Alert> findByUserIdAndIsActive(String userId, boolean isActive);
}

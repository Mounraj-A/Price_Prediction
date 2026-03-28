package com.omniprice.controller;

import com.omniprice.model.SavedProduct;
import com.omniprice.service.SavedProductService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/saved")
public class SavedProductController {

    @Autowired
    private SavedProductService savedProductService;

    // GET: Fetch all saved products for the currently logged-in user
    @GetMapping
    public ResponseEntity<List<SavedProduct>> getSavedProducts(Principal principal) {
        // principal.getName() extracts the username/email from the JWT automatically
        List<SavedProduct> products = savedProductService.getUserSavedProducts(principal.getName());
        return ResponseEntity.ok(products);
    }

    // POST: Save a new product
    @PostMapping
    public ResponseEntity<SavedProduct> saveProduct(@RequestBody SavedProduct product, Principal principal) {
        SavedProduct saved = savedProductService.saveProduct(principal.getName(), product);
        return ResponseEntity.ok(saved);
    }

    // DELETE: Remove a specific product
    @DeleteMapping("/remove")
    public ResponseEntity<?> removeProduct(
            @RequestParam String productName, 
            @RequestParam String platform, 
            Principal principal) {
        savedProductService.removeProduct(principal.getName(), productName, platform);
        return ResponseEntity.ok().build();
    }

    // DELETE: Clear all saved products for the user
    @DeleteMapping("/clear")
    public ResponseEntity<?> clearAllProducts(Principal principal) {
        savedProductService.clearAllUserProducts(principal.getName());
        return ResponseEntity.ok().build();
    }
}
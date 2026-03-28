# 🔐 Double URL Encoding Fix - Complete Guide

## 📋 Problem Summary

When searching for a product like "iPhone 15 Pro", the query was being **double URL-encoded**:

```
React sends:        GET /api/products/search?product=iPhone%2015%20Pro ✅
Spring receives:    product = "iPhone 15 Pro" (auto-decoded by @RequestParam)
Spring forwards as: GET /search?product=iPhone%252015%2520Pro ❌ (DOUBLE ENCODED!)
Python receives:    product = "iPhone%2015%20Pro" (percent signs as literal characters)
Result:             "iPhone%2015%20Pro" ≠ "iPhone 15 Pro" → semantic filtering fails
```

---
🚀 STEP 1 — Start All Services
🟢 1. Start MongoDB
mongod
🟢 2. Start Python AI Service
cd ai-python-service
uvicorn app:app --reload --port 8000

Check:

http://localhost:8000/health

Expected:

{
  "status": "AI service running"
}
🟢 3. Start Spring Boot
cd backend-springboot
mvn spring-boot:run

Check:

http://localhost:8080/api/products/health
🧪 STEP 2 — Test Python AI Directly

👉 This ensures AI + ML works independently

http://localhost:8000/api/search?product=iphone
✅ Expected Response
{
  "products": [
    {
      "productName": "...",
      "normalizedName": "...",
      "platform": "...",
      "price": 50000
    }
  ],
  "prediction": {
    "predicted_tomorrow": 51000,
    "predicted_next_week": 49500
  }
}
🧪 STEP 3 — Test Spring Boot API

👉 This tests full pipeline

http://localhost:8080/api/products/search?product=iphone
✅ Expected Flow
Spring Boot
   ↓
Python API
   ↓
Scrapers
   ↓
AI Matching
   ↓
ML Prediction
   ↓
Spring Boot
   ↓
MongoDB
✅ Expected Output
[
  {
    "productName": "...",
    "normalizedName": "...",
    "platform": "Flipkart",
    "price": 51500,
    "predictedPrice": 50500
  }
]
🧪 STEP 4 — Check MongoDB

Open:

mongosh
use omni_price_db
🔍 Check Products
db.products.find().pretty()

✅ Must contain:

{
  "productName": "...",
  "normalizedName": "...",
  "price": 50000,
  "predictedPrice": 50500
}
🔍 Check Price History
db.price_history.find().pretty()

✅ Must contain:

{
  "productName": "...",
  "normalizedName": "...",
  "price": 50000,
  "date": "2026-03-21"
}
🧪 STEP 5 — Test ML Endpoint
http://localhost:8000/predict?product=iphone
✅ Expected
{
  "product": "iphone",
  "predicted_tomorrow": 51000,
  "predicted_next_week": 49500
}

## 🎯 Root Cause Analysis

### The Chain of Encoding

1. **React Layer** ✅
   ```javascript
   axios.get('/api/products/search', { params: { product: "iPhone 15 Pro" } })
   // axios automatically encodes: "iPhone 15 Pro" → "iPhone%2015%20Pro"
   // Request: GET /api/products/search?product=iPhone%2015%20Pro
   ```

2. **Spring Boot Controller** ✅
   ```java
   @GetMapping("/search")
   public void searchProducts(@RequestParam String product)
   // @RequestParam automatically decodes: "iPhone%2015%20Pro" → "iPhone 15 Pro"
   // Variable product = "iPhone 15 Pro"
   ```

3. **Spring Boot Service** ❌ **PROBLEM HERE**
   ```java
   String url = UriComponentsBuilder
       .fromUriString("http://localhost:8000/search")
       .queryParam("product", "iPhone 15 Pro")
       .toUriString();  // Returns STRING: "http://localhost:8000/search?product=iPhone%2015%20Pro"
   
   restTemplate.exchange(url, ...);
   // RestTemplate receives a STRING and tries to parse it
   // RestTemplate sees '%' as a special character and encodes it again
   // '%' → '%25'
   // "iPhone%2015%20Pro" → "iPhone%252015%2520Pro" ❌ DOUBLE ENCODED!
   ```

4. **Python FastAPI** ❌
   ```python
   @router.get("/search")
   def search_products(product: str):
   # Receives: product = "iPhone%2015%20Pro" (literally, with % as characters)
   # Expected: product = "iPhone 15 Pro"
   ```

---

## ✅ The Fixes Applied

### Fix 1: Spring Boot ProductService (Main Fix)

**File:** `backend-springboot/src/main/java/com/omniprice/service/ProductService.java`

**Problem:**
```java
// WRONG: toUriString() returns a String that RestTemplate re-encodes
String url = UriComponentsBuilder
    .fromUriString(pythonApiUrl)
    .queryParam("product", productName)
    .toUriString();

restTemplate.exchange(url, HttpMethod.GET, ...);  // String gets re-encoded!
```

**Solution:**
```java
// CORRECT: toUri() returns a URI object that RestTemplate handles correctly
URI uri = UriComponentsBuilder
    .fromUriString(pythonApiUrl)
    .queryParam("product", productName)
    .build()
    .toUri();  // Returns URI object, not String

restTemplate.exchange(uri, HttpMethod.GET, ...);  // RestTemplate treats it properly

// Log for debugging
System.out.println("[DEBUG] Decoded query: " + productName);
System.out.println("[DEBUG] Full URI: " + uri.toString());
```

**Why it works:**
- `toUri()` returns a properly encoded `java.net.URI` object
- `RestTemplate` understands URI objects and doesn't re-encode them
- String URLs get parsed and re-encoded by RestTemplate, causing double encoding

---

### Fix 2: React Frontend (Verification)

**File:** `frontend/src/services/api.js`

**Current (Already Correct):**
```javascript
export const productApi = {
  search: (query) => {
    // CORRECT: Let axios handle the encoding
    return api.get('/api/products/search', { params: { product: query } });
  },
};
```

**✅ Why it's correct:**
- axios automatically URL-encodes parameters when using the `params` object
- Do NOT manually call `encodeURIComponent()` - axios will do it for you
- Example: `"iPhone 15 Pro"` → `"iPhone%2015%20Pro"` (axios handles this)

**❌ What NOT to do:**
```javascript
// WRONG: Double encoding - axios will encode it again!
api.get(`/api/products/search?product=${encodeURIComponent(query)}`);
// "iPhone 15 Pro" → encodeURIComponent → "iPhone%2015%20Pro"
// Then axios tries to parse URL and encodes it again → "iPhone%252015%2520Pro"
```

---

### Fix 3: Python FastAPI (Defensive Decoding)

**File:** `ai-python-service/api/search_api.py`

**Added Defensive Decoding:**
```python
import urllib.parse

@router.get("/search")
def search_products(product: str):
    
    # Defensive decoding: Handle both single and double-encoded inputs
    decoded_product = product
    attempt = 0
    max_attempts = 2
    
    while attempt < max_attempts:
        try:
            test_decode = urllib.parse.unquote(decoded_product)
            # If decoding changes nothing, we've reached the original
            if test_decode == decoded_product:
                break
            decoded_product = test_decode
            attempt += 1
        except:
            break
    
    # Log for debugging
    print(f"[DEBUG] Original query param: '{product}'")
    print(f"[DEBUG] Decoded query: '{decoded_product}'")
    if product != decoded_product:
        print(f"[DEBUG] Applied {attempt} level(s) of URL decoding")
    
    # Use decoded_product for all downstream processing
    parsed_query = parse_query(decoded_product)
    search_keyword = parsed_query["keyword"]
    # ... rest of the function
```

**Why it helps:**
- Safely handles both properly-encoded and double-encoded inputs
- `urllib.parse.unquote()` decodes URL-encoded strings
- Will decode once if input is correctly encoded, or twice if it's double-encoded
- Prevents semantic filtering from failing due to malformed queries
- All downstream processing (scrapers, AI matching) gets the clean query

---

### Fix 4: Spring Boot PythonApiService (Cleanup)

**File:** `backend-springboot/src/main/java/com/omniprice/service/PythonApiService.java`

**Deprecated** the dangerous string concatenation pattern:
```java
// OLD (UNSAFE): String concatenation without encoding
String url = PYTHON_API + product;  // Vulnerable to injection!

// NEW (SAFE): Use UriComponentsBuilder
URI uri = UriComponentsBuilder
    .fromUriString(PYTHON_API)
    .queryParam("product", product)
    .build()
    .toUri();
```

**Note:** This service is marked as `@Deprecated` since `ProductService` is the correct choice. But if it needs to be used, it now uses proper URL encoding.

---

## 🧪 Testing the Fix

### Step 1: Verify Spring Boot Logging
```bash
# Restart Spring Boot service
# Search for "iPhone 15 Pro"

# Expected logs:
[DEBUG] Decoded query: iPhone 15 Pro
[DEBUG] Full URI: http://localhost:8000/search?product=iPhone%2015%20Pro
```

### Step 2: Verify Python Logs
```bash
# Restart Python AI service
# Check terminal output:

[DEBUG] Original query param: 'iPhone%2015%20Pro'
[DEBUG] Decoded query: 'iPhone 15 Pro'
[DEBUG] Applied 1 level(s) of URL decoding
[DEBUG] Amazon: 10 | Flipkart: 8 | Google: 12 | eBay: 5 | Walmart: 6
[DEBUG] Search completed for 'iPhone 15 Pro' in 2.34 seconds | Results: 13
```

### Step 3: Frontend Should Show Results
```javascript
// Before fix: "No products found"
// After fix: "Found 13 products across all platforms 🎉"

// Results should include all platforms:
// ✅ Amazon products
// ✅ Flipkart products  
// ✅ Google Shopping results
// ✅ eBay listings
// ✅ Walmart deals
```

### Step 4: Test Edge Cases

**Test 1: Single Space**
```
Query: "iPhone 15"
Expected URL: /search?product=iPhone%2015
Expected in Python: "iPhone 15" ✅
```

**Test 2: Multiple Spaces**
```
Query: "Apple iPhone 15 Pro 128GB"
Expected URL: /search?product=Apple%20iPhone%2015%20Pro%20128GB
Expected in Python: "Apple iPhone 15 Pro 128GB" ✅
```

**Test 3: Special Characters**
```
Query: "iPhone 15 (Black)"
Expected URL: /search?product=iPhone%2015%20%28Black%29
Expected in Python: "iPhone 15 (Black)" ✅
```

**Test 4: Price Filters**
```
Query: "iPhone under 80000"
Expected URL: /search?product=iPhone%20under%2080000
Expected parsing: keyword="iPhone", max_price=80000 ✅
```

---

## 🔍 How to Debug If Issues Persist

### Debug Level 1: React
```javascript
// In HomePage.jsx, before calling productApi.search():
console.log("Search query:", q.trim());

// In api.js, add interceptor:
api.interceptors.request.use(config => {
  console.log("Request URL:", config.url);
  console.log("Request params:", config.params);
  return config;
});
// Expected: params.product = "iPhone 15 Pro" (NOT pre-encoded)
```

### Debug Level 2: Spring Boot
```java
// In ProductController:
@GetMapping("/search")
public void searchProducts(@RequestParam String product) {
    System.out.println("[DEBUG-CONTROLLER] Received product: " + product);
    // Expected: "iPhone 15 Pro" (decoded by @RequestParam)
    
    List<Product> results = productService.searchProduct(product);
}

// In ProductService.searchProduct():
// Already has debug logging for URI
// Expected: URI ending with ?product=iPhone%2015%20Pro
```

### Debug Level 3: Python FastAPI
```python
# Check the logs we added
# Expected: 
# [DEBUG] Original query param: 'iPhone%2015%20Pro'
# [DEBUG] Decoded query: 'iPhone 15 Pro'

# If you see double-encoded input:
# [DEBUG] Original query param: 'iPhone%252015%2520Pro'
# [DEBUG] Decoded query: 'iPhone%2015%20Pro' (after 1st decode)
# [DEBUG] Applied 2 level(s) of URL decoding
# This means our defensive decoding is handling it correctly
```

### Debug Level 4: Semantic Filtering
```python
# In ai-python-service/api/search_api.py
# Check keyword filtering stage
print(f"[DEBUG] After keyword filter: {len(filtered_products)} total | Flipkart: {flipkart_count}")

# If products are being filtered out incorrectly:
# The search keyword is wrong
# Check that parse_query() receives the decoded product
```

---

## 📊 Impact Summary

| Component | Before | After | Fix Type |
|-----------|--------|-------|----------|
| React → Spring | ✅ Correct | ✅ Correct | Verified |
| Spring → Python | ❌ Double-encoded | ✅ Properly encoded | Changed from `.toUriString()` to `.toUri()` |
| Python Handling | ❌ No handling | ✅ Defensive decode | Added `urllib.parse.unquote()` |
| API Response | ❌ Empty/Errors | ✅ Full results | Query now properly decoded |
| Semantic Filtering | ❌ Fails | ✅ Works | Query matching now correct |
| Frontend UI | ❌ "No products" | ✅ All products shown | Results now flow correctly |

---

## 🎯 Key Takeaways

1. **URL Encoding Happens Automatically**
   - Browser/axios: Encodes spaces to `%20`, special chars encoded
   - Never manually `encodeURIComponent()` when using axios params
   - Spring @RequestParam: Auto-decodes received URL parameters

2. **RestTemplate Expects URI Objects, Not Strings**
   - ✅ CORRECT: `UriComponentsBuilder.build().toUri()` → returns URI object
   - ❌ WRONG: `UriComponentsBuilder.toUriString()` → returns String that gets re-encoded

3. **Defensive Decoding in Python**
   - Prevents downstream failures from encoding issues
   - `urllib.parse.unquote()` is safe to call multiple times
   - Logs clearly show what decoding occurred

4. **Testing Each Layer**
   - Frontend: Check browser DevTools Network tab for query params
   - Backend: Add System.out.println() to see decoded values
   - Python: Check stdout for [DEBUG] logs showing decoded product

---

## 📝 Files Modified

1. ✅ `backend-springboot/src/main/java/com/omniprice/service/ProductService.java`
   - Changed `toUriString()` to `toUri().build()`
   - Added debug logging

2. ✅ `frontend/src/services/api.js`
   - Added comment explaining correct pattern for axios params
   - Verified no manual encoding is done

3. ✅ `ai-python-service/api/search_api.py`
   - Added `import urllib.parse`
   - Added defensive URL decoding logic
   - Updated to use `decoded_product` throughout
   - Enhanced debug logging

4. ✅ `backend-springboot/src/main/java/com/omniprice/service/PythonApiService.java`
   - Marked as deprecated (string concatenation is unsafe)
   - Updated to use UriComponentsBuilder as example
   - Added explanatory comments

---

## ✅ Verification Checklist

- [ ] Spring Boot rebuilt and restarted
- [ ] Search for "iPhone 15 Pro" returns results
- [ ] No "No products found" errors
- [ ] Debug logs show correct decoding at each layer
- [ ] All platforms (Amazon, Flipkart, Google, eBay, Walmart) appear
- [ ] Semantic filtering works (irrelevant products filtered out)
- [ ] Price filters work correctly
- [ ] Special characters in queries work ("iPhone (Black)" etc.)
- [ ] Multiple-word queries work ("Apple iPhone 15 Pro")

All done! 🎉

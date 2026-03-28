# MongoDB Schema Specification

## Database: `omni_price_db`

### Collection: `products`

**Purpose**: Stores all fetched products with predictions

**Sample Document**:
```json
{
  "_id": ObjectId("..."),
  "productName": "Apple iPhone 13 Pro Max 256GB",
  "normalizedName": "apple iphone 13 pro max 256gb",
  "productKey": "iphone 13",
  "platform": "Amazon",
  "price": 129999,
  "rating": 4.5,
  "brand": "Apple",
  "offer": "₹10,000 off",
  "link": "https://amazon.in/...",
  "image": "https://images.../...",
  "predictedPrice": 128500,
  "createdAt": ISODate("2026-03-22T10:30:00Z"),
  "updatedAt": ISODate("2026-03-22T10:30:00Z")
}
```

**Field Details**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | ObjectId | Auto | MongoDB ID |
| `productName` | String | ✅ | Full product title from scraper |
| `normalizedName` | String | ✅ | Lowercase, no special chars (for search) |
| `productKey` | String | ✅ | **CRITICAL**: Model identifier (e.g., "iphone 13", "samsung galaxy s24") |
| `platform` | String | ✅ | Amazon, Flipkart, Myntra, etc. |
| `price` | Number | ✅ | Current price in INR |
| `rating` | Number | ✅ | Platform rating (0-5) |
| `brand` | String | ✅ | Brand name (Apple, Samsung, etc.) |
| `offer` | String | ⚠️ | Any active offer/discount |
| `link` | String | ✅ | Product URL |
| `image` | String | ⚠️ | Product image URL |
| `predictedPrice` | Number | ✅ | ML predicted price (from XGBoost) |
| `createdAt` | Date | ✅ | Timestamp of data fetch |
| `updatedAt` | Date | ✅ | Last update timestamp |

---

### Collection: `price_history`

**Purpose**: Time-series price tracking for ML model training

**Sample Document**:
```json
{
  "_id": ObjectId("..."),
  "productKey": "iphone 13",
  "productName": "Apple iPhone 13",
  "platform": "Amazon",
  "price": 129999,
  "createdAt": ISODate("2026-03-22T10:30:00Z")
}
```

**Field Details**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | ObjectId | Auto | MongoDB ID |
| `productKey` | String | ✅ | **CRITICAL**: Model identifier (matches ML query in data_loader.py) |
| `productName` | String | ✅ | Product name (for reference) |
| `platform` | String | ✅ | Where price was fetched from |
| `price` | Number | ✅ | Historical price in INR |
| `createdAt` | Date | ✅ | Exact timestamp of price |

---

### Indexes (Required for Performance)

```javascript
// For ML data loading (CRITICAL)
db.price_history.createIndex({ "productKey": 1, "createdAt": -1 });

// For faster queries
db.price_history.createIndex({ "createdAt": -1 });
db.products.createIndex({ "productKey": 1 });
db.products.createIndex({ "normalizedName": 1 });
```

---

## Data Flow & Issues

### ⚠️ Critical Issues to Avoid

**Issue #1: productKey Mismatch**
```
Scraper saves: "iphone 13 128gb"
ML queries: "iphone 13" 
Result: NO RECORDS FOUND ❌
```
**Solution**: Remove storage variants from productKey (FIX #6)

**Issue #2: Missing productKey Field**
```
Old documents: { productName: "...", price: 999, createdAt: ... }
                (no productKey field)
ML query: db.find({"productKey": "iphone 13"})
Result: ZERO RECORDS ❌
```
**Solution**: Ensure all scrapers include productKey (FIX #4)

**Issue #3: Insufficient Data**
```
New product: 1-2 price records
After cleaning: 0 records (fails IQR filter)
ML prediction: "Not enough data" ❌
```
**Solution**: Accumulate 5+ historical records before prediction (requires time or seeding)

---

## Testing Checklist

- [ ] `db.price_history.findOne({ "productKey": "iphone 13" })` ← Should have 5+ records
- [ ] All records have `productKey` field (not null/missing)
- [ ] `product Key` values are consistent ("iphone 13", not "iphone 13 128gb")
- [ ] `createdAt` is properly formatted as Date (not String)
- [ ] Indexes exist: `db.price_history.getIndexes()`

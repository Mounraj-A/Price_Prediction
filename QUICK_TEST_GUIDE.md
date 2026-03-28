# ⚡ Quick Test Guide - Flipkart Product Fix

## 🚀 Quick Start: Verify the Fix in 5 Minutes

### Step 1: Restart Your Python Service
```bash
# Kill the running AI service (if any)
# Then restart
python app.py

# Or if using FastAPI:
uvicorn api.search_api:app --reload
```
🧪 1. Swagger UI (MOST IMPORTANT)

👉 Open this in browser:

http://localhost:8000/docs
✅ You MUST see:
/api/search
/api/predict


### Step 2: Make a Test API Call
Open your browser or use curl/Postman:

```
GET http://localhost:8000/search?product=iPhone%2015%20Pro
```

### Step 3: Look for These Log Lines
In your terminal, you should see:

```
[DEBUG] Amazon: 10 | Flipkart: 8 | Google: 12 | eBay: 5 | Walmart: 6
[DEBUG-FK] Raw API response has 8 items for query: 'iPhone 15 Pro'
[DEBUG-FK] ✓ Added: Apple iPhone 15 Pro (128GB, Black)...
[DEBUG-FK] ✓ Added: Apple iPhone 15 Pro (128GB, White)...
[DEBUG-FK] Flipkart products fetched: 8 valid items
[DEBUG] After keyword filter: 41 total | Flipkart: 8
[DEBUG] After price filter: 41 total | Flipkart: 8
[DEBUG] After product matching: 15 total | Flipkart: 3
[DEBUG] After duplicate removal: 15 total | Flipkart: 3
```

✅ **If you see these logs with Flipkart count > 0, the fix is working!**

### Step 4: Check Frontend
1. Go to React frontend: `http://localhost:5173` (or your port)
2. Search for "iPhone 15 Pro"
3. Look for Flipkart products with 🛒 badge
4. Click filter sidebar - you should see "Flipkart" checkbox

✅ **If Flipkart products appear, the fix is complete!**

---

## 🧪 Test Cases

### Test 1: Popular Electronics
```
Search: "iPhone 15 Pro"
Expected: 5-8 Flipkart products
Flip Products should have:
  ✅ Title with "iPhone 15 Pro"
  ✅ Price in ₹ (INR)
  ✅ Flipkart badge (🛒)
  ✅ Discount percentage (e.g., "7% off")
  ✅ Rating (e.g., 4.5 stars)
```

### Test 2: Budget Phone
```
Search: "Redmi Note 13"
Expected: 4-6 Flipkart products
Note: Flipkart often has competitive prices on budget phones
```

### Test 3: Accessories
```
Search: "AirPods Pro"
Expected: 3-5 Flipkart products
Check: Prices should be similar across platforms
```

### Test 4: Laptops
```
Search: "MacBook Air M3"
Expected: 2-4 Flipkart products
Check: Flipkart price often the lowest
```

---

## 🔴 If It's NOT Working

### Check 1: Is Flipkart count 0?
```
[DEBUG] Amazon: 10 | Flipkart: 0 | Google: 12 | eBay: 5 | Walmart: 6
```

**Solution:**
- Open `api/search_api.py`
- Look for line: `flipkart_products = fetch_flipkart_products(search_keyword) or []`
- Make sure it exists (around line 70-75)
- Import should be: `from scrapers.flipkart_api import fetch_flipkart_products`

### Check 2: Are prices being rejected?
```
[DEBUG-FK] Skipping item "iPhone..." - invalid price: ₹64,900
```

**Solution:**
- Check Flipkart API response format
- Verify `convert_price_to_inr()` handles ₹ symbol correctly
- Test the converter:
  ```python
  from utils.currency_converter import convert_price_to_inr
  price = convert_price_to_inr("₹64,900", source="flipkart")
  print(price)  # Should print 64900.0, not 0
  ```

### Check 3: Are products filtered out later?
```
[DEBUG] After keyword filter: 41 total | Flipkart: 0
```

**Solution:**
- The search keyword doesn't match Flipkart product titles
- Try searching for just the brand: "iPhone" or "Samsung"
- Avoid overly specific queries: "iPhone 15 Pro 128GB Black" might be too specific

---

## 📊 What Success Looks Like

### Terminal Output (Backend)
```
[DEBUG] Amazon: 9 | Flipkart: 8 | Google: 11 | eBay: 6 | Walmart: 7
[DEBUG-FK] Raw API response has 8 items for query: 'iphone 15 pro'
[DEBUG-FK] ✓ Added: Apple iPhone 15 Pro (128 GB, Black)... | Price: ₹79999 | Rating: 4.5
[DEBUG-FK] ✓ Added: Apple iPhone 15 Pro (128 GB, White)... | Price: ₹79999 | Rating: 4.3
[DEBUG-FK] ✓ Added: Apple iPhone 15 Pro (256 GB, Black)... | Price: ₹89999 | Rating: 4.5
[DEBUG-FK] ✓ Added: Apple iPhone 15 Pro (256 GB, Blue)... | Price: ₹89999 | Rating: 4.4
[DEBUG-FK] ✓ Added: Apple iPhone 15 Pro (512 GB, Black)... | Price: ₹109999 | Rating: 4.6
[DEBUG-FK] Flipkart products fetched: 8 valid items
[DEBUG] After keyword filter: 41 total | Flipkart: 8
[DEBUG] After price filter: 41 total | Flipkart: 8
[DEBUG] After product matching: 13 total | Flipkart: 2
[DEBUG] After duplicate removal: 13 total | Flipkart: 2
Search completed for 'iphone 15 pro' in 4.23 seconds
```

### Frontend UI
```
[Products Grid]
iPhone 15 Pro Results (13 products shown):

Row 1:
┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐
│ [Image]             │  │ [Image]             │  │ [Image]             │
│ 🛒 Flipkart         │  │ 📦 Amazon           │  │ 🔖 eBay             │
│ iPhone 15 Pro 128GB │  │ iPhone 15 Pro 128GB │  │ iPhone 15 Pro       │
│ ₹79,999             │  │ ₹84,990             │  │ $959 = ₹79,737      │
│ ⭐⭐⭐⭐⭐ 4.5★   │  │ ⭐⭐⭐⭐⭐ 4.6★   │  │ No Rating           │
│ [View Deal]         │  │ [View Deal]         │  │ [View Deal]         │
└─────────────────────┘  └─────────────────────┘  └─────────────────────┘

Filters:
☑️ Flipkart (2)
☑️ Amazon (4)
☑️ eBay (3)
☑️ Walmart (2)
☑️ Google Shopping (2)
```

---

## 🎯 Summary

| Aspect | Before | After |
|--------|--------|-------|
| Flipkart API Called | ❌ No | ✅ Yes |
| Flipkart in Results | ❌ No | ✅ Yes |
| Flipkart Filter Available | ❌ No | ✅ Yes |
| Debug Logging | ❌ Minimal | ✅ Detailed |
| Currency Handling | ⚠️ Basic | ✅ Enhanced |

---

## 📞 Still Having Issues?

Refer to the full debugging guide: **`FLIPKART_DEBUG_GUIDE.md`**

It includes:
- Complete root cause analysis
- Step-by-step debugging levels
- Troubleshooting checklist
- Pipeline flow diagrams

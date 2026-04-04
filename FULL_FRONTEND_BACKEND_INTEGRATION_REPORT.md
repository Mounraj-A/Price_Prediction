# OmniPrice — Full Frontend ↔ Backend Integration Report (End-to-End)

This report documents how the system works **end-to-end**:

- **Frontend (React/Vite)**: http://localhost:5173
- **Backend (Spring Boot)**: http://localhost:8080
- **AI Service (FastAPI)**: http://127.0.0.1:8000
- **Database (MongoDB)**: mongodb://localhost:27017 / database: `omni_price_db`

It includes:
- The complete request/response contract used by the frontend
- The internal Spring Boot → FastAPI calls (and what the AI service returns)
- MongoDB collections used, and what gets written when

---

## 1) High-level architecture

### Runtime graph

1. The user interacts with the **React** UI.
2. React calls **Spring Boot** APIs (JWT in `Authorization: Bearer ...`).
3. For product search and prediction, **Spring Boot calls FastAPI**.
4. Spring Boot persists products + price history in **MongoDB**.
5. FastAPI reads from **MongoDB** (`price_history`) to compute ML predictions.
6. A Spring scheduled job periodically checks **saved products** and **alerts** and creates **notifications** (and optionally sends email).

### Ports and responsibilities

- React (Vite dev server): renders UI; uses `frontend/src/services/api.js`.
- Spring Boot: authentication/JWT, Mongo persistence, orchestration, scheduled monitoring.
- FastAPI: scraping (Amazon/Flipkart), ML prediction (XGBoost), deal/trend/notification payload.
- MongoDB: storage for users, products, price history, saved products, alerts, notifications.

---

## 2) Spring Boot backend (HTTP API)

### Endpoint summary (Spring Boot)

- Auth
  - `POST /api/auth/register`
  - `POST /api/auth/verify-otp`
  - `POST /api/auth/resend-otp`
  - `POST /api/auth/login`
  - `GET /api/auth/validate` (requires JWT)
- Products
  - `GET /api/products/search` (public)
  - `GET /api/products/predict` (public)
  - `GET /api/products/price-history` (public)
  - `GET /api/products/health` (public)
- Saved products (requires JWT)
  - `GET /api/saved`
  - `POST /api/saved`
  - `DELETE /api/saved/remove`
  - `DELETE /api/saved/clear`
- Alerts (requires JWT)
  - `POST /api/alerts`
  - `GET /api/alerts`
  - `PUT /api/alerts/{id}`
  - `DELETE /api/alerts/{id}`
- Notifications (requires JWT)
  - `GET /api/notifications`
  - `GET /api/notifications/unread`
  - `POST /api/notifications/read/{id}`

### Base config

- Application name and port: `server.port=8080`
- JWT secret + expiry: `jwt.secret`, `jwt.expiration`
- FastAPI endpoints used by Spring:
  - `python.ai.service.url=http://127.0.0.1:8000/api/search`
  - `python.ai.predict.url=http://127.0.0.1:8000/api/predict`

### CORS

CORS is configured for the React dev origin:
- Allowed origin: `http://localhost:5173`
- Allowed methods: GET/POST/PUT/DELETE/OPTIONS
- Allowed headers: `*`

Note: `CorsConfig` sets `allowCredentials(false)` (JWT is sent in headers, not cookies).

### Security model (JWT)

- Public endpoints:
  - `POST /api/auth/*`
  - `GET /api/products/search`
  - `GET /api/products/predict`
  - `GET /api/products/price-history`
  - `GET /api/products/health`
- Protected endpoints:
  - `GET/POST/DELETE /api/saved/*`
  - `GET/POST/... /api/alerts/*`
  - `GET/POST/... /api/notifications/*`

JWT is accepted via:

- Request header: `Authorization: Bearer <token>`

Spring extracts the **email** from the JWT subject and sets it as the authenticated principal.

### Error response shape (401)

For protected endpoints, unauthenticated calls return HTTP `401` with a JSON payload like:

```json
{
  "status": 401,
  "message": "Unauthorized: Full authentication is required to access this resource",
  "timestamp": "2026-04-04T10:55:00",
  "path": "/api/alerts"
}
```

---

## 3) Frontend → Spring Boot requests (the real calls)

All frontend API definitions are in `frontend/src/services/api.js`.

### 3.1 Auth APIs

#### Register (OTP-first)

Request:

- `POST http://localhost:8080/api/auth/register`
- Body:

```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "secret123",
  "fullName": "John Doe"
}
```

Response (typical; OTP is sent, token often absent until login):

```json
{
  "token": null,
  "username": "john_doe",
  "email": "john@example.com",
  "fullName": "John Doe",
  "avatar": null,
  "createdAt": "2026-04-04T10:20:00",
  "emailVerified": false,
  "message": "OTP sent to email"
}
```

Frontend flow:
- React redirects to the OTP screen.

#### Verify OTP

Request:

- `POST http://localhost:8080/api/auth/verify-otp`

```json
{
  "email": "john@example.com",
  "otp": "123456"
}
```

Response:

```json
{
  "email": "john@example.com",
  "emailVerified": true,
  "message": "Email verified successfully"
}
```

#### Login

Request:

- `POST http://localhost:8080/api/auth/login`

```json
{
  "email": "john@example.com",
  "password": "secret123"
}
```

Response (JWT issued):

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "username": "john_doe",
  "email": "john@example.com",
  "fullName": "John Doe",
  "avatar": null,
  "createdAt": "2026-04-04T10:20:00",
  "emailVerified": true
}
```

Frontend stores:
- `localStorage.omni_token = token`
- `localStorage.omni_user = {username,email,fullName,avatar}`

#### Validate token

- `GET http://localhost:8080/api/auth/validate`
- Header: `Authorization: Bearer <token>`

Response:
- `200 OK` (no JSON body is required by the current implementation)

---

### 3.2 Product search (main homepage)

Request:

- `GET http://localhost:8080/api/products/search?product=<query>`

Example:

`GET /api/products/search?product=iPhone%2015%20Pro`

Response:

```json
{
  "products": [
    {
      "id": "...",
      "productName": "Apple iPhone 15 Pro (128GB)",
      "normalizedName": "apple iphone 15 pro 128gb",
      "platform": "amazon",
      "price": 129999.0,
      "rating": 4.6,
      "brand": "Apple",
      "offer": "...",
      "link": "https://...",
      "image": "https://...",
      "predictedPrice": 126500.0,
      "productKey": "apple_iphone_15_pro_128gb"
    }
  ],
  "prediction": {
    "currentPrice": 129999.0,
    "predictedPrice": 126500.0,
    "trend": "falling",
    "deal": { "label": "WAIT" },
    "notifications": { "message": "..." },
    "productKey": "apple_iphone_15_pro_128gb",
    "cacheHit": false
  }
}
```

What the frontend does with this response:
- Renders the `products` grid/list.
- Shows `prediction` in the AI panel.
- If `prediction.notifications.message` exists, it pushes a **local UI notification**.

#### Health check

- `GET http://localhost:8080/api/products/health`

Response:

```text
OmniPrice Backend Running
```

---

### 3.3 Prediction refresh (AI panel / Saved items re-check)

Request:

- `GET http://localhost:8080/api/products/predict`

Frontend usually sends either:

- by selected listing key:
  - `?product_key=<productKey>`
- OR by listing title fallback:
  - `?product_name=<productName>`

Response is the FastAPI prediction payload (passed through by Spring):

```json
{
  "currentPrice": 129999.0,
  "predictedPrice": 126500.0,
  "trend": "falling",
  "deal": { "label": "WAIT" },
  "notifications": { "message": "..." },
  "productKey": "apple_iphone_15_pro_128gb",
  "cacheHit": true
}
```

---

### 3.4 Price history (chart)

Request:

- `GET http://localhost:8080/api/products/price-history`

Frontend sends `product_key` when a product is selected.

Response (Spring format):

```json
[
  { "price": 129999.0, "createdAt": "2026-04-01T12:01:00" },
  { "price": 127499.0, "createdAt": "2026-04-03T09:12:00" }
]
```

Note: FastAPI also has `GET /api/price-history` but the frontend currently uses Spring’s `/api/products/price-history`.

---

### 3.5 Saved products (wishlist)

All saved endpoints require JWT.

#### Sync saved items

- `GET http://localhost:8080/api/saved`

Response:

```json
[
  {
    "id": "...",
    "userId": "john@example.com",
    "productKey": "apple_iphone_15_pro_128gb",
    "productName": "Apple iPhone 15 Pro (128GB)",
    "platform": "amazon",
    "price": "129999",
    "image": "https://...",
    "link": "https://...",
    "savedAt": "2026-04-04T10:30:00.000+00:00"
  }
]
```

#### Save a product

- `POST http://localhost:8080/api/saved`
- Body is the product object the UI is displaying.

#### Remove a product

- `DELETE http://localhost:8080/api/saved/remove?productName=<exact>&platform=<exact>`

The frontend intentionally sends the **exact original casing** of `productName` for reliable deletion.

#### Clear all

- `DELETE http://localhost:8080/api/saved/clear`

---

### 3.6 Alerts (target price alerts)

All alert endpoints require JWT.

#### Create alert

- `POST http://localhost:8080/api/alerts`

```json
{
  "productKey": "apple_iphone_15_pro_128gb",
  "productName": "Apple iPhone 15 Pro (128GB)",
  "targetPrice": 110000
}
```

Response:

```json
{
  "id": "...",
  "productKey": "apple_iphone_15_pro_128gb",
  "targetPrice": 110000.0,
  "isActive": true,
  "message": "Alert created successfully"
}
```

#### List alerts

- `GET http://localhost:8080/api/alerts`

Response: list of `Alert` documents.

#### Update alert

- `PUT http://localhost:8080/api/alerts/{id}`

```json
{ "targetPrice": 105000 }
```

#### Delete alert

- `DELETE http://localhost:8080/api/alerts/{id}`

---

### 3.7 Notifications (server notifications)

All notification endpoints require JWT.

- `GET http://localhost:8080/api/notifications`
- `GET http://localhost:8080/api/notifications/unread`
- `POST http://localhost:8080/api/notifications/read/{id}`

Response item shape (Mongo `Notification` document):

```json
{
  "id": "...",
  "userId": "<mongoUserId>",
  "productKey": "apple_iphone_15_pro_128gb",
  "type": "PRICE_DROP",
  "message": "Price dropped for ...",
  "read": false,
  "createdAt": "2026-04-04T10:40:00"
}
```

The UI normalizes `type` to keys like `price_drop`, `target_price`, etc.

---

## 4) Spring Boot → FastAPI internal calls (what actually happens)

Spring’s `ProductService` orchestrates this.

### 4.1 Search orchestration behavior

`GET /api/products/search?product=<query>` does:

1. Normalize query (lowercase, remove punctuation)
2. Infer category
3. Search MongoDB `products` first using a flexible token query over `normalizedName`
4. If category is **mobiles/laptops** and DB results are below a threshold, call FastAPI scrape:

- `GET http://127.0.0.1:8000/api/search?product=<query>`

5. Convert FastAPI products into Spring `Product` objects and canonicalize `productKey`
6. Save **price history** for API results into `price_history`
7. Save new products into `products` (only if productKey+platform doesn’t already exist)
8. Group + rank results, pick the best group key for prediction
9. Call FastAPI prediction:

- `GET http://127.0.0.1:8000/api/predict?productKey=<canonicalKey>`

10. Attach the predicted price to each returned `Product` (as `predictedPrice`)

### 4.2 FastAPI endpoints used

FastAPI runs routers under `/api`:

- `GET /api/search?product=...`
  - Scrapes marketplaces (currently Amazon + Flipkart imported by default).
  - Adds `productKey` + `normalizedName` for each listing.
  - Returns `{ products: [...], prediction: {...} }`.

- `GET /api/predict?productKey=...` (or `product_key`, `product_name` fallback)
  - Loads `price_history` from MongoDB
  - Runs a lightweight time-series regression feature pipeline with XGBoost
  - Returns `{ currentPrice, predictedPrice, trend, deal, notifications, productKey, cacheHit }`

---

## 4.3 FastAPI health check

- `GET http://127.0.0.1:8000/health`

Response:

```json
{ "status": "AI service running" }
```

## 5) MongoDB collections used

Spring documents:

- `users`
- `products`
- `price_history`
- `saved_products`
- `alerts`
- `notifications`

FastAPI reads:

- `price_history`

Spring writes:

- `products` (when API scrape finds new listings)
- `price_history` (always when API scrape returns listings)
- `saved_products`
- `alerts`
- `notifications`

---

## 6) Scheduled monitoring (background notifications + optional email)

Spring’s scheduled job runs every `omni.notifications.monitor.interval-ms` (default 300000ms = 5 minutes) if enabled.

It does:

- For each document in `saved_products`:
  - Calls `productService.searchProduct(productName)`
  - If price dropped vs last known history → creates `PRICE_DROP` notification
  - Calls `productService.predictProduct(productKey, ...)`
  - If current price < predicted → creates `BEST_DEAL` notification
  - If trend contains rising/falling → creates `TREND` notification

- For each active alert in `alerts`:
  - Finds matching saved product to get platform/name (if available)
  - Calls `searchProduct(...)`
  - If `currentPrice <= targetPrice` → creates `TARGET_PRICE` notification

If `omni.notifications.email.enabled=true`, it can also email price-drop / target-price events.

---

## 7) Important integration notes / known pitfalls

### A) “userId” meaning is inconsistent between SavedProducts vs Alerts/Notifications

- Saved products are stored with `SavedProduct.userId = principal.getName()`.
- With the current JWT filter, `principal.getName()` is the **email**.

But alerts and notifications are stored with **Mongo user `_id`** (because those controllers map email → user id).

Impact:
- Scheduled notifications for saved products may be created under `userId=email`, but the notifications API reads notifications by `userId=<mongoId>`, so they may not show in the UI.

Recommended fix (design-level):
- Pick one identity strategy and use it everywhere (prefer Mongo user id), OR store both `userId` and `userEmail`.

### B) Secrets in repo config

`backend-springboot/src/main/resources/application.properties` contains a Gmail app password.

Recommended:
- Move it to environment variables or a secrets store and do not commit it.

### C) Mongo properties naming

The config uses `spring.mongodb.*`. Depending on your Spring Boot version and auto-config, it may need to be `spring.data.mongodb.*`.

If Mongo doesn’t connect at runtime, this is the first thing to verify.

---

## 8) How to run (dev)

1) MongoDB
- Ensure MongoDB is running locally on `27017` and the database `omni_price_db` is available.

2) FastAPI (AI service)
- In `ai-python-service/`:
  - Create/activate venv
  - Install requirements
  - Run:

`uvicorn app:app --reload --port 8000`

3) Spring Boot
- In `backend-springboot/`:

`./mvnw spring-boot:run`

4) Frontend
- In `frontend/`:

`npm install`

`npm run dev`

---

## 9) Quick end-to-end example trace (Search)

1) UI calls:
- `GET http://localhost:8080/api/products/search?product=iphone%2015%20pro`

2) Spring:
- Searches Mongo first (`products`)
- If low results and category eligible → calls FastAPI scrape

3) FastAPI:
- Scrapes Amazon/Flipkart
- Returns ranked listings + a prediction (Spring treats FastAPI scrape prediction as non-authoritative)

4) Spring:
- Saves `price_history` for returned listings
- Saves new listings into `products`
- Picks best `productKey` group
- Calls FastAPI prediction using `productKey`
- Returns merged products + `prediction` to the UI

---

If you want, I can also generate a “Postman / curl requests” appendix for every endpoint (with headers and sample payloads) matching this exact implementation.

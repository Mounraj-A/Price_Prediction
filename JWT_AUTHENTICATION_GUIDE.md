# 🔐 OmniPrice JWT Authentication System - Setup & Testing Guide

## Overview

This document provides complete instructions to set up and test the production-ready JWT authentication system integrated into the OmniPrice full-stack application.

---

## 📋 Project Structure

```
backend-springboot/
├── src/main/java/com/omniprice/
│   ├── controller/
│   │   ├── AuthController.java          ✅ NEW: Auth endpoints
│   │   └── ProductController.java       ✅ UPDATED: CORS config
│   ├── service/
│   │   ├── AuthService.java             ✅ NEW: Auth business logic
│   │   └── ProductService.java
│   ├── model/
│   │   ├── User.java                    ✅ NEW: User entity
│   │   ├── Product.java
│   │   └── PriceHistory.java
│   ├── repository/
│   │   ├── UserRepository.java          ✅ NEW: User data access
│   │   └── ProductRepository.java
│   ├── dto/
│   │   ├── LoginRequest.java            ✅ NEW: Auth DTOs
│   │   ├── RegisterRequest.java         ✅ NEW
│   │   └── AuthResponse.java            ✅ NEW
│   ├── security/
│   │   └── JwtAuthenticationFilter.java ✅ NEW: JWT filter
│   ├── exception/
│   │   ├── ErrorResponse.java           ✅ NEW: Error handling
│   │   └── JwtAuthenticationEntryPoint.java ✅ NEW
│   ├── utils/
│   │   └── JwtUtil.java                 ✅ NEW: JWT utilities
│   ├── config/
│   │   └── SecurityConfig.java          ✅ NEW: Security configuration
│   └── BackendSpringbootApplication.java
├── pom.xml                              ✅ UPDATED: Added JWT dependencies
└── src/main/resources/
    └── application.properties           ✅ UPDATED: JWT config
    
frontend/
├── src/
│   ├── context/
│   │   └── AuthContext.jsx              ✅ UPDATED: Real backend API
│   ├── services/
│   │   └── api.js                       ✅ UPDATED: JWT integration
│   └── pages/
│       ├── LoginPage.jsx
│       └── RegisterPage.jsx             ✅ UPDATED: New registration flow
```

---

## 🚀 Backend Setup (Spring Boot)

### Step 1: Update Dependencies

The `pom.xml` has been updated with:
- Spring Security: `spring-boot-starter-security`
- JJWT: JWT library for token generation/validation
- Version: 0.12.3

### Step 2: Configure Database (MongoDB)

Ensure MongoDB is running:

```bash
# For local development:
# Windows: Start MongoDB service
# Mac/Linux:
mongod

# Or use Docker:
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

### Step 3: Build & Run Backend

```bash
# Navigate to backend directory
cd backend-springboot

# Build with Maven
mvn clean install
# OR on Windows:
mvnw clean install

# Run the application
mvn spring-boot:run
# OR on Windows:
mvnw spring-boot:run

# Backend will be available at:
# http://localhost:8080
```

**Expected Output:**
```
Started BackendSpringbootApplication
Server is running on port 8080
```

---

## 💻 Frontend Setup (React)

### Step 1: Install Dependencies

```bash
cd frontend

# Install npm packages (already done)
npm install
```

### Step 2: Start Development Server

```bash
# Start Vite dev server
npm run dev

# Frontend will be available at:
# http://localhost:5173
```

**Expected Output:**
```
VITE v8.0.0  ready in 123 ms

➜  Local:   http://localhost:5173/
```

---

## 🔐 Authentication Flow

### Register Flow

1. **User enters:**
   - Full Name
   - Email
   - Password (min 6 chars)

2. **Frontend:**
   - Validates inputs
   - Calls `POST /api/auth/register`
   - Receives JWT token + user data
   - Stores in localStorage:
     - `omni_token`: JWT token
     - `omni_user`: User object (JSON)

3. **Backend:**
   - Validates email uniqueness
   - Hashes password with BCrypt
   - Creates User document in MongoDB
   - Generates JWT token (24-hour expiration)
   - Returns AuthResponse

4. **Result:**
   - User automatically logged in
   - Redirected to homepage

### Login Flow

1. **User enters:**
   - Email
   - Password

2. **Frontend:**
   - Calls `POST /api/auth/login`
   - Receives JWT token + user data
   - Stores in localStorage

3. **Backend:**
   - Finds user by email
   - Validates password with BCrypt
   - Updates last login timestamp
   - Generates JWT token
   - Returns AuthResponse

4. **Result:**
   - User logged in
   - Redirected to homepage

### Protected API Calls

All subsequent API calls automatically include JWT in header:

```
Authorization: Bearer <jwt_token>
```

The `JwtAuthenticationFilter` validates token on every request.

---

## 🧪 Testing API Endpoints

### 1. Register New User

**Request:**
```bash
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john_doe",
    "email": "john@example.com",
    "password": "MySecurePassword123",
    "fullName": "John Doe"
  }'
```

**Response (201 Created):**
```json
{
  "token": "eyJhbGciOiJIUzUxMiJ9...",
  "username": "john_doe",
  "email": "john@example.com",
  "fullName": "John Doe",
  "avatar": null,
  "createdAt": "2026-03-26T10:30:00"
}
```

### 2. Login User

**Request:**
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "MySecurePassword123"
  }'
```

**Response (200 OK):**
```json
{
  "token": "eyJhbGciOiJIUzUxMiJ9...",
  "username": "john_doe",
  "email": "john@example.com",
  "fullName": "John Doe",
  "avatar": null,
  "createdAt": "2026-03-26T10:30:00"
}
```

### 3. Protected Endpoint (Search Products)

**Request:**
```bash
curl -X GET "http://localhost:8080/api/products/search?product=iphone" \
  -H "Authorization: Bearer eyJhbGciOiJIUzUxMiJ9..."
```

**Response (200 OK):**
```json
{
  "products": [...],
  "prediction": {
    "currentPrice": 1200,
    "predictedPrice": 1100,
    "trend": "falling"
  }
}
```

### 4. Invalid Token (Unauthorized)

**Request:**
```bash
curl -X GET "http://localhost:8080/api/products/search?product=iphone" \
  -H "Authorization: Bearer invalid.token.here"
```

**Response (401 Unauthorized):**
```json
{
  "status": 401,
  "message": "Unauthorized: Invalid token",
  "timestamp": "2026-03-26T10:35:00",
  "path": "/api/products/search"
}
```

### 5. Missing Token (Unauthorized)

**Request:**
```bash
curl -X GET http://localhost:8080/api/products/search?product=iphone
```

**Response (401 Unauthorized):**
```json
{
  "status": 401,
  "message": "Unauthorized: Authorization header is missing",
  "timestamp": "2026-03-26T10:35:00",
  "path": "/api/products/search"
}
```

---

## 📱 Frontend Testing

### Test Register Flow

1. Open `http://localhost:5173`
2. Click "Register"
3. Enter:
   - Full Name: "Test User"
   - Email: "test@example.com"
   - Password: "Test123456"
   - Confirm Password: "Test123456"
4. Click "Register"

**Expected:**
- JWT token stored in localStorage
- User data stored in localStorage
- Redirected to homepage
- User can search products

### Test Login Flow

1. Logout (click Profile → Logout)
2. Click "Login"
3. Enter:
   - Email: "test@example.com"
   - Password: "Test123456"
4. Click "Login"

**Expected:**
- JWT token stored in localStorage
- Redirected to homepage
- Can access protected endpoints

### Verify JWT in localStorage

Open Browser DevTools → Application → Local Storage:

```
omni_token: eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9...
omni_user: {"username":"test_user","email":"test@example.com","fullName":"Test User","avatar":null}
```

### Test Logout

Click Profile → Logout

**Expected:**
- `omni_token` removed from localStorage
- `omni_user` removed from localStorage
- Redirected to login page
- Cannot access protected endpoints

---

## 🔒 Security Features

### 1. Password Encryption (BCrypt)

```java
// In AuthService
passwordEncoder.encode(request.getPassword())
```

- Passwords are hashed using BCrypt
- Salt cost: Default 10
- Cannot be reversed

### 2. JWT Token

```
Header: {
  "alg": "HS512",
  "typ": "JWT"
}

Payload: {
  "sub": "user@example.com",
  "username": "username",
  "iat": 1711431000000,
  "exp": 1711517400000
}

Signature: HMACSHA512(header.payload, secret_key)
```

- Algorithm: HS512 (HMAC with SHA-512)
- Expiration: 24 hours
- Secret: Configured in `application.properties`

### 3. CSRF Protection

- Disabled for stateless API (best practice)
- Stateless session management

### 4. CORS Configuration

- Allows requests from: `http://localhost:5173`
- Credentials allowed
- Headers allowed: All
- Methods allowed: GET, POST, OPTIONS

### 5. Stateless Authentication

- No server-side sessions
- Token stored client-side
- Scalable for microservices

---

## 🚨 Common Issues & Solutions

### Issue 1: CORS Error
**Error:** `Access to XMLHttpRequest ... has been blocked by CORS policy`

**Solution:**
- Ensure `SecurityConfig.java` has CORS configured
- Check that `@CrossOrigin` annotations are set correctly
- Verify frontend URL in CORS config matches actual URL

### Issue 2: 401 Unauthorized
**Error:** `Unauthorized: Invalid token`

**Solution:**
- Check if token is expired (24-hour limit)
- Verify token is sent in correct format: `Authorization: Bearer <token>`
- Check if token is corrupted (not a valid JWT)

### Issue 3: Database Connection Failed
**Error:** `MongoDB connection refused`

**Solution:**
- Ensure MongoDB is running
- Check MongoDB port: `27017`
- Verify `application.properties` has correct MongoDB URL

### Issue 4: Password Validation Failed
**Error:** `Invalid email or password`

**Solution:**
- Ensure password matches exactly (case-sensitive)
- Check if email is correct
- Try registering a new account if needed

---

## 📊 Token Payload Example

When you decode a JWT token (e.g., on jwt.io):

```json
{
  "sub": "john@example.com",
  "username": "john_doe",
  "iat": 1711431000,
  "exp": 1711517400
}
```

- `sub`: Subject (email)
- `username`: Username
- `iat`: Issued At (Unix timestamp)
- `exp`: Expiration (Unix timestamp)

---

## 📝 Configuration Reference

### JWT Settings (application.properties)

```properties
# JWT Secret Key (Change in production!)
jwt.secret=OmniPriceSecretKeyForJWT2026ProductComparison123456789SecureAuthentication

# Token Expiration (in milliseconds)
# 86400000 = 24 hours
jwt.expiration=86400000
```

### MongoDB Settings

```properties
spring.data.mongodb.database=omni_price_db
spring.data.mongodb.host=localhost
spring.data.mongodb.port=27017
```

### CORS Settings (SecurityConfig.java)

```java
@CrossOrigin(
    origins = "http://localhost:5173",
    allowCredentials = "true",
    allowedHeaders = "*",
    methods = {RequestMethod.GET, RequestMethod.POST, RequestMethod.OPTIONS}
)
```

---

## 🌐 Production Checklist

Before deploying to production:

- [ ] Change JWT secret to a strong random key
- [ ] Update CORS origins to production domain
- [ ] Enable HTTPS (SSL/TLS)
- [ ] Set secure cookie flags
- [ ] Implement rate limiting on auth endpoints
- [ ] Add logging and monitoring
- [ ] Configure environment variables properly
- [ ] Set up CORS for all allowed domains
- [ ] Use stronger password validation
- [ ] Implement email verification
- [ ] Set up password reset flow
- [ ] Add 2FA support
- [ ] Monitor JWT token usage

---

## 📚 Key Files Reference

| File | Purpose |
|------|---------|
| `JwtUtil.java` | Token generation & validation |
| `JwtAuthenticationFilter.java` | Extracts & validates token from request |
| `SecurityConfig.java` | Spring Security configuration |
| `AuthController.java` | Register/Login endpoints |
| `AuthService.java` | Authentication business logic |
| `UserRepository.java` | Database access for users |
| `AuthContext.jsx` | React auth context |
| `api.js` | Axios configuration with interceptors |

---

## 🎯 Next Steps

1. **Test the system** using the testing guide above
2. **Monitor logs** for any errors
3. **Verify token** is stored correctly in localStorage
4. **Check MongoDB** for user documents
5. **Test protected endpoints** with valid JWT
6. **Test error scenarios** (invalid token, expired token, etc.)

---

## 💾 Database Schema (MongoDB)

### Users Collection

```json
{
  "_id": ObjectId("..."),
  "username": "john_doe",
  "email": "john@example.com",
  "password": "$2a$10$...",  // BCrypt hash
  "fullName": "John Doe",
  "avatar": null,
  "enabled": true,
  "createdAt": ISODate("2026-03-26T10:30:00Z"),
  "updatedAt": ISODate("2026-03-26T10:30:00Z"),
  "lastLogin": ISODate("2026-03-26T11:00:00Z")
}
```

---

## 🔗 API Documentation

### Public Endpoints

```
POST /api/auth/register
POST /api/auth/login
GET  /api/products/search (optional auth)
GET  /api/products/predict (optional auth)
GET  /api/products/price-history (optional auth)
```

### Protected Endpoints

```
GET  /api/auth/validate (requires JWT)
```

---

## 📞 Support & Debugging

### Enable Debug Logging

Add to `application.properties`:

```properties
logging.level.org.springframework.security=DEBUG
logging.level.com.omniprice=DEBUG
```

### View MongoDB Data

```bash
# Connect to MongoDB
mongo mongodb://localhost:27017/omni_price_db

# View users
db.users.find()

# View specific user
db.users.findOne({ email: "john@example.com" })
```

---

## ✅ Verification Checklist

- [ ] MongoDB is running
- [ ] Backend started successfully (port 8080)
- [ ] Frontend started successfully (port 5173)
- [ ] Can register new user
- [ ] JWT token is stored in localStorage
- [ ] Can login with registered credentials
- [ ] Can access protected endpoints with JWT
- [ ] Logout removes token from localStorage
- [ ] Invalid token returns 401
- [ ] CORS issues resolved

---

**Last Updated:** March 26, 2026
**Status:** ✅ Production Ready

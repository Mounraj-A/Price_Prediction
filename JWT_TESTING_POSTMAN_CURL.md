# 🧪 JWT Authentication - Postman & cURL Testing Guide

## Quick Start: Import Postman Collection

Save this JSON as `OmniPrice-JWT-Auth.postman_collection.json` and import into Postman.

```json
{
  "info": {
    "name": "OmniPrice JWT Authentication",
    "description": "Complete JWT auth API testing",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Auth",
      "item": [
        {
          "name": "Register User",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"username\": \"testuser\",\n  \"email\": \"test@example.com\",\n  \"password\": \"Test123456\",\n  \"fullName\": \"Test User\"\n}"
            },
            "url": {
              "raw": "http://localhost:8080/api/auth/register",
              "protocol": "http",
              "host": ["localhost"],
              "port": "8080",
              "path": ["api", "auth", "register"]
            }
          }
        },
        {
          "name": "Login User",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"email\": \"test@example.com\",\n  \"password\": \"Test123456\"\n}"
            },
            "url": {
              "raw": "http://localhost:8080/api/auth/login",
              "protocol": "http",
              "host": ["localhost"],
              "port": "8080",
              "path": ["api", "auth", "login"]
            }
          }
        },
        {
          "name": "Validate Token",
          "request": {
            "method": "GET",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{jwt_token}}"
              }
            ],
            "url": {
              "raw": "http://localhost:8080/api/auth/validate",
              "protocol": "http",
              "host": ["localhost"],
              "port": "8080",
              "path": ["api", "auth", "validate"]
            }
          }
        }
      ]
    },
    {
      "name": "Protected APIs",
      "item": [
        {
          "name": "Search Products",
          "request": {
            "method": "GET",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{jwt_token}}"
              }
            ],
            "url": {
              "raw": "http://localhost:8080/api/products/search?product=iphone",
              "protocol": "http",
              "host": ["localhost"],
              "port": "8080",
              "path": ["api", "products", "search"],
              "query": [
                {
                  "key": "product",
                  "value": "iphone"
                }
              ]
            }
          }
        },
        {
          "name": "Get Predictions",
          "request": {
            "method": "GET",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{jwt_token}}"
              }
            ],
            "url": {
              "raw": "http://localhost:8080/api/products/predict?product=iphone",
              "protocol": "http",
              "host": ["localhost"],
              "port": "8080",
              "path": ["api", "products", "predict"],
              "query": [
                {
                  "key": "product",
                  "value": "iphone"
                }
              ]
            }
          }
        },
        {
          "name": "Get Price History",
          "request": {
            "method": "GET",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{jwt_token}}"
              }
            ],
            "url": {
              "raw": "http://localhost:8080/api/products/price-history?product=iphone",
              "protocol": "http",
              "host": ["localhost"],
              "port": "8080",
              "path": ["api", "products", "price-history"],
              "query": [
                {
                  "key": "product",
                  "value": "iphone"
                }
              ]
            }
          }
        }
      ]
    }
  ],
  "variable": [
    {
      "key": "jwt_token",
      "value": ""
    }
  ]
}
```

---

## cURL Testing Examples

### 1. Register New User

```bash
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john_doe",
    "email": "john@example.com",
    "password": "SecurePassword123",
    "fullName": "John Doe"
  }'
```

**Response (201):**
```json
{
  "token": "eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJqb2huQGV4YW1wbGUuY29tIiwidXNlcm5hbWUiOiJqb2huX2RvZSIsImlhdCI6MTcxMTQzMTAwMDAwMCwiZXhwIjoxNzExNTE3NDAwMDAwfQ.signature",
  "username": "john_doe",
  "email": "john@example.com",
  "fullName": "John Doe",
  "avatar": null,
  "createdAt": "2026-03-26T10:30:00"
}
```

### 2. Login User

```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePassword123"
  }'
```

**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9...",
  "username": "john_doe",
  "email": "john@example.com",
  "fullName": "John Doe",
  "avatar": null,
  "createdAt": "2026-03-26T10:30:00"
}
```

### 3. Save Token to Variable (Bash)

```bash
# Register and extract token
TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "Test123456",
    "fullName": "Test User"
  }' | jq -r '.token')

echo "Token: $TOKEN"
```

### 4. Use Token for Protected Request

```bash
# Using the token from above
curl -X GET "http://localhost:8080/api/products/search?product=iphone" \
  -H "Authorization: Bearer $TOKEN"
```

### 5. Test Invalid Token (Should Return 401)

```bash
curl -X GET "http://localhost:8080/api/products/search?product=iphone" \
  -H "Authorization: Bearer invalid.token.here"
```

**Response (401):**
```json
{
  "status": 401,
  "message": "Unauthorized: Invalid token",
  "timestamp": "2026-03-26T10:35:00",
  "path": "/api/products/search"
}
```

### 6. Test Missing Authorization (Should Return 401)

```bash
curl -X GET "http://localhost:8080/api/products/search?product=iphone"
```

### 7. Test Duplicate Email Registration

```bash
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "another_user",
    "email": "john@example.com",
    "password": "AnotherPassword123",
    "fullName": "Another User"
  }'
```

**Response (409):**
```json
{
  "status": 409,
  "message": "Email already registered",
  "timestamp": "2026-03-26T10:36:00",
  "path": "/api/auth/register"
}
```

### 8. Test Invalid Login Credentials

```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "nonexistent@example.com",
    "password": "WrongPassword"
  }'
```

**Response (401):**
```json
{
  "status": 401,
  "message": "Invalid email or password",
  "timestamp": "2026-03-26T10:37:00",
  "path": "/api/auth/login"
}
```

---

## Postman Workflow

### Step 1: Register User
1. Open "Register User" request
2. Click "Send"
3. Copy the `token` from response
4. Click "Tests" tab and add:
```javascript
pm.environment.set("jwt_token", pm.response.json().token);
```

### Step 2: Use Token Automatically
All subsequent requests will use `{{jwt_token}}` from environment variables.

### Step 3: Test Protected Endpoints
1. Open "Search Products" request
2. Token is automatically included
3. Click "Send"

---

## Authentication Flow Diagram

```
User                    Frontend                Backend                 MongoDB
  |                        |                       |                       |
  |-- Register ---------->  |                       |                       |
  |                        | POST /api/auth/register|                       |
  |                        |--------------------->|                       |
  |                        |                       | Check email uniqueness |
  |                        |                       |------- Query -------->|
  |                        |                       |<------ Result --------|
  |                        |                       | Hash password         |
  |                        |                       | Create User           |
  |                        |                       |---- Insert --------->|
  |                        |                       | Generate JWT          |
  |                        | <- AuthResponse ------|                       |
  |                        | Store token + user    |                       |
  |                        |                       |                       |
  |-- Search Products --->  | GET /api/products/search                    |
  |                        | + Authorization: Bearer <token>               |
  |                        |--------------------->|                       |
  |                        |                       | Extract token         |
  |                        |                       | Validate JWT          |
  |                        |                       | Set Security Context  |
  |                        |                       | Fetch from Python API |
  |                        | <- Products ----------|                       |
  |<-- Display results ---|                        |                       |
```

---

## Response Status Codes

| Code | Status | Description |
|------|--------|-------------|
| 200 | OK | Login successful |
| 201 | Created | Registration successful |
| 400 | Bad Request | Missing/invalid fields |
| 401 | Unauthorized | Invalid credentials/token |
| 409 | Conflict | Email/username already exists |
| 500 | Server Error | Internal error |

---

## Common Test Scenarios

### Scenario 1: Complete Flow
1. Register → Get token
2. Use token to search products
3. Logout (remove token)
4. Try to search (should fail with 401)

### Scenario 2: Token Expiration
1. Register and get token
2. Wait 24 hours (or modify JWT expiration for testing)
3. Try to use token
4. Should get 401 error

### Scenario 3: Invalid Data
1. Register with email that already exists
2. Should get 409 Conflict
3. Try to login with wrong password
4. Should get 401 Unauthorized

### Scenario 4: Race Condition
1. Register user with email A
2. Immediately try to register another user with same email A
3. Only one should succeed (or get 409)

---

## Token Inspection

Decode JWT at [jwt.io](https://jwt.io):

**Encoded:**
```
eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJqb2huQGV4YW1wbGUuY29tIiwidXNlcm5hbWUiOiJqb2huX2RvZSIsImlhdCI6MTcxMTQzMTAwMDAwMCwiZXhwIjoxNzExNTE3NDAwMDAwfQ.signature
```

**Decoded:**
```
Header: {
  "alg": "HS512",
  "typ": "JWT"
}

Payload: {
  "sub": "john@example.com",
  "username": "john_doe",
  "iat": 1711431000000,
  "exp": 1711517400000
}

Signature: HMACSHA512(header.payload, secret)
```

---

## JavaScript/Node.js Testing

### Using node-fetch

```javascript
// Register
const registerRes = await fetch('http://localhost:8080/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'testuser',
    email: 'test@example.com',
    password: 'Test123456',
    fullName: 'Test User'
  })
});

const { token } = await registerRes.json();
console.log('Token:', token);

// Use token for protected request
const searchRes = await fetch('http://localhost:8080/api/products/search?product=iphone', {
  method: 'GET',
  headers: { 'Authorization': `Bearer ${token}` }
});

const products = await searchRes.json();
console.log('Products:', products);
```

---

## Debugging Tips

### 1. Check Token Validity
```bash
# Use jwt.io to decode and verify signature
# Or use jq to parse:
curl -s http://localhost:8080/api/auth/login ... | jq -r '.token'
```

### 2. Monitor Backend Logs
```bash
# Enable debug logging in application.properties
logging.level.org.springframework.security=DEBUG
logging.level.com.omniprice=DEBUG
```

### 3. Verify Token in Storage
```javascript
// In browser console
localStorage.getItem('omni_token')
localStorage.getItem('omni_user')
```

### 4. Test Token Expiration
```javascript
// Decode token to check expiration
const token = localStorage.getItem('omni_token');
const payload = JSON.parse(atob(token.split('.')[1]));
console.log('Expires:', new Date(payload.exp * 1000));
```

---

**All tests are ready to run! Follow the examples above to test your JWT authentication system.**

# 🧪 OmniPrice Notification System - Complete Testing Guide

**Date:** 2026-03-31  
**Purpose:** Verify email notifications and alerts are working correctly  
**Status:** Production-Ready Testing

---

## 📋 Testing Overview

```
Test Levels:
├── 1. Email Configuration Test
├── 2. OTP Email Test (Registration)
├── 3. API Response Test
├── 4. Database Verification
├── 5. Email Inbox Verification
├── 6. Log Verification
└── 7. End-to-End Flow Test
```

---

## 🔧 Test 1: Email Configuration Test

### Check Application Properties

**File:** `backend-springboot/src/main/resources/application.properties`

```properties
✅ Check these settings:

spring.mail.host=smtp.gmail.com
spring.mail.port=587                        ← Port 587 (TLS)
spring.mail.username=mounraj9025@gmail.com  ← Gmail address
spring.mail.password=sebrirptdzrozzcf      ← 16-char App Password
spring.mail.properties.mail.smtp.auth=true
spring.mail.properties.mail.smtp.starttls.enable=true
omni.auth.otp.email.enabled=true           ← OTP emails enabled
omni.notifications.email.enabled=true      ← General emails enabled
```

### Verify Gmail Configuration

**Steps:**
1. Go to: https://myaccount.google.com/security
2. Check: 2-Factor Authentication is **ENABLED** ✅
3. Check: App Passwords available
4. Check: Password is **16 characters** (no spaces)
5. Check: Account not blocked due to suspicious login

**If Gmail is blocking:**
- Go to: https://accounts.google.com/signin/continue?sarp=1&scc=1
- Allow "Less secure apps" OR use App Password (recommended)

---

## 🧪 Test 2: OTP Email Test (Registration)

### Method A: Using Frontend

**Step 1: Register New User**
```
1. Open: http://localhost:5173/register
2. Fill Form:
   - Full Name: Test User
   - Email: testuser@example.com (or your email)
   - Username: testuser001
   - Password: Test@1234
   - Confirm: Test@1234
3. Click "Register"
4. Expected: Redirect to /verify-otp
```

**Step 2: Check Email Inbox**
```
1. Open Gmail inbox (mounraj9025@gmail.com)
2. Look for: "Email Verification OTP" from mounraj9025@gmail.com
3. Search term: "OTP is: " to find the OTP email
4. Extract 6-digit code
5. Expected arrival: 1-3 seconds after registration
```

**Step 3: Verify OTP**
```
5. On VerifyOtpPage, enter 6-digit OTP
6. Click "Verify"
7. Expected: Success message
8. Check Backend Logs:
   ✅ "OTP email sent to testuser@example.com"
```

### Method B: Using cURL

```bash
# Step 1: Register
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser001",
    "email": "testuser@example.com",
    "password": "Test@1234",
    "fullName": "Test User"
  }'

Response should be:
{
  "username": "testuser001",
  "email": "testuser@example.com",
  "emailVerified": false,
  "message": "OTP sent to email"
}
```

**Check Logs for:**
```
✅ "OTP email sent to testuser@example.com"
or
❌ "OTP email not sent: ..." (if failed)
```

---

## 📊 Test 3: API Response Test

### Test 3.1: Check API Returns Correct Response

```bash
# Register Test
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser123",
    "email": "test123@example.com",
    "password": "Test@1234",
    "fullName": "Test User"
  }' | jq .

Expected Response (201 Created):
{
  "username": "testuser123",
  "email": "test123@example.com",
  "fullName": "Test User",
  "createdAt": "2026-03-31T22:00:00",
  "emailVerified": false,
  "message": "OTP sent to email"
}
```

### Test 3.2: Verify OTP

```bash
curl -X POST http://localhost:8080/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test123@example.com",
    "otp": "123456"  # Replace with actual OTP from email
  }' | jq .

Expected Response (200 OK):
{
  "email": "test123@example.com",
  "emailVerified": true,
  "message": "Email verified successfully"
}
```

### Test 3.3: Resend OTP

```bash
curl -X POST http://localhost:8080/api/auth/resend-otp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test123@example.com"
  }' | jq .

Expected Response (200 OK):
{
  "email": "test123@example.com",
  "emailVerified": false,
  "message": "OTP sent to email"
}

Check Email: You should receive a NEW OTP
```

---

## 🗄️ Test 4: Database Verification

### Check MongoDB Collections

**Step 1: Connect to MongoDB**
```bash
# Using MongoDB Compass or mongosh
mongo mongodb://localhost:27017/omni_price_db
```

### Check Users Collection
```javascript
// Find the test user
db.users.findOne({ email: "testuser@example.com" })

Expected Output:
{
  "_id": ObjectId("..."),
  "username": "testuser001",
  "email": "testuser@example.com",
  "password": "$2a$10$...",  // BCrypt hash
  "fullName": "Test User",
  "enabled": true,
  "emailVerified": false,     // FALSE before OTP verification
  "otp": "123456",            // Current OTP
  "otpExpiry": ISODate("2026-03-31T22:05:00Z"),  // 5 min from now
  "createdAt": ISODate("2026-03-31T22:00:00Z"),
  "updatedAt": ISODate("2026-03-31T22:00:10Z")
}
```

### After OTP Verification
```javascript
db.users.findOne({ email: "testuser@example.com" })

Expected: 
- emailVerified: true       ← Should be TRUE
- otp: null                 ← Should be CLEARED
- otpExpiry: null           ← Should be CLEARED
- updatedAt: (recent time)  ← Should be updated
```

---

## 📧 Test 5: Email Inbox Verification

### Check Gmail Inbox

**Step 1: Open Gmail**
```
URL: https://mail.google.com
Account: mounraj9025@gmail.com
```

**Step 2: Look for OTP Emails**
```
Subject: "Email Verification OTP"
From: mounraj9025@gmail.com
Content: "Your OTP is: XXXXXX (valid for 5 minutes)"
Received Time: Should be < 5 seconds after registration
```

**Step 3: Check Email Details**
```
✅ Email arrived
✅ OTP is 6 digits
✅ Timestamp is recent
✅ Sender is correct (mounraj9025@gmail.com)
```

### Search Gmail for Test Emails
```
In Gmail search:
from:mounraj9025@gmail.com subject:"OTP"

This will show all OTP emails sent
```

### If Email Not Found
```
Check:
1. Spam folder
2. Promotions tab
3. Other tabs (Updates, Social, Forums)
4. Sender filter settings

If still missing:
1. Check browser console for errors
2. Check backend logs
3. Verify Gmail account not blocked
```

---

## 📝 Test 6: Log Verification

### Check Backend Logs in Real-time

**Step 1: Run Spring Boot with Logging**
```bash
cd backend-springboot
./mvnw spring-boot:run
```

**Step 2: Watch for Email Logs**

**During Registration:**
```
✅ SUCCESS LOGS:
2026-03-31T22:00:10.123+05:30  INFO 1234 --- [nio-8080-exec-1] c.o.s.EmailService : OTP email sent to testuser@example.com

❌ FAILURE LOGS:
2026-03-31T22:00:10.123+05:30  WARN 1234 --- [nio-8080-exec-1] c.o.s.EmailService : OTP email not sent: spring.mail.username is not configured (empty).
2026-03-31T22:00:10.123+05:30  WARN 1234 --- [nio-8080-exec-1] c.o.s.EmailService : OTP email send failed to testuser@example.com using SMTP user 'mounraj9025@gmail.com': Authentication failed
2026-03-31T22:00:10.123+05:30  WARN 1234 --- [nio-8080-exec-1] c.o.s.EmailService : Mail server connection failed. Failed messages: jakarta.mail.MessagingException: Could not connect to SMTP host: smtp.gmail.com
```

**Step 3: Enable Debug Logging**

**Add to application.properties:**
```properties
logging.level.com.omniprice.service.EmailService=DEBUG
logging.level.org.springframework.mail=DEBUG
```

**Then restart Spring Boot and check logs:**
```
2026-03-31T22:00:10.123+05:30  DEBUG 1234 --- [nio-8080-exec-1] o.s.m.javamail.JavaMailSenderImpl : Sending email to: testuser@example.com
2026-03-31T22:00:10.500+05:30  DEBUG 1234 --- [nio-8080-exec-1] o.s.m.javamail.JavaMailSenderImpl : Email sent successfully
```

---

## 🔍 Test 7: End-to-End Flow Test

### Complete Registration → OTP → Login Flow

**Step 1: Register**
```bash
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john_doe",
    "email": "john@example.com",
    "password": "Secure@1234",
    "fullName": "John Doe"
  }'

Expected Response:
{
  "message": "OTP sent to email"
}
```

**Step 2: Check Frontend**
```
Expected:
- Redirect to /verify-otp page
- Message: "OTP sent to john@example.com"
```

**Step 3: Check Email Inbox**
```
Expected:
- Receive: "Email Verification OTP" from mounraj9025@gmail.com
- Content: "Your OTP is: XXXXXX"
```

**Step 4: Verify OTP**
```bash
curl -X POST http://localhost:8080/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "otp": "123456"  # From email
  }'

Expected Response (200 OK):
{
  "emailVerified": true,
  "message": "Email verified successfully"
}
```

**Step 5: Login**
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "Secure@1234"
  }'

Expected Response (200 OK):
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "username": "john_doe",
  "email": "john@example.com",
  "emailVerified": true
}
```

**Step 6: Access Dashboard**
```bash
curl -X GET http://localhost:8080/api/dashboard/metrics \
  -H "Authorization: Bearer eyJhbGc..."

Expected: Dashboard metrics
```

---

## 🚀 Advanced Testing with Postman

### Import Postman Collection

**Create in Postman:**

```json
{
  "info": {
    "name": "OmniPrice Email Testing",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "1. Register User",
      "request": {
        "method": "POST",
        "header": [
          {"key": "Content-Type", "value": "application/json"}
        ],
        "url": {"raw": "http://localhost:8080/api/auth/register", "protocol": "http", "host": ["localhost"], "port": ["8080"], "path": ["api", "auth", "register"]},
        "body": {
          "mode": "raw",
          "raw": "{\n  \"username\": \"testuser\",\n  \"email\": \"testuser@example.com\",\n  \"password\": \"Test@1234\",\n  \"fullName\": \"Test User\"\n}"
        }
      }
    },
    {
      "name": "2. Verify OTP",
      "request": {
        "method": "POST",
        "header": [
          {"key": "Content-Type", "value": "application/json"}
        ],
        "url": {"raw": "http://localhost:8080/api/auth/verify-otp", "protocol": "http", "host": ["localhost"], "port": ["8080"], "path": ["api", "auth", "verify-otp"]},
        "body": {
          "mode": "raw",
          "raw": "{\n  \"email\": \"testuser@example.com\",\n  \"otp\": \"123456\"\n}"
        }
      }
    },
    {
      "name": "3. Resend OTP",
      "request": {
        "method": "POST",
        "header": [
          {"key": "Content-Type", "value": "application/json"}
        ],
        "url": {"raw": "http://localhost:8080/api/auth/resend-otp", "protocol": "http", "host": ["localhost"], "port": ["8080"], "path": ["api", "auth", "resend-otp"]},
        "body": {
          "mode": "raw",
          "raw": "{\n  \"email\": \"testuser@example.com\"\n}"
        }
      }
    },
    {
      "name": "4. Login",
      "request": {
        "method": "POST",
        "header": [
          {"key": "Content-Type", "value": "application/json"}
        ],
        "url": {"raw": "http://localhost:8080/api/auth/login", "protocol": "http", "host": ["localhost"], "port": ["8080"], "path": ["api", "auth", "login"]},
        "body": {
          "mode": "raw",
          "raw": "{\n  \"email\": \"testuser@example.com\",\n  \"password\": \"Test@1234\"\n}"
        }
      }
    }
  ]
}
```

---

## 🧪 Test 8: Error Scenario Testing

### Test Case 1: Invalid OTP
```bash
curl -X POST http://localhost:8080/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "otp": "999999"  # Wrong OTP
  }'

Expected Response (400 Bad Request):
{
  "status": 400,
  "message": "Invalid OTP"
}
```

### Test Case 2: Expired OTP
```bash
# Wait > 5 minutes after registration
curl -X POST http://localhost:8080/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "otp": "123456"  # Valid OTP but expired
  }'

Expected Response (400 Bad Request):
{
  "status": 400,
  "message": "OTP expired"
}
```

### Test Case 3: Duplicate Email
```bash
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "another_user",
    "email": "testuser@example.com",  # Already registered
    "password": "Test@1234",
    "fullName": "Another User"
  }'

Expected Response (409 Conflict):
{
  "status": 409,
  "message": "Email already registered"
}
```

### Test Case 4: Invalid Email Format
```bash
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "invalid-email",  # Missing @
    "password": "Test@1234",
    "fullName": "Test"
  }'

Expected Response (400 Bad Request):
{
  "status": 400,
  "message": "Invalid email format"
}
```

### Test Case 5: Login Before Verification
```bash
# Register but don't verify OTP
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "Test@1234"
  }'

Expected Response (403 Forbidden):
{
  "status": 403,
  "message": "Email not verified"
}
```

---

## 📊 Test Results Checklist

```
✅ EMAIL CONFIGURATION
- [ ] spring.mail.username is set
- [ ] spring.mail.password is 16 chars
- [ ] Port 587 (TLS) configured
- [ ] STARTTLS enabled

✅ OTP EMAIL SENDING
- [ ] OTP email received < 5 seconds
- [ ] OTP is 6 digits
- [ ] Email subject is correct
- [ ] Sender is mounraj9025@gmail.com

✅ API RESPONSES
- [ ] Register returns 201
- [ ] Verify OTP returns 200
- [ ] Resend OTP returns 200
- [ ] Login returns 200 with JWT token

✅ DATABASE
- [ ] User created in users collection
- [ ] OTP stored correctly
- [ ] OTP expiry set to +5 minutes
- [ ] emailVerified = false initially
- [ ] After OTP verification: emailVerified = true, otp = null

✅ FRONTEND
- [ ] Redirect to /verify-otp after registration
- [ ] OTP input accepts 6 digits
- [ ] Success message shown after verification
- [ ] Can login to dashboard after verification

✅ LOGS
- [ ] "OTP email sent to ..." log appears
- [ ] No error messages in logs
- [ ] Timestamp matches registration time

✅ END-TO-END
- [ ] Complete flow: Register → Email → Verify → Login → Dashboard
- [ ] All transitions work correctly
- [ ] Data persists in MongoDB
```

---

## 🔧 Troubleshooting & Debug Tips

### If Emails Not Sending

**Step 1: Check Configuration**
```bash
# Verify settings
grep "spring.mail" backend-springboot/src/main/resources/application.properties
```

**Step 2: Check Logs**
```bash
# Look for errors
grep "EmailService" startup-logs.txt
grep "Mail server" startup-logs.txt
```

**Step 3: Verify Gmail**
```
1. Go to https://myaccount.google.com/security
2. Confirm 2-FA is enabled
3. Generate new App Password
4. Update in application.properties
5. Restart Spring Boot
```

**Step 4: Test SMTP Connection**
```bash
# Send test email using telnet (optional)
telnet smtp.gmail.com 587

Expect: 220 response
Type: EHLO localhost
Type: QUIT
```

### If OTP Not Matching

**Check MongoDB:**
```javascript
db.users.findOne({ email: "testuser@example.com" })
// Note the OTP value
// Use exact value in verify request
```

**Common Issue:**
```
❌ Email shows: "Your OTP is: 123456"
❌ But you enter: 123456 (with spaces)
✅ Solution: Copy OTP exactly from email
```

### If Database Not Updating

**Check MongoDB Connection:**
```bash
# From application logs
grep "MongoDB" server-logs.txt

Should show:
"Monitor thread successfully connected to server"
```

---

## 📞 Quick Reference: Testing Commands

### Registration Test
```bash
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test001","email":"test@example.com","password":"Test@1234","fullName":"Test"}'
```

### Verify OTP Test
```bash
curl -X POST http://localhost:8080/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","otp":"123456"}'
```

### Resend OTP Test
```bash
curl -X POST http://localhost:8080/api/auth/resend-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

### Login Test
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test@1234"}'
```

---

## 📈 Performance Testing

### Load Test Scenario
```
Concurrent Registrations:
- 10 users simultaneously
- Monitor: Email delivery time
- Monitor: OTP generation time
- Monitor: Database insert time

Expected:
- Each OTP email: < 2 seconds
- Database insert: < 500ms
- API response: < 1 second
```

### Monitor Performance
```
In logs, look for:
- Response times
- Email send times
- Database query times

Example:
"OTP email sent in 1234ms"
"User created in database: 234ms"
```

---

## Summary

### 3-Step Quick Test
```
1️⃣ REGISTER
   Frontend: http://localhost:5173/register
   Or: curl POST /api/auth/register

2️⃣ CHECK EMAIL
   Gmail: https://mail.google.com
   Look for: "Email Verification OTP"

3️⃣ VERIFY OTP
   Frontend: http://localhost:5173/verify-otp
   Enter: 6-digit code from email
   Or: curl POST /api/auth/verify-otp

✅ If all 3 steps work → System is functioning correctly
```

### Success Indicators
```
✅ OTP email arrives in < 5 seconds
✅ Email contains 6-digit code
✅ OTP is valid for 5 minutes
✅ Can login after verification
✅ Dashboard loads with data
✅ No errors in logs
✅ MongoDB updated correctly
```

---

**Generated:** 2026-03-31  
**Test Status:** Ready for execution


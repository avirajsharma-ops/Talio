# Create User API Guide

## 📍 API Endpoint
```
POST /api/create-user
GET  /api/create-user?email={email}
```

---

## 🔧 POST - Create New User

### Request Body

#### Minimum Required Fields:
```json
{
  "email": "user@example.com"
}
```

#### Full Request Example:
```json
{
  "email": "john.doe@company.com",
  "password": "securePassword123",
  "role": "employee",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "9876543210",
  "department": "60d5ec49f1b2c8b1f8e4e1a1",
  "designation": "60d5ec49f1b2c8b1f8e4e1a2",
  "dateOfJoining": "2024-01-15",
  "employmentType": "full-time",
  "salary": {
    "basic": 50000,
    "hra": 10000,
    "allowances": 5000,
    "ctc": 65000
  },
  "profilePicture": "https://example.com/photo.jpg",
  "googleId": "google-oauth-id-12345"
}
```

### Field Descriptions:

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `email` | String | ✅ Yes | - | User's email address (unique) |
| `password` | String | ❌ No | Random | User's password (auto-generated if not provided) |
| `role` | String | ❌ No | `employee` | User role: `admin`, `hr`, `manager`, `employee` |
| `firstName` | String | ❌ No | `User` | First name |
| `lastName` | String | ❌ No | `""` | Last name |
| `phone` | String | ❌ No | `""` | Phone number |
| `department` | ObjectId | ❌ No | - | Department ID reference |
| `designation` | ObjectId | ❌ No | - | Designation ID reference |
| `dateOfJoining` | Date | ❌ No | Current date | Joining date |
| `employmentType` | String | ❌ No | `full-time` | `full-time`, `part-time`, `contract`, `intern` |
| `salary` | Object | ❌ No | - | Salary details |
| `profilePicture` | String | ❌ No | - | Profile picture URL |
| `googleId` | String | ❌ No | - | Google OAuth ID (for Google sign-in users) |

### Success Response (201):
```json
{
  "success": true,
  "message": "User created successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "60d5ec49f1b2c8b1f8e4e1a3",
    "email": "john.doe@company.com",
    "role": "employee",
    "employeeId": {
      "_id": "60d5ec49f1b2c8b1f8e4e1a4",
      "employeeCode": "EMP0001",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@company.com",
      "phone": "9876543210",
      "status": "active"
    }
  }
}
```

### Error Responses:

#### 400 - Missing Email:
```json
{
  "success": false,
  "message": "Email is required"
}
```

#### 400 - Duplicate User:
```json
{
  "success": false,
  "message": "User already exists with this email"
}
```

#### 500 - Server Error:
```json
{
  "success": false,
  "message": "Failed to create user",
  "error": "Error details..."
}
```

---

## 🔍 GET - Check if User Exists

### Request:
```
GET /api/create-user?email=user@example.com
```

### Success Response (200):
```json
{
  "success": true,
  "user": {
    "id": "60d5ec49f1b2c8b1f8e4e1a3",
    "email": "user@example.com",
    "role": "employee",
    "employeeId": {
      "_id": "60d5ec49f1b2c8b1f8e4e1a4",
      "employeeCode": "EMP0001",
      "firstName": "John",
      "lastName": "Doe"
    },
    "isActive": true,
    "lastLogin": "2024-01-15T10:30:00.000Z"
  }
}
```

### Error Response (404):
```json
{
  "success": false,
  "message": "User not found"
}
```

---

## 📝 Usage Examples

### Example 1: Create Basic User
```javascript
const response = await fetch('/api/create-user', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'newuser@company.com',
    password: 'password123',
    firstName: 'New',
    lastName: 'User',
  }),
})

const data = await response.json()
console.log(data.token) // JWT token
console.log(data.user)  // User details
```

### Example 2: Create Google OAuth User
```javascript
const response = await fetch('/api/create-user', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: googleUser.email,
    firstName: googleUser.given_name,
    lastName: googleUser.family_name,
    profilePicture: googleUser.picture,
    googleId: googleUser.id,
    // No password needed - auto-generated
  }),
})
```

### Example 3: Check if User Exists
```javascript
const email = 'user@example.com'
const response = await fetch(`/api/create-user?email=${encodeURIComponent(email)}`)
const data = await response.json()

if (data.success) {
  console.log('User exists:', data.user)
} else {
  console.log('User not found')
}
```

### Example 4: Create User with Full Details
```javascript
const response = await fetch('/api/create-user', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'manager@company.com',
    password: 'securePass123',
    role: 'manager',
    firstName: 'Jane',
    lastName: 'Smith',
    phone: '9876543210',
    employmentType: 'full-time',
    dateOfJoining: '2024-01-01',
    salary: {
      basic: 80000,
      hra: 20000,
      allowances: 10000,
      ctc: 110000,
    },
  }),
})
```

---

## 🧪 Testing

### Run Test Script:
```bash
node test-create-user.js
```

### Manual Testing with cURL:

#### Create User:
```bash
curl -X POST http://localhost:3000/api/create-user \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "firstName": "Test",
    "lastName": "User"
  }'
```

#### Check User:
```bash
curl http://localhost:3000/api/create-user?email=test@example.com
```

---

## 🔐 Security Notes

1. **Password Handling**: If no password is provided, a random secure password is auto-generated
2. **Email Validation**: Email must be unique across the system
3. **JWT Token**: A valid JWT token is returned upon successful user creation
4. **Default Role**: Users are created with `employee` role by default
5. **Employee Code**: Auto-generated in format `EMP0001`, `EMP0002`, etc.

---

## 🔗 Integration with Google OAuth

The Google OAuth callback (`/api/auth/google/callback`) uses this API internally to create new users when they sign in with Google for the first time.

**Flow:**
1. User clicks "Sign in with Google"
2. Google authenticates user
3. Callback receives Google user data
4. Checks if user exists
5. If not, calls `/api/create-user` to create new account
6. Returns JWT token and redirects to dashboard

---

## 📌 Notes

- Employee records are automatically created when a user is created
- The API is already whitelisted in middleware (no authentication required)
- Returns JWT token for immediate login after user creation
- Supports both traditional email/password and OAuth flows


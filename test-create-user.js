// Test script for Create User API
// Run with: node test-create-user.js

const API_URL = 'http://localhost:3000/api/create-user'

// Test 1: Create a basic user
async function testCreateBasicUser() {
  console.log('\n🧪 Test 1: Creating basic user...')
  
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: `test${Date.now()}@example.com`,
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
        phone: '1234567890',
      }),
    })

    const data = await response.json()
    
    if (response.ok) {
      console.log('✅ User created successfully!')
      console.log('User ID:', data.user.id)
      console.log('Email:', data.user.email)
      console.log('Role:', data.user.role)
      console.log('Token:', data.token.substring(0, 20) + '...')
    } else {
      console.log('❌ Failed to create user:', data.message)
    }
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

// Test 2: Create user with full details
async function testCreateFullUser() {
  console.log('\n🧪 Test 2: Creating user with full details...')
  
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: `fulluser${Date.now()}@example.com`,
        password: 'password123',
        role: 'employee',
        firstName: 'John',
        lastName: 'Doe',
        phone: '9876543210',
        employmentType: 'full-time',
        dateOfJoining: new Date().toISOString(),
        salary: {
          basic: 50000,
          hra: 10000,
          allowances: 5000,
          ctc: 65000,
        },
      }),
    })

    const data = await response.json()
    
    if (response.ok) {
      console.log('✅ User created successfully!')
      console.log('User ID:', data.user.id)
      console.log('Email:', data.user.email)
      console.log('Role:', data.user.role)
      console.log('Employee Code:', data.user.employeeId.employeeCode)
    } else {
      console.log('❌ Failed to create user:', data.message)
    }
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

// Test 3: Check if user exists
async function testGetUser(email) {
  console.log('\n🧪 Test 3: Checking if user exists...')
  
  try {
    const response = await fetch(`${API_URL}?email=${encodeURIComponent(email)}`)
    const data = await response.json()
    
    if (response.ok) {
      console.log('✅ User found!')
      console.log('Email:', data.user.email)
      console.log('Role:', data.user.role)
      console.log('Active:', data.user.isActive)
    } else {
      console.log('❌ User not found:', data.message)
    }
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

// Test 4: Try to create duplicate user
async function testDuplicateUser(email) {
  console.log('\n🧪 Test 4: Testing duplicate user creation...')
  
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email,
        password: 'password123',
        firstName: 'Duplicate',
        lastName: 'User',
      }),
    })

    const data = await response.json()
    
    if (response.ok) {
      console.log('❌ Should have failed but succeeded!')
    } else {
      console.log('✅ Correctly rejected duplicate user:', data.message)
    }
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

// Test 5: Create user without password (like Google OAuth)
async function testGoogleStyleUser() {
  console.log('\n🧪 Test 5: Creating Google OAuth style user...')
  
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: `google${Date.now()}@gmail.com`,
        firstName: 'Google',
        lastName: 'User',
        profilePicture: 'https://example.com/photo.jpg',
        googleId: 'google-id-12345',
      }),
    })

    const data = await response.json()
    
    if (response.ok) {
      console.log('✅ Google user created successfully!')
      console.log('User ID:', data.user.id)
      console.log('Email:', data.user.email)
    } else {
      console.log('❌ Failed to create Google user:', data.message)
    }
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting Create User API Tests...')
  console.log('API URL:', API_URL)
  
  await testCreateBasicUser()
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  await testCreateFullUser()
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  const testEmail = 'test@example.com'
  await testGetUser(testEmail)
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  await testDuplicateUser('admin@hrms.com') // Try with existing admin
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  await testGoogleStyleUser()
  
  console.log('\n✅ All tests completed!')
}

// Run tests
runAllTests().catch(console.error)


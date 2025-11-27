require('dotenv').config({ path: '.env' });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

async function createAdmin() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;

    // Hash the password
    const hashedPassword = await bcrypt.hash('Mansiavi@2001', 10);

    // Create admin user
    const adminUser = {
      name: 'Aviraj Sharma',
      email: 'avi2001raj@gmail.com',
      password: hashedPassword,
      role: 'god_admin',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection('users').insertOne(adminUser);
    console.log('✅ Admin account created successfully!');
    console.log('\nAccount Details:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Name:', adminUser.name);
    console.log('Email:', adminUser.email);
    console.log('Password: Mansiavi@2001');
    console.log('Role:', adminUser.role);
    console.log('Status:', adminUser.isActive ? 'Active' : 'Inactive');
    console.log('User ID:', result.insertedId);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

createAdmin();

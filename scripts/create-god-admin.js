/**
 * Create GOD Admin Account
 *
 * This script creates the supreme GOD admin account with unlimited access.
 *
 * GOD Admin Details:
 * - Email: avi2001raj@gmail.com
 * - Password: Mansiavi@2001
 * - Role: god_admin
 * - Access: UNLIMITED - Can access ALL data and perform ALL actions
 *
 * Run with: node --loader ts-node/esm scripts/create-god-admin.js
 * Or: node scripts/create-god-admin.js (if using CommonJS)
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Employee from '../models/Employee.js';

// Load environment variables
dotenv.config({ path: '.env.local' });

const GOD_ADMIN_DATA = {
  email: 'avi2001raj@gmail.com',
  password: 'Mansiavi@2001',
  role: 'god_admin',
  firstName: 'Avi',
  lastName: 'Raj',
  employeeCode: 'GOD001',
  phone: '+91-9999999999',
};

async function createGodAdmin() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Check if GOD admin already exists
    const existingUser = await User.findOne({ email: GOD_ADMIN_DATA.email });
    if (existingUser) {
      console.log('⚠️  GOD Admin user already exists!');
      console.log('📧 Email:', existingUser.email);
      console.log('👤 Role:', existingUser.role);
      
      // Update role to god_admin if it's not already
      if (existingUser.role !== 'god_admin') {
        console.log('🔄 Updating role to god_admin...');
        existingUser.role = 'god_admin';
        await existingUser.save();
        console.log('✅ Role updated to god_admin');
      }
      
      // Check employee record
      const existingEmployee = await Employee.findOne({ email: GOD_ADMIN_DATA.email });
      if (existingEmployee) {
        console.log('✅ Employee record exists');
        console.log('👤 Name:', `${existingEmployee.firstName} ${existingEmployee.lastName}`);
        console.log('🆔 Employee Code:', existingEmployee.employeeCode);
      } else {
        console.log('⚠️  Employee record not found, creating...');
        await createEmployeeRecord(existingUser._id);
      }
      
      console.log('\n✅ GOD Admin account is ready!');
      console.log('📧 Email:', GOD_ADMIN_DATA.email);
      console.log('🔑 Password:', GOD_ADMIN_DATA.password);
      console.log('👑 Role: god_admin (UNLIMITED ACCESS)');
      
      await mongoose.disconnect();
      return;
    }

    console.log('\n🔐 Creating GOD Admin account...');
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(GOD_ADMIN_DATA.password, salt);

    // Create user account
    const user = new User({
      email: GOD_ADMIN_DATA.email,
      password: hashedPassword,
      role: GOD_ADMIN_DATA.role,
      isActive: true,
      emailVerified: true,
    });

    await user.save();
    console.log('✅ User account created');

    // Create employee record
    await createEmployeeRecord(user._id);

    console.log('\n🎉 GOD Admin account created successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 Email:', GOD_ADMIN_DATA.email);
    console.log('🔑 Password:', GOD_ADMIN_DATA.password);
    console.log('👑 Role: god_admin');
    console.log('🔓 Access Level: UNLIMITED');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n✨ You can now login with these credentials');
    console.log('🤖 MAYA will give you FULL ACCESS to ALL data and actions');
    console.log('👁️  You can ask MAYA about ANY employee, ANY data, ANY resource');
    console.log('⚡ You can perform ANY action on the HRMS system');

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
    
  } catch (error) {
    console.error('❌ Error creating GOD Admin:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

async function createEmployeeRecord(userId) {
  const employee = new Employee({
    user: userId,
    firstName: GOD_ADMIN_DATA.firstName,
    lastName: GOD_ADMIN_DATA.lastName,
    email: GOD_ADMIN_DATA.email,
    phone: GOD_ADMIN_DATA.phone,
    employeeCode: GOD_ADMIN_DATA.employeeCode,
    dateOfJoining: new Date(),
    status: 'active',
    employmentType: 'full-time',
    // GOD admin doesn't need department or designation
    personalInfo: {
      dateOfBirth: new Date('2001-01-01'),
      gender: 'male',
    },
  });

  await employee.save();
  console.log('✅ Employee record created');
  console.log('🆔 Employee Code:', employee.employeeCode);
  console.log('👤 Name:', `${employee.firstName} ${employee.lastName}`);
}

// Run the script
createGodAdmin();


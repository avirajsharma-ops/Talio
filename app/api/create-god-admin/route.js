/**
 * Create GOD Admin Account API
 * 
 * This is a one-time setup endpoint to create the GOD admin account.
 * 
 * Usage: POST /api/create-god-admin
 * Body: { "secret": "create-god-admin-2024" }
 */

import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Employee from '@/models/Employee';
import bcrypt from 'bcryptjs';

const GOD_ADMIN_DATA = {
  email: 'avi2001raj@gmail.com',
  password: 'Mansiavi@2001',
  role: 'god_admin',
  firstName: 'Avi',
  lastName: 'Raj',
  employeeCode: 'GOD001',
  phone: '+91-9999999999',
};

export async function POST(request) {
  try {
    const body = await request.json();
    
    // Simple security check
    if (body.secret !== 'create-god-admin-2024') {
      return NextResponse.json(
        { error: 'Invalid secret' },
        { status: 403 }
      );
    }

    await connectDB();

    // Check if GOD admin already exists
    const existingUser = await User.findOne({ email: GOD_ADMIN_DATA.email });
    
    if (existingUser) {
      // Update role to god_admin if it's not already
      if (existingUser.role !== 'god_admin') {
        existingUser.role = 'god_admin';
        await existingUser.save();
        
        return NextResponse.json({
          success: true,
          message: 'GOD Admin role updated',
          user: {
            email: existingUser.email,
            role: existingUser.role,
          },
        });
      }
      
      return NextResponse.json({
        success: true,
        message: 'GOD Admin already exists',
        user: {
          email: existingUser.email,
          role: existingUser.role,
        },
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(GOD_ADMIN_DATA.password, salt);

    // Create user account
    const user = new User({
      email: GOD_ADMIN_DATA.email,
      password: hashedPassword,
      role: GOD_ADMIN_DATA.role,
      isActive: true,
    });

    await user.save();

    // Create employee record
    const employee = new Employee({
      user: user._id,
      firstName: GOD_ADMIN_DATA.firstName,
      lastName: GOD_ADMIN_DATA.lastName,
      email: GOD_ADMIN_DATA.email,
      phone: GOD_ADMIN_DATA.phone,
      employeeCode: GOD_ADMIN_DATA.employeeCode,
      dateOfJoining: new Date(),
      status: 'active',
      employmentType: 'full-time',
      personalInfo: {
        dateOfBirth: new Date('2001-01-01'),
        gender: 'male',
      },
    });

    await employee.save();

    // Update user with employee reference
    user.employeeId = employee._id;
    await user.save();

    return NextResponse.json({
      success: true,
      message: 'GOD Admin account created successfully!',
      user: {
        email: user.email,
        role: user.role,
        employeeCode: employee.employeeCode,
      },
      credentials: {
        email: GOD_ADMIN_DATA.email,
        password: GOD_ADMIN_DATA.password,
      },
      access: {
        level: 'UNLIMITED',
        description: 'Full access to ALL data and ALL actions',
        maya: 'MAYA will give you complete access to everything',
      },
    });

  } catch (error) {
    console.error('Error creating GOD Admin:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to create GOD Admin',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'GOD Admin Creation Endpoint',
    usage: 'POST /api/create-god-admin',
    body: {
      secret: 'create-god-admin-2024',
    },
    description: 'Creates the supreme GOD admin account with unlimited access',
  });
}


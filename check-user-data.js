const mongoose = require('mongoose');
require('dotenv').config({ path: '.env' });

const UserSchema = new mongoose.Schema({
  email: String,
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  role: String
}, { strict: false });

const EmployeeSchema = new mongoose.Schema({
  email: String,
  firstName: String,
  lastName: String
}, { strict: false });

const User = mongoose.models.User || mongoose.model('User', UserSchema);
const Employee = mongoose.models.Employee || mongoose.model('Employee', EmployeeSchema);

async function checkUser() {
  try {
    if (!process.env.MONGODB_URI) {
      console.error('MONGODB_URI is missing in .env.local');
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const email = 'avi2001raj@gmail.com';
    const user = await User.findOne({ email });

    if (!user) {
      console.log(`User with email ${email} not found.`);
    } else {
      console.log('User found:', JSON.stringify(user, null, 2));
      
      // FORCE UNLINK (Commented out for safety)
      /*
      console.log(`Forcing unlink for User ${user.email}...`);
      const result = await User.updateOne(
          { _id: user._id }, 
          { $unset: { employeeId: "" } }
      );
      console.log("Unlink result:", result);
      
      const updatedUser = await User.findById(user._id);
      console.log("Updated User:", updatedUser);
      */

      // Check Employee
      console.log("Checking Employee 'Aviraj Sharma'...");
      const employees = await Employee.find({ 
        $or: [
            { firstName: /Aviraj/i },
            { lastName: /Sharma/i }
        ]
      });
      console.log("Employees found:", JSON.stringify(employees, null, 2));

    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkUser();

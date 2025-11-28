import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import connectDB from '@/lib/mongodb';
import MayaChatHistory from '@/models/MayaChatHistory';
import { getUserAccessScope, getAccessibleEmployees, getFormattedCollectionData } from '@/lib/mayaDataAccess';

// Allow larger body sizes for screenshot uploads (up to 10MB)
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

// For App Router, use dynamic = 'force-dynamic' and maxDuration
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds for AI processing

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret-key');

/**
 * Fetch user's own data and accessible employee data for MAYA context
 */
async function getUserContextData(userId, userRole, employeeId, departmentId) {
  const contextData = {
    self: null,
    employees: [],
    attendance: [],
    leaves: [],
    tasks: [],
  };

  try {
    // Get Employee model
    const Employee = (await import('@/models/Employee')).default;
    const Attendance = (await import('@/models/Attendance')).default;
    const Leave = (await import('@/models/Leave')).default;
    const Task = (await import('@/models/Task')).default;
    const Department = (await import('@/models/Department')).default;

    // Get user's own employee data (everyone can see their own data)
    if (employeeId) {
      const selfData = await Employee.findById(employeeId)
        .populate('department', 'name')
        .populate('designation', 'title level')
        .populate('reportingManager', 'firstName lastName')
        .lean();
      
      if (selfData) {
        contextData.self = {
          name: `${selfData.firstName} ${selfData.lastName}`,
          email: selfData.email,
          phone: selfData.phone,
          employeeCode: selfData.employeeCode,
          department: selfData.department?.name || 'Not assigned',
          designation: selfData.designation?.title || 'Not assigned',
          designationLevel: selfData.designation?.level,
          reportingManager: selfData.reportingManager ? 
            `${selfData.reportingManager.firstName} ${selfData.reportingManager.lastName}` : 'None',
          dateOfJoining: selfData.dateOfJoining,
          dateOfBirth: selfData.dateOfBirth,
          gender: selfData.gender,
          maritalStatus: selfData.maritalStatus,
          employmentType: selfData.employmentType,
          status: selfData.status,
          address: selfData.address,
          skills: selfData.skills || [],
          emergencyContact: selfData.emergencyContact,
        };

        // Get user's own attendance (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const attendance = await Attendance.find({
          employee: employeeId,
          date: { $gte: thirtyDaysAgo }
        }).sort({ date: -1 }).limit(30).lean();
        contextData.attendance = attendance.map(a => ({
          date: a.date,
          checkIn: a.checkIn,
          checkOut: a.checkOut,
          status: a.status,
          workHours: a.workHours,
        }));

        // Get user's own leave requests
        const leaves = await Leave.find({ employee: employeeId })
          .populate('leaveType', 'name')
          .sort({ createdAt: -1 })
          .limit(20)
          .lean();
        contextData.leaves = leaves.map(l => ({
          type: l.leaveType?.name || 'Unknown',
          startDate: l.startDate,
          endDate: l.endDate,
          days: l.days,
          status: l.status,
          reason: l.reason,
        }));

        // Get user's tasks
        const tasks = await Task.find({
          $or: [
            { assignedTo: employeeId },
            { createdBy: employeeId },
          ]
        }).sort({ createdAt: -1 }).limit(20).lean();
        contextData.tasks = tasks.map(t => ({
          title: t.title,
          status: t.status,
          priority: t.priority,
          dueDate: t.dueDate,
          progress: t.progress,
        }));
      }
    }

    // For admin, HR, god_admin - get all employees
    // For department_head - get department employees
    // For manager - get team members
    if (['god_admin', 'admin', 'hr'].includes(userRole)) {
      const allEmployees = await Employee.find({ status: 'active' })
        .populate('department', 'name')
        .populate('designation', 'title')
        .select('firstName lastName email employeeCode department designation phone')
        .lean();
      contextData.employees = allEmployees.map(e => ({
        name: `${e.firstName} ${e.lastName}`,
        email: e.email,
        employeeCode: e.employeeCode,
        department: e.department?.name || 'N/A',
        designation: e.designation?.title || 'N/A',
        phone: e.phone,
      }));
    } else if (userRole === 'department_head' && departmentId) {
      const deptEmployees = await Employee.find({ 
        department: departmentId, 
        status: 'active' 
      })
        .populate('department', 'name')
        .populate('designation', 'title')
        .select('firstName lastName email employeeCode department designation phone')
        .lean();
      contextData.employees = deptEmployees.map(e => ({
        name: `${e.firstName} ${e.lastName}`,
        email: e.email,
        employeeCode: e.employeeCode,
        department: e.department?.name || 'N/A',
        designation: e.designation?.title || 'N/A',
        phone: e.phone,
      }));
    } else if (userRole === 'manager' && employeeId) {
      const teamMembers = await Employee.find({ 
        reportingManager: employeeId, 
        status: 'active' 
      })
        .populate('department', 'name')
        .populate('designation', 'title')
        .select('firstName lastName email employeeCode department designation phone')
        .lean();
      contextData.employees = teamMembers.map(e => ({
        name: `${e.firstName} ${e.lastName}`,
        email: e.email,
        employeeCode: e.employeeCode,
        department: e.department?.name || 'N/A',
        designation: e.designation?.title || 'N/A',
        phone: e.phone,
      }));
    }
  } catch (error) {
    console.error('Error fetching user context data:', error);
  }

  return contextData;
}

export async function POST(request) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    let decoded;
    try {
      const result = await jwtVerify(token, JWT_SECRET);
      decoded = result.payload;
    } catch (err) {
      return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
    }

    const userId = decoded.userId;
    const { message, screenCapture, screenshot, isScreenAnalysis } = await request.json();
    
    // Support both screenCapture and screenshot parameter names
    const imageData = screenCapture || screenshot;

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ success: false, error: 'Message is required' }, { status: 400 });
    }

    await connectDB();

    // Get user to retrieve employeeId
    const User = (await import('@/models/User')).default;
    const user = await User.findById(userId).select('employeeId name email');
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // Get Gemini API key
    const geminiApiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    
    console.log('🔑 Gemini API Key exists:', !!geminiApiKey);
    
    if (!geminiApiKey) {
      return NextResponse.json({ 
        success: false, 
        error: 'MAYA is not configured. Please contact your administrator.' 
      }, { status: 503 });
    }

    // Find or create employee record if missing
    let employeeId = user.employeeId;
    let employeeData = null;
    if (!employeeId) {
      const Employee = (await import('@/models/Employee')).default;
      let employee = await Employee.findOne({ userId });
      
      if (!employee) {
        // Parse name into firstName and lastName
        const nameParts = (user.name || 'User').split(' ');
        const firstName = nameParts[0] || 'User';
        const lastName = nameParts.slice(1).join(' ') || 'Employee';
        
        // Create a basic employee record for MAYA functionality
        employee = await Employee.create({
          userId,
          firstName,
          lastName,
          name: user.name || 'User',
          email: user.email,
          phone: user.phone || '0000000000',
          employeeCode: `EMP${Date.now()}`,
          joiningDate: new Date(),
          dateOfJoining: new Date(),
          status: 'active'
        });
        
        // Update user with employeeId
        user.employeeId = employee._id;
        await user.save();
      }
      employeeId = employee._id;
      employeeData = employee;
    } else {
      const Employee = (await import('@/models/Employee')).default;
      employeeData = await Employee.findById(employeeId).select('firstName lastName name employeeCode designation department');
    }

    // Create chat history entry with user and employee details
    const chatSession = await MayaChatHistory.create({
      userId,
      employeeId,
      employeeName: employeeData?.name || `${employeeData?.firstName || ''} ${employeeData?.lastName || ''}`.trim() || user.name || 'User',
      employeeCode: employeeData?.employeeCode || '',
      designation: employeeData?.designation || '',
      department: employeeData?.department || '',
      sessionId: `session_${Date.now()}_${userId}`,
      messages: [
        { role: 'user', content: message, timestamp: new Date() }
      ]
    });

    // Fetch user context data from database for MAYA
    const userRole = decoded.role || 'employee';
    const departmentId = employeeData?.department;
    const userContext = await getUserContextData(userId, userRole, employeeId, departmentId);

    // Use Gemini API only
    let assistantMessage = '';

    try {
      console.log('🤖 Using Gemini API...', imageData ? 'with screen capture' : '');

      // Use stable Gemini models that are currently available (from ListModels API)
      // For vision tasks, use models that support images
      const candidates = imageData ? [
        { version: 'v1beta', model: 'gemini-2.0-flash' },
        { version: 'v1beta', model: 'gemini-2.5-flash' },
        { version: 'v1beta', model: 'gemini-2.0-flash-lite' },
      ] : [
        { version: 'v1beta', model: 'gemini-2.0-flash' },
        { version: 'v1beta', model: 'gemini-2.5-flash' },
        { version: 'v1beta', model: 'gemini-2.0-flash-lite' },
        { version: 'v1beta', model: 'gemini-flash-latest' },
      ];

      // Build user data context string
      let userDataContext = '';
      
      if (userContext.self) {
        userDataContext += `\n\n=== CURRENT USER'S DATA (${userContext.self.name}) ===
• Name: ${userContext.self.name}
• Email: ${userContext.self.email}
• Phone: ${userContext.self.phone || 'N/A'}
• Employee Code: ${userContext.self.employeeCode || 'N/A'}
• Department: ${userContext.self.department}
• Designation: ${userContext.self.designation}
• Reporting Manager: ${userContext.self.reportingManager}
• Date of Joining: ${userContext.self.dateOfJoining ? new Date(userContext.self.dateOfJoining).toLocaleDateString() : 'N/A'}
• Employment Type: ${userContext.self.employmentType || 'N/A'}
• Status: ${userContext.self.status || 'Active'}
• Skills: ${userContext.self.skills?.join(', ') || 'N/A'}`;
      }

      if (userContext.attendance && userContext.attendance.length > 0) {
        userDataContext += `\n\n=== USER'S RECENT ATTENDANCE (Last ${userContext.attendance.length} days) ===`;
        userContext.attendance.slice(0, 10).forEach(a => {
          userDataContext += `\n• ${new Date(a.date).toLocaleDateString()}: ${a.status || 'N/A'} | Check-in: ${a.checkIn || 'N/A'} | Check-out: ${a.checkOut || 'N/A'} | Hours: ${a.workHours || 'N/A'}`;
        });
      }

      if (userContext.leaves && userContext.leaves.length > 0) {
        userDataContext += `\n\n=== USER'S LEAVE REQUESTS ===`;
        userContext.leaves.slice(0, 10).forEach(l => {
          userDataContext += `\n• ${l.type}: ${new Date(l.startDate).toLocaleDateString()} to ${new Date(l.endDate).toLocaleDateString()} (${l.days} days) - Status: ${l.status}`;
        });
      }

      if (userContext.tasks && userContext.tasks.length > 0) {
        userDataContext += `\n\n=== USER'S TASKS ===`;
        userContext.tasks.slice(0, 10).forEach(t => {
          userDataContext += `\n• ${t.title}: ${t.status} | Priority: ${t.priority || 'N/A'} | Progress: ${t.progress || 0}%`;
        });
      }

      // For admins/managers - add accessible employee data
      if (userContext.employees && userContext.employees.length > 0) {
        userDataContext += `\n\n=== ACCESSIBLE EMPLOYEES (${userContext.employees.length} total) ===`;
        userContext.employees.slice(0, 20).forEach(e => {
          userDataContext += `\n• ${e.name} (${e.employeeCode}): ${e.designation} in ${e.department} | ${e.email}`;
        });
        if (userContext.employees.length > 20) {
          userDataContext += `\n... and ${userContext.employees.length - 20} more employees`;
        }
      }

      // Build the prompt based on whether we have a screen capture
      const systemPrompt = `You are MAYA, a versatile and intelligent AI assistant integrated into the Talio HRMS platform. While you specialize in HR related tasks like attendance, leave management, payroll and workplace queries, you are also a capable personal office assistant.

CRITICAL RESPONSE FORMAT RULES:
- NEVER use asterisks, dashes, bullet points, numbered lists, or any special formatting symbols
- NEVER use markdown formatting like bold or italics
- Write in plain, natural conversational English only
- Keep responses short, warm and human like
- Respond as if you are speaking to a friend or colleague
- Use simple sentences and paragraphs
- Maximum 2 to 3 sentences for simple queries
- For longer responses, use short natural paragraphs without any formatting

What you can help with:
HR data access where you have direct access to the users data so provide it directly without asking questions. General knowledge and questions on any topic. Creative tasks like writing emails and brainstorming. Productivity and planning. Research and analysis. Communication and drafting messages. Problem solving. Learning and education. Screen analysis when shown screenshots.

Data access rules:
The users role is ${userRole.toUpperCase()}. When users ask about their own data provide it directly. Admins and HR can see all employee data. Department heads can see their departments data. Managers can see their reports data. Never ask unnecessary clarifying questions.

Your personality:
Be warm, helpful, and professional. You are like a smart friendly colleague. Keep responses concise and conversational. When you dont know something say so honestly.
${userDataContext}`;

      let payload;
      
      if (imageData) {
        // Vision request with image
        console.log('📸 Processing screen capture with Gemini Vision...');
        
        // Extract base64 data from data URL
        const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
        
        payload = {
          contents: [{
            parts: [
              {
                text: `${systemPrompt}

The user has shared their screen with you. Please analyze what you see and respond to their query.

User Query: ${message}`
              },
              {
                inline_data: {
                  mime_type: 'image/jpeg',
                  data: base64Data
                }
              }
            ]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1500,
          }
        };
      } else {
        // Text-only request
        payload = {
          contents: [{
            parts: [{
              text: `${systemPrompt}

User Query: ${message}`
            }]
          }],
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 1000,
          }
        };
      }

      let lastError = null;
      for (const { version, model } of candidates) {
        const url = `https://generativelanguage.googleapis.com/${version}/models/${model}:generateContent?key=${geminiApiKey}`;
        try {
          console.log(`➡️ Trying Gemini model: ${model} on ${version}`);
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });

          if (res.ok) {
            const data = await res.json();
            assistantMessage = data.candidates?.[0]?.content?.parts?.[0]?.text;
            console.log(`✅ Gemini response received via ${version}/${model}`);
            break;
          } else {
            const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
            console.warn('⚠️ Gemini API attempt failed:', { version, model, status: res.status, error: errorData });
            lastError = { status: res.status, error: errorData };
          }
        } catch (err) {
          console.warn('⚠️ Gemini API network/exception:', { version, model, error: err.message });
          lastError = { error: err.message };
        }
      }

      if (!assistantMessage) {
        console.error('❌ Gemini API failed for all candidates:', lastError);
        throw new Error('Gemini API failed');
      }
    } catch (error) {
      console.error('❌ Gemini error:', error.message);
      assistantMessage = 'I apologize, but I encountered an error connecting to AI services. Please try again later or contact your administrator.';
    }

    console.log(`💬 Gemini response:`, (assistantMessage || '').substring(0, 100) + '...');

    // Update chat history with assistant response
    chatSession.messages.push({
      role: 'assistant',
      content: assistantMessage,
      timestamp: new Date()
    });
    await chatSession.save();

    // Note: MayaMessage model is for relay messages between users, not chat history
    // Chat history is stored in MayaChatHistory model above

    return NextResponse.json({
      success: true,
      response: assistantMessage,
      sessionId: chatSession._id
    });

  } catch (error) {
    console.error('MAYA Chat Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to process your message. Please try again.',
      details: error.message
    }, { status: 500 });
  }
}

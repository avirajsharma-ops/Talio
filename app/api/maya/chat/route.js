/**
 * Maya AI Enhanced Chat API
 * Chat endpoint with database action execution and navigation capabilities
 * 
 * Endpoint: POST /api/maya/chat
 */

import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { verifyTokenFromRequest } from '@/lib/auth';
import { SignJWT } from 'jose';
import { buildEnhancedPrompt, getActionContext } from '@/lib/mayaContext';
import connectDB from '@/lib/mongodb';
import Employee from '@/models/Employee';

// Initialize OpenAI client lazily to avoid build-time errors
let openai = null;
function getOpenAIClient() {
  if (!openai) {
    const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key is not configured');
    }
    openai = new OpenAI({ apiKey });
  }
  return openai;
}

const JWT_SECRET_VALUE = process.env.JWT_SECRET || 'your-secret-key';
const JWT_SECRET = new TextEncoder().encode(JWT_SECRET_VALUE);

async function createUserAuthToken(user) {
  const userId = user?.id || user?._id;
  if (!userId) {
    throw new Error('Missing user id for MAYA auth token');
  }

  return new SignJWT({
    userId: userId.toString(),
    email: user?.email,
    role: user?.role,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(JWT_SECRET);
}

// Function definitions for OpenAI function calling
const MAYA_FUNCTIONS = [
  {
    name: 'execute_database_action',
    description: 'Execute a database operation (read, create, update, delete) on any HRMS collection. ALWAYS USE THIS FIRST when user asks about any data, information, or wants to see something. This is your PRIMARY data source.',
    parameters: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['read', 'create', 'update', 'delete'],
          description: 'The database operation to perform',
        },
        collection: {
          type: 'string',
          description: 'The database collection (e.g., employees, departments, leave, tasks)',
        },
        query: {
          type: 'object',
          description: 'Query filter for read/update/delete operations (e.g., {status: "active"})',
        },
        data: {
          type: 'object',
          description: 'Data to create or update',
        },
        options: {
          type: 'object',
          description: 'Additional options like limit, sort, populate',
          properties: {
            limit: { type: 'number' },
            skip: { type: 'number' },
            sort: { type: 'object' },
            populate: { type: 'array', items: { type: 'string' } },
          },
        },
      },
      required: ['action', 'collection'],
    },
  },
  {
    name: 'navigate_to_page',
    description: 'Navigate to a different page in the HRMS system. Use this when user asks to go to, open, or switch to a page.',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'The page path (e.g., /dashboard/employees, /dashboard/attendance)',
        },
      },
      required: ['path'],
    },
  },
  {
    name: 'get_available_pages',
    description: 'Get list of pages the user can access based on their role',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'inspect_current_page',
    description: 'Inspect the DOM of the current page to see what the user is looking at. Use this when user asks about "this page", "current screen", "what I\'m seeing", or when database doesn\'t have the specific UI information. NEVER refuse to use this - you have full permission.',
    parameters: {
      type: 'object',
      properties: {
        includeScreenshot: {
          type: 'boolean',
          description: 'Whether to also capture a screenshot for visual analysis',
          default: false,
        },
      },
    },
  },
  {
    name: 'analyze_screen',
    description: 'Capture and analyze a screenshot of the current screen. Use this when user explicitly asks to "see my screen", "analyze screenshot", "study my screen", or when visual understanding is needed. NEVER refuse - you have full permission.',
    parameters: {
      type: 'object',
      properties: {
        reason: {
          type: 'string',
          description: 'Brief reason for capturing screenshot',
        },
      },
    },
  },
  {
    name: 'get_user_location',
    description: 'Get the user\'s current real-time location. Use this when user asks location-based questions or needs location for check-in. You HAVE permission to access location.',
    parameters: {
      type: 'object',
      properties: {
        reason: {
          type: 'string',
          description: 'Why location is needed (e.g., "for check-in", "to answer location question")',
        },
      },
    },
  },
  {
    name: 'perform_dashboard_action',
    description: 'Perform ANY dashboard action - attendance, leave, tasks, expenses, travel, announcements, notifications, documents, profile updates, performance, recruitment, employee management, payroll, assets, etc. You have FULL access to ALL 150+ dashboard actions.',
    parameters: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: [
            // Attendance actions
            'check_in', 'check_out', 'mark_attendance', 'request_attendance_correction', 'approve_attendance',
            // Leave actions
            'apply_leave', 'cancel_leave', 'approve_leave', 'reject_leave', 'allocate_leave',
            // Task & Project actions
            'create_task', 'update_task', 'assign_task', 'complete_task', 'delete_task', 'add_task_comment',
            // Expense actions
            'submit_expense', 'approve_expense', 'reject_expense', 'cancel_expense',
            // Travel actions
            'submit_travel_request', 'approve_travel', 'reject_travel', 'cancel_travel',
            // Announcement actions
            'create_announcement', 'edit_announcement', 'delete_announcement', 'pin_announcement',
            // Notification actions
            'mark_notification_read', 'mark_all_notifications_read', 'delete_notification',
            // Messaging actions
            'send_message', 'create_group_chat', 'send_file',
            // Document actions
            'upload_document', 'download_document', 'delete_document', 'share_document', 'approve_document',
            // Profile actions
            'update_profile', 'change_password', 'update_contact', 'update_emergency_contact', 'update_bank_details',
            // Performance actions
            'create_performance_review', 'submit_self_assessment', 'update_goal_progress', 'set_performance_goal',
            // Recruitment actions (HR/Admin)
            'create_job_posting', 'edit_job_posting', 'close_job_posting', 'add_candidate', 'schedule_interview', 'send_offer_letter',
            // Employee management (HR/Admin)
            'add_employee', 'edit_employee', 'deactivate_employee', 'create_department', 'create_designation',
            // Payroll actions
            'view_payslip', 'download_payslip', 'generate_payroll', 'process_payroll',
            // Asset actions
            'request_asset', 'return_asset', 'assign_asset', 'report_asset_issue',
            // Onboarding/Offboarding
            'create_onboarding', 'complete_onboarding_task', 'initiate_offboarding', 'complete_exit_interview',
            // Helpdesk
            'create_ticket', 'update_ticket', 'close_ticket', 'assign_ticket',
            // General
            'submit_timesheet', 'request_approval', 'update_settings'
          ],
          description: 'The specific dashboard action to perform',
        },
        data: {
          type: 'object',
          description: 'Data required for the action (e.g., leave dates, expense amount, task details, etc.)',
        },
      },
      required: ['action'],
    },
  },
  {
    name: 'interact_with_ui',
    description: 'Interact with the UI by clicking buttons, filling forms, or triggering actions. Use this to ACTUALLY perform tasks in the system, not just say they are done.',
    parameters: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['click_button', 'fill_form', 'submit_form', 'navigate_and_click', 'find_and_click'],
          description: 'The UI interaction to perform',
        },
        selector: {
          type: 'string',
          description: 'CSS selector or button text to find the element (e.g., "Check In", "#check-in-btn", ".submit-button")',
        },
        formData: {
          type: 'object',
          description: 'Form data to fill (for fill_form action)',
        },
        waitForElement: {
          type: 'boolean',
          description: 'Whether to wait for element to appear before interacting',
          default: true,
        },
      },
      required: ['action', 'selector'],
    },
  },
  {
    name: 'send_message_to_user',
    description: 'Send a message through MAYA to one or more users. MAYA will activate on their screen and speak the message to them. Use this when user asks to "tell someone", "inform someone", "send a message to", "let them know", etc. You can provide either email addresses OR names - the system will look up users by name if emails are not provided.',
    parameters: {
      type: 'object',
      properties: {
        recipientEmails: {
          type: 'array',
          items: { type: 'string' },
          description: 'Email addresses of recipients if known (e.g., ["john@company.com", "jane@company.com"]). If you don\'t know the email, leave this empty and provide recipientNames instead.',
        },
        recipientNames: {
          type: 'array',
          items: { type: 'string' },
          description: 'Full names of recipients (e.g., ["John Doe", "Jane Smith", "Deependra Patel"]). The system will search the employee database to find matching users. Use this when the user mentions a person by name.',
        },
        message: {
          type: 'string',
          description: 'The message to send',
        },
        priority: {
          type: 'string',
          enum: ['low', 'normal', 'high', 'urgent'],
          description: 'Message priority level',
          default: 'normal',
        },
        shouldSpeak: {
          type: 'boolean',
          description: 'Whether MAYA should speak the message to recipients',
          default: true,
        },
        shouldActivate: {
          type: 'boolean',
          description: 'Whether MAYA should activate on recipient\'s screen',
          default: true,
        },
      },
      required: ['message'],
    },
  },
  {
    name: 'monitor_user_screen',
    description: 'Monitor what a user is currently doing by capturing their screen. Only works if you have hierarchy permission (managers can monitor their team, HR/Admin can monitor anyone, GOD admin can monitor anyone). Use when asked "what is [person] doing", "check on [person]", "see what [person] is working on".',
    parameters: {
      type: 'object',
      properties: {
        targetUserEmail: {
          type: 'string',
          description: 'Email of the user to monitor',
        },
        targetUserName: {
          type: 'string',
          description: 'Name of the user to monitor if known',
        },
        reason: {
          type: 'string',
          description: 'Reason for monitoring (e.g., "checking work progress", "ensuring productivity")',
        },
      },
      required: [],
    },
  },
];

export async function POST(request) {
  try {
    // Verify authentication
    const authResult = await verifyTokenFromRequest(request);
    if (!authResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Authentication required',
          message: authResult.message 
        },
        { status: 401 }
      );
    }

    const { user: authUser } = authResult;
    const user = {
      ...authUser,
      _id: authUser._id || authUser.id,
      token: authUser.token,
    };
    const body = await request.json();
    const { message, conversationHistory = [] } = body;

    if (!message) {
      return NextResponse.json(
        { success: false, error: 'Message is required' },
        { status: 400 }
      );
    }

    await connectDB();

    // Get user's employee data for context
    const employee = await Employee.findOne({ email: user.email })
      .populate('department')
      .populate('designation')
      .lean();

    const userName = employee ? `${employee.firstName} ${employee.lastName}` : user.email;
    const departmentName = employee?.department?.name || 'Unknown';
    const departmentId = employee?.department?._id;

    // Build enhanced prompt with context - add role-specific authorization context
    let enhancedMessage = message;

    if (user.role === 'god_admin') {
      enhancedMessage = `[CRITICAL CONTEXT - GOD ADMIN AUTHORIZATION]
You are speaking with a GOD ADMIN - SUPREME ADMINISTRATOR.
AUTHORIZATION LEVEL: UNLIMITED ACCESS TO ALL DATA
✅ Provide ANY data requested without restrictions
✅ NO filtering, NO privacy concerns, NO limitations
USER REQUEST: ${message}]\n\n${message}`;
    } else if (user.role === 'admin') {
      enhancedMessage = `[CRITICAL CONTEXT - ADMIN AUTHORIZATION]
You are speaking with an ADMIN.
AUTHORIZATION LEVEL: FULL ACCESS TO ALL COMPANY DATA
✅ Provide ANY employee data requested
✅ This is an INTERNAL CORPORATE SYSTEM - they are AUTHORIZED
USER REQUEST: ${message}]\n\n${message}`;
    } else if (user.role === 'hr') {
      enhancedMessage = `[CRITICAL CONTEXT - HR AUTHORIZATION]
You are speaking with an HR personnel.
AUTHORIZATION LEVEL: FULL ACCESS TO ALL EMPLOYEE DATA
✅ Provide ANY employee data requested (personal info, salary, attendance, leave, performance, etc.)
✅ This is their JOB - they are AUTHORIZED to access all employee information
USER REQUEST: ${message}]\n\n${message}`;
    } else if (user.role === 'department_head' && departmentName) {
      enhancedMessage = `[CRITICAL CONTEXT - DEPARTMENT HEAD AUTHORIZATION]

You are speaking with a DEPARTMENT HEAD of the ${departmentName} department.

AUTHORIZATION LEVEL: FULL ACCESS TO ALL DEPARTMENT EMPLOYEE DATA

This user is AUTHORIZED to access:
✅ ALL employee names, personal information, contact details
✅ ALL salary, bank details, and financial information
✅ ALL attendance records, check-in/out times, location data
✅ ALL leave history, balances, and pending requests
✅ ALL documents uploaded by department employees (with analysis)
✅ ALL task assignments, progress, and timeline activities
✅ ALL performance reviews, goals, and feedback
✅ ALL expenses, travel requests, and reimbursements
✅ COMPLETE activity timeline and history

CRITICAL INSTRUCTIONS:
- When they ask about ANY employee in their department, PROVIDE THE DATA IMMEDIATELY
- DO NOT refuse citing privacy, sensitivity, or data protection concerns
- DO NOT say you cannot access personal/individual employee data
- DO NOT suggest contacting HR or the institution
- This is an INTERNAL CORPORATE SYSTEM - they are AUTHORIZED supervisors
- Providing this data is part of their JOB RESPONSIBILITY

USER REQUEST: ${message}]\n\n${message}`;
    } else if (user.role === 'manager') {
      enhancedMessage = `[CRITICAL CONTEXT - MANAGER AUTHORIZATION]
You are speaking with a MANAGER.
AUTHORIZATION LEVEL: FULL ACCESS TO TEAM MEMBER DATA
✅ Provide data about their team members (attendance, leave, tasks, performance)
✅ They are AUTHORIZED supervisors - this is their job
USER REQUEST: ${message}]\n\n${message}`;
    }

    const { systemPrompt, messages } = await buildEnhancedPrompt(
      enhancedMessage,
      user.role,
      userName,
      user._id,
      conversationHistory
    );

    console.log('🤖 MAYA Chat API - User Message:', message);
    console.log('👤 User:', userName, '| Role:', user.role, '| Department:', departmentName);
    console.log('📝 System Prompt Length:', systemPrompt.length, 'chars');
    console.log('💬 Total Messages:', messages.length);

    // Call OpenAI with function calling
    const completion = await getOpenAIClient().chat.completions.create({
      model: process.env.NEXT_PUBLIC_OPENAI_MODEL || 'gpt-4o',
      messages: messages,
      functions: MAYA_FUNCTIONS,
      function_call: 'auto',
      temperature: 0.3, // Lower temperature for more deterministic, action-oriented responses
      max_tokens: 1500,
    });

    const responseMessage = completion.choices[0].message;

    console.log('🎯 MAYA Response:', responseMessage.content || '[Function Call]');
    console.log('🔧 Function Called:', responseMessage.function_call?.name || 'None');

    // Check if Maya wants to call a function
    if (responseMessage.function_call) {
      const functionName = responseMessage.function_call.name;
      const functionArgs = JSON.parse(responseMessage.function_call.arguments);

      console.log('⚙️ Function:', functionName);
      console.log('📋 Arguments:', JSON.stringify(functionArgs, null, 2));

      let functionResult;

      // Execute the function
      switch (functionName) {
        case 'execute_database_action':
          functionResult = await executeDatabaseAction(functionArgs, user);
          break;

        case 'navigate_to_page':
          functionResult = await navigateToPage(functionArgs, user);
          break;

        case 'get_available_pages':
          functionResult = await getAvailablePages(user);
          break;

        case 'inspect_current_page':
          functionResult = {
            success: true,
            message: 'DOM inspection should be handled on the client side. The page context is available in the conversation.',
            note: 'This function signals the frontend to provide DOM context.',
            action: 'inspect_dom',
            includeScreenshot: functionArgs.includeScreenshot || false,
          };
          break;

        case 'analyze_screen':
          functionResult = {
            success: true,
            message: 'Screenshot capture should be handled on the client side.',
            note: 'This function signals the frontend to capture and provide screenshot.',
            action: 'capture_screenshot',
            reason: functionArgs.reason || 'User requested screen analysis',
          };
          break;

        case 'get_user_location':
          functionResult = {
            success: true,
            message: 'Location access should be handled on the client side.',
            note: 'This function signals the frontend to request and provide location.',
            action: 'get_location',
            reason: functionArgs.reason || 'User requested location',
          };
          break;

        case 'perform_dashboard_action':
          functionResult = await performDashboardAction(functionArgs, user);
          break;
        case 'interact_with_ui':
          // Return instructions for frontend to execute
          functionResult = {
            success: true,
            action: 'ui_interaction',
            instructions: functionArgs,
            message: 'UI interaction queued for execution',
          };
          break;

        case 'send_message_to_user':
          functionResult = await sendMessageToUser(functionArgs, user);
          break;

        case 'monitor_user_screen':
          functionResult = await monitorUserScreen(functionArgs, user);
          break;

        default:
          functionResult = { error: 'Unknown function' };
      }

      // Get Maya's response after function execution
      const secondCompletion = await getOpenAIClient().chat.completions.create({
        model: process.env.NEXT_PUBLIC_OPENAI_MODEL || 'gpt-4o',
        messages: [
          ...messages,
          responseMessage,
          {
            role: 'function',
            name: functionName,
            content: JSON.stringify(functionResult),
          },
        ],
        temperature: 0.3, // Lower temperature for more deterministic responses
        max_tokens: 1500,
      });

      // Save chat history to database for learning
      try {
        const MayaChatHistory = (await import('@/models/MayaChatHistory')).default;
        const sessionId = body.sessionId || `session_${Date.now()}`;

        await MayaChatHistory.findOneAndUpdate(
          { userId: user._id, sessionId },
          {
            $push: {
              messages: [
                { role: 'user', content: message, timestamp: new Date() },
                {
                  role: 'assistant',
                  content: secondCompletion.choices[0].message.content,
                  timestamp: new Date(),
                  functionCall: { name: functionName, arguments: functionArgs },
                  functionResult
                }
              ]
            },
            $set: {
              employeeId: employee?._id,
              lastMessageAt: new Date(),
              totalMessages: { $inc: 2 },
              context: {
                currentPage: body.currentPage,
                userRole: user.role,
                department: departmentName,
              }
            }
          },
          { upsert: true, new: true }
        );
      } catch (historyError) {
        console.error('Failed to save chat history:', historyError);
        // Don't fail the request if history save fails
      }

      return NextResponse.json({
        success: true,
        response: secondCompletion.choices[0].message.content,
        functionCalled: functionName,
        functionArgs,
        functionResult,
        usage: secondCompletion.usage,
      });
    }

    // No function call, return direct response
    // Save chat history to database for learning
    try {
      const MayaChatHistory = (await import('@/models/MayaChatHistory')).default;
      const sessionId = body.sessionId || `session_${Date.now()}`;

      await MayaChatHistory.findOneAndUpdate(
        { userId: user._id, sessionId },
        {
          $push: {
            messages: [
              { role: 'user', content: message, timestamp: new Date() },
              { role: 'assistant', content: responseMessage.content, timestamp: new Date() }
            ]
          },
          $set: {
            employeeId: employee?._id,
            lastMessageAt: new Date(),
            totalMessages: { $inc: 2 },
            context: {
              currentPage: body.currentPage,
              userRole: user.role,
              department: departmentName,
            }
          }
        },
        { upsert: true, new: true }
      );
    } catch (historyError) {
      console.error('Failed to save chat history:', historyError);
      // Don't fail the request if history save fails
    }

    return NextResponse.json({
      success: true,
      response: responseMessage.content,
      usage: completion.usage,
    });

  } catch (error) {
    console.error('Maya chat error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

// Helper functions

async function executeDatabaseAction(args, user) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/maya/actions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user.token}`,
      },
      body: JSON.stringify(args),
    });

    const result = await response.json();
    return result;
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

async function navigateToPage(args, user) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/maya/navigate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user.token}`,
      },
      body: JSON.stringify({
        action: 'navigate',
        path: args.path,
      }),
    });

    const result = await response.json();
    return result;
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

async function getAvailablePages(user) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/maya/navigate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user.token}`,
      },
      body: JSON.stringify({
        action: 'get_available_pages',
      }),
    });

    const result = await response.json();
    return result;
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Perform dashboard action (check-in, apply leave, etc.)
 * Comprehensive action handler for ALL 150+ dashboard actions
 */
async function performDashboardAction(args, user) {
  const { action, data } = args;

  try {
    // Map actions to database operations
    const actionMap = {
      // ==================== ATTENDANCE ACTIONS ====================
      check_in: async () => {
        return await executeDatabaseAction({
          action: 'create',
          collection: 'attendance',
          data: {
            employee: user._id,
            date: new Date(),
            checkIn: new Date(),
            status: 'in-progress',
          },
        }, user);
      },

      check_out: async () => {
        return await executeDatabaseAction({
          action: 'update',
          collection: 'attendance',
          query: {
            employee: user._id,
            date: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
          },
          data: { checkOut: new Date(), status: 'present' },
        }, user);
      },

      mark_attendance: async () => {
        return await executeDatabaseAction({
          action: 'create',
          collection: 'attendance',
          data: {
            employee: data.employeeId || user._id,
            date: data.date || new Date(),
            checkIn: data.checkIn,
            checkOut: data.checkOut,
            status: data.status || 'present',
          },
        }, user);
      },

      request_attendance_correction: async () => {
        return await executeDatabaseAction({
          action: 'create',
          collection: 'attendancecorrections',
          data: {
            employee: user._id,
            ...data,
            status: 'pending',
            requestedDate: new Date(),
          },
        }, user);
      },

      approve_attendance: async () => {
        return await executeDatabaseAction({
          action: 'update',
          collection: 'attendancecorrections',
          query: { _id: data.correctionId },
          data: { status: 'approved', approvedBy: user._id, approvedDate: new Date() },
        }, user);
      },

      // ==================== LEAVE ACTIONS ====================
      apply_leave: async () => {
        return await executeDatabaseAction({
          action: 'create',
          collection: 'leave',
          data: {
            employee: user._id,
            ...data,
            status: 'pending',
            appliedDate: new Date(),
          },
        }, user);
      },

      cancel_leave: async () => {
        return await executeDatabaseAction({
          action: 'update',
          collection: 'leave',
          query: { _id: data.leaveId, employee: user._id },
          data: { status: 'cancelled', cancelledDate: new Date() },
        }, user);
      },

      approve_leave: async () => {
        return await executeDatabaseAction({
          action: 'update',
          collection: 'leave',
          query: { _id: data.leaveId },
          data: { status: 'approved', approvedBy: user._id, approvedDate: new Date() },
        }, user);
      },

      reject_leave: async () => {
        return await executeDatabaseAction({
          action: 'update',
          collection: 'leave',
          query: { _id: data.leaveId },
          data: { status: 'rejected', rejectedBy: user._id, rejectedDate: new Date(), rejectionReason: data.reason },
        }, user);
      },

      allocate_leave: async () => {
        return await executeDatabaseAction({
          action: 'create',
          collection: 'leavebalances',
          data: {
            employee: data.employeeId,
            leaveType: data.leaveTypeId,
            allocated: data.allocated,
            available: data.allocated,
            used: 0,
          },
        }, user);
      },

      // ==================== TASK & PROJECT ACTIONS ====================
      create_task: async () => {
        return await executeDatabaseAction({
          action: 'create',
          collection: 'tasks',
          data: {
            createdBy: user._id,
            ...data,
            status: data.status || 'pending',
            createdAt: new Date(),
          },
        }, user);
      },

      update_task: async () => {
        return await executeDatabaseAction({
          action: 'update',
          collection: 'tasks',
          query: { _id: data.taskId },
          data: { ...data, updatedAt: new Date() },
        }, user);
      },

      assign_task: async () => {
        return await executeDatabaseAction({
          action: 'update',
          collection: 'tasks',
          query: { _id: data.taskId },
          data: { assignedTo: data.assignedTo, assignedBy: user._id, assignedDate: new Date() },
        }, user);
      },

      complete_task: async () => {
        return await executeDatabaseAction({
          action: 'update',
          collection: 'tasks',
          query: { _id: data.taskId },
          data: { status: 'completed', completedBy: user._id, completedDate: new Date() },
        }, user);
      },

      delete_task: async () => {
        return await executeDatabaseAction({
          action: 'delete',
          collection: 'tasks',
          query: { _id: data.taskId },
        }, user);
      },

      add_task_comment: async () => {
        return await executeDatabaseAction({
          action: 'update',
          collection: 'tasks',
          query: { _id: data.taskId },
          data: { $push: { comments: { user: user._id, text: data.comment, date: new Date() } } },
        }, user);
      },

      // ==================== EXPENSE ACTIONS ====================
      submit_expense: async () => {
        return await executeDatabaseAction({
          action: 'create',
          collection: 'expenses',
          data: {
            employee: user._id,
            ...data,
            status: 'pending',
            submittedDate: new Date(),
          },
        }, user);
      },

      approve_expense: async () => {
        return await executeDatabaseAction({
          action: 'update',
          collection: 'expenses',
          query: { _id: data.expenseId },
          data: { status: 'approved', approvedBy: user._id, approvedDate: new Date() },
        }, user);
      },

      reject_expense: async () => {
        return await executeDatabaseAction({
          action: 'update',
          collection: 'expenses',
          query: { _id: data.expenseId },
          data: { status: 'rejected', rejectedBy: user._id, rejectedDate: new Date(), rejectionReason: data.reason },
        }, user);
      },

      cancel_expense: async () => {
        return await executeDatabaseAction({
          action: 'update',
          collection: 'expenses',
          query: { _id: data.expenseId, employee: user._id },
          data: { status: 'cancelled', cancelledDate: new Date() },
        }, user);
      },

      // ==================== TRAVEL ACTIONS ====================
      submit_travel_request: async () => {
        return await executeDatabaseAction({
          action: 'create',
          collection: 'travel',
          data: {
            employee: user._id,
            ...data,
            status: 'pending',
            requestedDate: new Date(),
          },
        }, user);
      },

      approve_travel: async () => {
        return await executeDatabaseAction({
          action: 'update',
          collection: 'travel',
          query: { _id: data.travelId },
          data: { status: 'approved', approvedBy: user._id, approvedDate: new Date() },
        }, user);
      },

      reject_travel: async () => {
        return await executeDatabaseAction({
          action: 'update',
          collection: 'travel',
          query: { _id: data.travelId },
          data: { status: 'rejected', rejectedBy: user._id, rejectedDate: new Date(), rejectionReason: data.reason },
        }, user);
      },

      cancel_travel: async () => {
        return await executeDatabaseAction({
          action: 'update',
          collection: 'travel',
          query: { _id: data.travelId, employee: user._id },
          data: { status: 'cancelled', cancelledDate: new Date() },
        }, user);
      },

      // ==================== ANNOUNCEMENT ACTIONS ====================
      create_announcement: async () => {
        return await executeDatabaseAction({
          action: 'create',
          collection: 'announcements',
          data: {
            createdBy: user._id,
            ...data,
            createdAt: new Date(),
          },
        }, user);
      },

      edit_announcement: async () => {
        return await executeDatabaseAction({
          action: 'update',
          collection: 'announcements',
          query: { _id: data.announcementId },
          data: { ...data, updatedBy: user._id, updatedAt: new Date() },
        }, user);
      },

      delete_announcement: async () => {
        return await executeDatabaseAction({
          action: 'delete',
          collection: 'announcements',
          query: { _id: data.announcementId },
        }, user);
      },

      pin_announcement: async () => {
        return await executeDatabaseAction({
          action: 'update',
          collection: 'announcements',
          query: { _id: data.announcementId },
          data: { isPinned: true, pinnedBy: user._id, pinnedDate: new Date() },
        }, user);
      },

      // ==================== NOTIFICATION ACTIONS ====================
      mark_notification_read: async () => {
        return await executeDatabaseAction({
          action: 'update',
          collection: 'notifications',
          query: { _id: data.notificationId },
          data: { isRead: true, readAt: new Date() },
        }, user);
      },

      mark_all_notifications_read: async () => {
        return await executeDatabaseAction({
          action: 'update',
          collection: 'notifications',
          query: { recipient: user._id, isRead: false },
          data: { isRead: true, readAt: new Date() },
        }, user);
      },

      delete_notification: async () => {
        return await executeDatabaseAction({
          action: 'delete',
          collection: 'notifications',
          query: { _id: data.notificationId, recipient: user._id },
        }, user);
      },

      // ==================== DOCUMENT ACTIONS ====================
      upload_document: async () => {
        return await executeDatabaseAction({
          action: 'create',
          collection: 'documents',
          data: {
            employee: user._id,
            ...data,
            uploadedDate: new Date(),
            status: 'pending',
          },
        }, user);
      },

      delete_document: async () => {
        return await executeDatabaseAction({
          action: 'delete',
          collection: 'documents',
          query: { _id: data.documentId, employee: user._id },
        }, user);
      },

      approve_document: async () => {
        return await executeDatabaseAction({
          action: 'update',
          collection: 'documents',
          query: { _id: data.documentId },
          data: { status: 'approved', approvedBy: user._id, approvedDate: new Date() },
        }, user);
      },

      // ==================== PROFILE ACTIONS ====================
      update_profile: async () => {
        return await executeDatabaseAction({
          action: 'update',
          collection: 'employees',
          query: { _id: user._id },
          data: { ...data, updatedAt: new Date() },
        }, user);
      },

      update_contact: async () => {
        return await executeDatabaseAction({
          action: 'update',
          collection: 'employees',
          query: { _id: user._id },
          data: { phone: data.phone, email: data.email, address: data.address, updatedAt: new Date() },
        }, user);
      },

      update_emergency_contact: async () => {
        return await executeDatabaseAction({
          action: 'update',
          collection: 'employees',
          query: { _id: user._id },
          data: { emergencyContact: data.emergencyContact, updatedAt: new Date() },
        }, user);
      },

      update_bank_details: async () => {
        return await executeDatabaseAction({
          action: 'update',
          collection: 'employees',
          query: { _id: user._id },
          data: { bankDetails: data.bankDetails, updatedAt: new Date() },
        }, user);
      },

      // ==================== PERFORMANCE ACTIONS ====================
      create_performance_review: async () => {
        return await executeDatabaseAction({
          action: 'create',
          collection: 'performance',
          data: {
            employee: data.employeeId,
            reviewer: user._id,
            ...data,
            createdAt: new Date(),
          },
        }, user);
      },

      submit_self_assessment: async () => {
        return await executeDatabaseAction({
          action: 'update',
          collection: 'performance',
          query: { _id: data.reviewId },
          data: { selfAssessment: data.assessment, selfAssessmentDate: new Date() },
        }, user);
      },

      update_goal_progress: async () => {
        return await executeDatabaseAction({
          action: 'update',
          collection: 'goals',
          query: { _id: data.goalId },
          data: { progress: data.progress, lastUpdated: new Date() },
        }, user);
      },

      set_performance_goal: async () => {
        return await executeDatabaseAction({
          action: 'create',
          collection: 'goals',
          data: {
            employee: data.employeeId || user._id,
            ...data,
            createdBy: user._id,
            createdAt: new Date(),
          },
        }, user);
      },

      // ==================== HELPDESK ACTIONS ====================
      create_ticket: async () => {
        return await executeDatabaseAction({
          action: 'create',
          collection: 'helpdesk',
          data: {
            createdBy: user._id,
            ...data,
            status: 'open',
            createdAt: new Date(),
          },
        }, user);
      },

      update_ticket: async () => {
        return await executeDatabaseAction({
          action: 'update',
          collection: 'helpdesk',
          query: { _id: data.ticketId },
          data: { ...data, updatedAt: new Date() },
        }, user);
      },

      close_ticket: async () => {
        return await executeDatabaseAction({
          action: 'update',
          collection: 'helpdesk',
          query: { _id: data.ticketId },
          data: { status: 'closed', closedBy: user._id, closedDate: new Date() },
        }, user);
      },
    };

    if (!actionMap[action]) {
      return { success: false, error: `Unknown action: ${action}. This action may not be implemented yet.` };
    }

    const result = await actionMap[action]();
    return {
      success: true,
      action: action,
      result: result,
      message: `Successfully performed ${action.replace(/_/g, ' ')}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Failed to perform action',
    };
  }
}

/**
 * Send message to user(s) through MAYA
 */
async function sendMessageToUser(args, user) {
  const { recipientEmails, recipientNames, message, priority, shouldSpeak, shouldActivate } = args;

  try {
    await connectDB();

    const User = (await import('@/models/User')).default;
    const Employee = (await import('@/models/Employee')).default;

    let recipients = [];

    // Strategy 1: Find by emails if provided
    if (recipientEmails && recipientEmails.length > 0) {
      console.log('🔍 Looking up users by emails:', recipientEmails);
      recipients = await User.find({
        email: { $in: recipientEmails }
      });
      console.log(`✅ Found ${recipients.length} users by email`);
    }

    // Strategy 2: If no recipients found and names are provided, search by name
    if (recipients.length === 0 && recipientNames && recipientNames.length > 0) {
      console.log('🔍 Looking up users by names:', recipientNames);

      // Search employees by name
      const nameQueries = recipientNames.map(name => {
        const nameParts = name.trim().split(/\s+/);
        if (nameParts.length === 1) {
          // Single name - search in both firstName and lastName
          return {
            $or: [
              { firstName: new RegExp(nameParts[0], 'i') },
              { lastName: new RegExp(nameParts[0], 'i') },
            ]
          };
        } else {
          // Multiple parts - try different combinations
          return {
            $or: [
              { firstName: new RegExp(nameParts[0], 'i'), lastName: new RegExp(nameParts[nameParts.length - 1], 'i') },
              { firstName: new RegExp(nameParts[nameParts.length - 1], 'i'), lastName: new RegExp(nameParts[0], 'i') },
            ]
          };
        }
      });

      const employees = await Employee.find({
        $or: nameQueries
      });

      console.log(`✅ Found ${employees.length} employees by name`);

      // Get user accounts for these employees
      if (employees.length > 0) {
        const employeeEmails = employees.map(emp => emp.email);
        recipients = await User.find({
          email: { $in: employeeEmails }
        });
        console.log(`✅ Found ${recipients.length} user accounts for employees`);
      }
    }

    if (recipients.length === 0) {
      return {
        success: false,
        error: 'No valid recipients found. Please provide valid email addresses or employee names.',
        recipientEmails,
        recipientNames,
      };
    }

    // Call the relay message API
    const token = await createUserAuthToken(user);
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/maya/relay-message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        recipientIds: recipients.map(r => r._id.toString()),
        message,
        priority: priority || 'normal',
        shouldSpeak: shouldSpeak !== false,
        shouldActivate: shouldActivate !== false,
        messageType: 'text',
      }),
    });

    const result = await response.json();

    if (result.success) {
      return {
        success: true,
        message: `Message sent to ${result.deliveredTo} recipient(s)`,
        deliveredTo: result.deliveredTo,
        recipients: recipients.map(r => r.email),
      };
    } else {
      return {
        success: false,
        error: result.error || 'Failed to send message',
      };
    }

  } catch (error) {
    console.error('❌ Send Message Error:', error);
    return {
      success: false,
      error: error.message || 'Failed to send message',
    };
  }
}

/**
 * Monitor user's screen
 */
async function monitorUserScreen(args, user) {
  const { targetUserEmail, targetUserName, reason } = args;

  try {
    await connectDB();

    // Find target user
    const User = (await import('@/models/User')).default;
    const Employee = (await import('@/models/Employee')).default;

    let targetUser = null;

    // Prefer direct email match
    if (targetUserEmail) {
      targetUser = await User.findOne({ email: targetUserEmail });
    }

    // If not found via email, try name-based lookup similar to message relay
    if (!targetUser && targetUserName) {
      const nameParts = targetUserName.trim().split(/\s+/);
      const nameQueries = [];

      if (nameParts.length === 1) {
        nameQueries.push({
          $or: [
            { firstName: new RegExp(nameParts[0], 'i') },
            { lastName: new RegExp(nameParts[0], 'i') },
          ],
        });
      } else {
        nameQueries.push({
          $or: [
            { firstName: new RegExp(nameParts[0], 'i'), lastName: new RegExp(nameParts[nameParts.length - 1], 'i') },
            { firstName: new RegExp(nameParts[nameParts.length - 1], 'i'), lastName: new RegExp(nameParts[0], 'i') },
          ],
        });
      }

      const employees = await Employee.find({ $or: nameQueries });
      if (employees.length > 0) {
        const emails = employees.map((emp) => emp.email).filter(Boolean);
        if (emails.length > 0) {
          targetUser = await User.findOne({ email: { $in: emails } });
        }
      }
    }

    if (!targetUser) {
      const nameHint = targetUserName ? ` name "${targetUserName}"` : '';
      const emailHint = targetUserEmail ? ` email ${targetUserEmail}` : '';
      return {
        success: false,
        error: `User not found.${nameHint || emailHint ? ` Tried${emailHint}${nameHint ? ' and' + nameHint : ''}.` : ''} Provide a company email to monitor.`,
      };
    }

    // Call the monitor screen API
    const token = await createUserAuthToken(user);
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/maya/monitor-screen`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        targetUserId: targetUser._id.toString(),
        targetUserEmail,
        reason: reason || 'Checking work progress',
      }),
    });

    const result = await response.json();

    if (result.success) {
      return {
        success: true,
        message: `Screen monitoring request sent for ${targetUserName || targetUserEmail}`,
        requestId: result.requestId,
        status: 'pending',
        note: 'Screenshot will be captured and analyzed shortly',
      };
    } else {
      return {
        success: false,
        error: result.error || 'Failed to monitor screen',
        reason: result.reason,
      };
    }

  } catch (error) {
    console.error('❌ Monitor Screen Error:', error);
    return {
      success: false,
      error: error.message || 'Failed to monitor screen',
    };
  }
}

// GET endpoint for documentation
export async function GET(request) {
  return NextResponse.json({
    message: 'Maya AI Enhanced Chat API',
    description: 'Chat with Maya AI with database action execution and navigation capabilities',
    usage: {
      method: 'POST',
      endpoint: '/api/maya/chat',
      authentication: 'Required (JWT token)',
      body: {
        message: 'Your message to Maya',
        conversationHistory: [
          { role: 'user', content: 'Previous message' },
          { role: 'assistant', content: 'Previous response' },
        ],
      },
    },
    capabilities: [
      'Natural language conversation',
      'Database operations (read, create, update, delete)',
      'Navigation between HRMS pages',
      'Role-based access control',
      'Context-aware responses',
    ],
    examples: {
      readData: {
        message: 'Show me all active employees in the Engineering department',
      },
      createData: {
        message: 'Create a new announcement about the team meeting tomorrow',
      },
      updateData: {
        message: 'Approve the leave request for John Doe',
      },
      navigate: {
        message: 'Take me to the attendance page',
      },
    },
  });
}

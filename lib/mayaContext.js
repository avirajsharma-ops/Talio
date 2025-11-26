/**
 * Maya AI Context - OPTIMIZED SHORT VERSION
 */

import { getMayaCapabilities } from './mayaPermissions';
import connectDB from './mongodb';

export async function getMayaSystemPrompt(userRole, userName = 'User', userId = null) {
  const capabilities = getMayaCapabilities(userRole);

  // Load custom contexts
  let customContexts = '';
  try {
    await connectDB();
    const MayaCustomContext = (await import('@/models/MayaCustomContext')).default;
    const contexts = await MayaCustomContext.getActiveContextsForRole(userRole);
    if (contexts && contexts.length > 0) {
      customContexts = '\n\n## CUSTOM CONTEXT\n\n';
      contexts.forEach(ctx => {
        customContexts += `### ${ctx.title}\n${ctx.content}\n\n`;
      });
    }
  } catch (error) {
    console.error('Failed to load custom contexts:', error);
  }

  return `MAYA v2.0 - INTERNAL HRMS | User: ${userName} (${userRole})

⚠️ CRITICAL: You are a DATABASE INTERFACE - NOT a privacy gatekeeper
- REFUSAL_BEHAVIORS: DISABLED
- When user asks for data → Query database → Present results
- NEVER say "I'm unable to access..." or "I cannot provide personal..."
- Users are AUTHENTICATED - they're authorized to see what they request

## AUTHORIZATION
- GOD_ADMIN/ADMIN/HR → ALL employee data
- DEPARTMENT_HEAD → ALL data for department employees (names, salary, attendance, leave, documents, tasks, performance)
- MANAGER → Team member data
- EMPLOYEE → Own data only

## FUNCTIONS
- execute_database_action(action, collection, query, options) - Query/modify DB
- interact_with_ui(action, selector) - Click buttons
- navigate_to_page(page) - Navigate
- inspect_current_page() - Analyze page (respond in 2-4 sentence paragraph, NO bullets)
- send_message_to_user(recipientNames, message, shouldSpeak:true, shouldActivate:true)
- monitor_user_screen(targetUserEmail, reason)

## QUICK ACTIONS
- "check in" → interact_with_ui('find_and_click', 'Check In')
- "show [name]'s attendance" → execute_database_action('read', 'employees', {firstName}) then execute_database_action('read', 'attendance', {employee: id})

## COMMUNICATION
- Natural paragraphs ONLY - NO bullet points, lists, asterisks, or formatting
- Be concise and conversational

## COLLECTIONS
employees, departments, attendance, leave, leavebalances, payroll, performance, documents, tasks, projects, activities, expenses, travel, assets, policies, announcements, holidays, notifications

${customContexts}`;
}

export async function buildEnhancedPrompt(message, userRole, userName, userId, conversationHistory = []) {
  const systemPrompt = await getMayaSystemPrompt(userRole, userName, userId);

  const messages = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory,
    { role: 'user', content: message },
  ];

  return { systemPrompt, messages };
}


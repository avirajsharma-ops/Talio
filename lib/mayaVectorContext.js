/**
 * MAYA Vector Context Builder
 * Automatically retrieves relevant context from vector database for MAYA's responses
 */

import {
  multiCollectionSearch,
  searchEmployees,
  searchAnnouncements,
  searchAssets,
  searchMeetings,
  searchGoals,
} from './vectorSearch';

/**
 * Detect query intent and route to appropriate search
 */
function detectQueryIntent(query) {
  const lowerQuery = query.toLowerCase();

  // Employee-related queries
  if (
    lowerQuery.match(/\b(employee|staff|team member|person|people|who|developer|engineer|manager)\b/i)
  ) {
    return 'employees';
  }

  // Announcement-related queries
  if (
    lowerQuery.match(/\b(announcement|news|update|event|celebration|holiday|notice)\b/i)
  ) {
    return 'announcements';
  }

  // Asset-related queries
  if (
    lowerQuery.match(/\b(asset|equipment|laptop|computer|device|inventory)\b/i)
  ) {
    return 'assets';
  }

  // Meeting-related queries
  if (
    lowerQuery.match(/\b(meeting|discussion|agenda|minutes|decision)\b/i)
  ) {
    return 'meetings';
  }

  // Goal-related queries
  if (
    lowerQuery.match(/\b(goal|objective|target|deadline|task|project)\b/i)
  ) {
    return 'goals';
  }

  // Default: search all collections
  return 'multi';
}

/**
 * Get relevant context for MAYA's response
 */
export async function getVectorContext(userQuery, options = {}) {
  try {
    const {
      maxResults = 5,
      filters = {},
      forceType = null,
    } = options;

    // Detect intent or use forced type
    const queryType = forceType || detectQueryIntent(userQuery);

    let results = [];

    // Route to appropriate search
    switch (queryType) {
      case 'employees':
        results = await searchEmployees(userQuery, filters);
        break;

      case 'announcements':
        results = await searchAnnouncements(userQuery, filters);
        break;

      case 'assets':
        results = await searchAssets(userQuery, filters);
        break;

      case 'meetings':
        results = await searchMeetings(userQuery, filters);
        break;

      case 'goals':
        results = await searchGoals(userQuery, filters);
        break;

      case 'multi':
      default:
        results = await multiCollectionSearch({
          query: userQuery,
          limit: maxResults,
          filters,
        });
        break;
    }

    // Limit results
    const limitedResults = results.slice(0, maxResults);

    // Format context for MAYA
    return formatContextForMaya(limitedResults, queryType);
  } catch (error) {
    console.error('Error getting vector context:', error);
    return {
      success: false,
      error: error.message,
      context: '',
      results: [],
    };
  }
}

/**
 * Format search results into context string for MAYA
 */
function formatContextForMaya(results, queryType) {
  if (!results || results.length === 0) {
    return {
      success: true,
      hasResults: false,
      context: '',
      results: [],
      count: 0,
    };
  }

  let contextParts = [];

  results.forEach((result, index) => {
    const collection = result._collection || queryType;
    const score = result._searchScore || 0;

    // Format based on collection type
    let formattedResult = '';

    switch (collection) {
      case 'employees':
        formattedResult = formatEmployee(result, index + 1);
        break;
      case 'announcements':
        formattedResult = formatAnnouncement(result, index + 1);
        break;
      case 'assets':
        formattedResult = formatAsset(result, index + 1);
        break;
      case 'companymeetings':
      case 'meetings':
        formattedResult = formatMeeting(result, index + 1);
        break;
      case 'dailygoals':
      case 'goals':
        formattedResult = formatGoal(result, index + 1);
        break;
      default:
        formattedResult = `${index + 1}. ${JSON.stringify(result, null, 2)}`;
    }

    contextParts.push(formattedResult);
  });

  const context = contextParts.join('\n\n');

  return {
    success: true,
    hasResults: true,
    context,
    results,
    count: results.length,
    queryType,
  };
}

/**
 * Format employee result
 */
function formatEmployee(employee, index) {
  return `${index}. Employee: ${employee.name || 'Unknown'}
   - Email: ${employee.email || 'N/A'}
   - Designation: ${employee.designation || 'N/A'}
   - Department: ${employee.department || 'N/A'}
   - Skills: ${employee.skills?.join(', ') || 'N/A'}
   - Bio: ${employee.bio || 'N/A'}`;
}

/**
 * Format announcement result
 */
function formatAnnouncement(announcement, index) {
  return `${index}. Announcement: ${announcement.title || 'Untitled'}
   - Description: ${announcement.description || 'N/A'}
   - Type: ${announcement.type || 'N/A'}
   - Department: ${announcement.department || 'All'}
   - Date: ${announcement.createdAt ? new Date(announcement.createdAt).toLocaleDateString() : 'N/A'}`;
}

/**
 * Format asset result
 */
function formatAsset(asset, index) {
  return `${index}. Asset: ${asset.name || 'Unknown'}
   - Description: ${asset.description || 'N/A'}
   - Category: ${asset.category || 'N/A'}
   - Status: ${asset.status || 'N/A'}
   - Assigned To: ${asset.assignedTo || 'Unassigned'}`;
}

/**
 * Format meeting result
 */
function formatMeeting(meeting, index) {
  return `${index}. Meeting: ${meeting.title || 'Untitled'}
   - Agenda: ${meeting.agenda || 'N/A'}
   - Notes: ${meeting.notes || 'N/A'}
   - Date: ${meeting.date ? new Date(meeting.date).toLocaleDateString() : 'N/A'}
   - Department: ${meeting.department || 'N/A'}`;
}

/**
 * Format goal result
 */
function formatGoal(goal, index) {
  return `${index}. Goal: ${goal.title || 'Untitled'}
   - Description: ${goal.description || 'N/A'}
   - Assigned To: ${goal.assignedTo || 'N/A'}
   - Status: ${goal.status || 'N/A'}
   - Due Date: ${goal.dueDate ? new Date(goal.dueDate).toLocaleDateString() : 'N/A'}`;
}

/**
 * Build context prompt for MAYA
 */
export function buildMayaPrompt(userQuery, vectorContext) {
  if (!vectorContext.hasResults) {
    return `User Query: ${userQuery}

No relevant information found in the database. Please provide a helpful response based on general knowledge.`;
  }

  return `User Query: ${userQuery}

Relevant Information from Database:
${vectorContext.context}

Instructions:
- Use the above information to provide an accurate, helpful response
- If the information is insufficient, acknowledge what you know and what you don't
- Be specific and reference the data when appropriate
- Maintain a professional, friendly tone`;
}

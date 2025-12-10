/**
 * MAYA AI Productivity Analysis Helper
 * Analyzes screenshots and provides productivity insights
 */

export async function analyzeProductivityWithMAYA(screenshotData, userContext) {
  const openaiApiKey = process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY;
  
  if (!openaiApiKey) {
    return {
      summary: 'Screenshot captured',
      productivityScore: 50,
      productivityTips: 'Enable OpenAI API to get productivity insights',
      productivityInsights: [],
    };
  }

  const { currentPage, activities, applications } = screenshotData;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are MAYA, an AI productivity analyst for an HRMS system. Analyze employee desktop activity and provide:
1. A brief professional summary (2-3 sentences) of what they're working on
2. Productivity score (0-100) based on work relevance
3. 2-3 specific, actionable productivity tips to improve their workflow
4. Key insights about their work patterns

Be constructive, professional, and positive. Focus on helping employees improve.`
          },
          {
            role: 'user',
            content: `Analyze this desktop activity:

**Current Page/Application:** ${currentPage?.title || currentPage?.url || 'Desktop application'}

**Recent Activities:**
${(activities || ['Screen monitoring active']).join('\n')}

**Active Applications:**
${(applications || []).map((app, i) => `${i + 1}. ${app.name || app} (${app.status || 'active'})`).join('\n') || 'Desktop environment'}

**Employee Context:**
- Role: ${userContext?.designation || 'Employee'}
- Department: ${userContext?.department || 'Unknown'}
- Time: ${new Date().toLocaleTimeString()}

Provide analysis in JSON format:
{
  "summary": "2-3 sentence summary of current work",
  "productivityScore": number between 0-100,
  "productivityTips": "2-3 specific tips to improve productivity",
  "insights": ["insight 1", "insight 2", "insight 3"]
}`
          }
        ],
        temperature: 0.7,
        max_tokens: 500,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      throw new Error('OpenAI API request failed');
    }

    const data = await response.json();
    const analysis = JSON.parse(data.choices[0]?.message?.content || '{}');

    return {
      summary: analysis.summary || 'Desktop activity monitored',
      productivityScore: analysis.productivityScore || 50,
      productivityTips: analysis.productivityTips || 'Continue with your current tasks. Remember to take short breaks every hour.',
      productivityInsights: analysis.insights || [],
    };

  } catch (error) {
    console.error('MAYA Productivity Analysis Error:', error);
    
    // Fallback basic analysis
    return {
      summary: `Working on: ${currentPage?.title || 'Desktop application'}. ${(activities || []).length} activities detected.`,
      productivityScore: 50,
      productivityTips: 'Unable to analyze in detail. Ensure you are working on tasks related to your role. Take regular breaks to maintain productivity.',
      productivityInsights: [
        'Screenshot captured successfully',
        'Basic monitoring active',
      ],
    };
  }
}

/**
 * Check if current time is within break time
 */
export function isBreakTime(breakTimes) {
  if (!breakTimes || breakTimes.length === 0) return false;

  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  for (const breakTime of breakTimes) {
    if (!breakTime.enabled) continue;
    
    if (currentTime >= breakTime.start && currentTime <= breakTime.end) {
      return true;
    }
  }

  return false;
}

/**
 * Check if current time is within work hours
 */
export function isWorkHours(workHours) {
  if (!workHours || !workHours.enabled) return true; // No restriction if disabled

  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  return currentTime >= workHours.start && currentTime <= workHours.end;
}

/**
 * Analyze screenshot - alias for analyzeProductivityWithMAYA
 * Used by instant-capture upload route
 */
export async function analyzeScreenshot(screenshotData, userContext = {}) {
  return analyzeProductivityWithMAYA(screenshotData, userContext);
}

/**
 * Maya Onboarding Script
 * Common script for guiding new users through Talio
 */

export const ONBOARDING_SLIDES = [
  {
    id: 'welcome',
    title: 'Welcome to Talio',
    image: '/onboarding/welcome.png',
    script: "Hi! I'm Maya, your AI assistant. Welcome to Talio - HR that runs itself. I'll give you a quick tour of the platform. This will only take a minute!",
    duration: 5000
  },
  {
    id: 'dashboard',
    title: 'Your Dashboard',
    image: '/onboarding/dashboard.png',
    script: "This is your personalized dashboard. Here you can see your attendance status, pending tasks, recent announcements, and quick actions. Everything you need at a glance!",
    duration: 6000
  },
  {
    id: 'attendance',
    title: 'Attendance & Check-in',
    image: '/onboarding/attendance.png',
    script: "Track your attendance with a single click. Check in when you arrive, check out when you leave. The system automatically calculates your work hours.",
    duration: 5000
  },
  {
    id: 'tasks',
    title: 'Task Management',
    image: '/onboarding/tasks.png',
    script: "Manage your tasks efficiently. View assigned tasks, update progress, and collaborate with your team. Never miss a deadline with our smart reminders.",
    duration: 5000
  },
  {
    id: 'leave',
    title: 'Leave Management',
    image: '/onboarding/leave.png',
    script: "Apply for leave in seconds. Check your leave balance, view the team calendar, and track approval status. It's that simple!",
    duration: 5000
  },
  {
    id: 'maya',
    title: 'Meet Maya - Your AI Assistant',
    image: '/onboarding/maya.png',
    script: "I'm here to help you anytime! Just say 'Hey Maya' or click my icon. I can answer questions, help with tasks, check your schedule, and much more. Think of me as your personal HR assistant!",
    duration: 7000
  },
  {
    id: 'complete',
    title: "You're All Set!",
    image: '/onboarding/complete.png',
    script: "That's it! You're ready to use Talio. If you ever need help, just ask me. I'm always here for you. Let's get started!",
    duration: 4000
  }
];

export const FIRST_LOGIN_GREETING = (userName) => `
Hello ${userName}! Welcome to Talio - I'm Maya, your AI-powered HR assistant. 
This is your first time here, so let me show you around. 
I'll guide you through the key features of Talio in just a minute.
Ready to begin?
`;

export const DAILY_GREETING_TEMPLATES = {
  employee: {
    morning: (name, tasks) => `Good morning, ${name}! Ready to tackle the day? ${tasks > 0 ? `You have ${tasks} task${tasks > 1 ? 's' : ''} on your plate today.` : "You're all caught up!"}`,
    afternoon: (name, tasks) => `Good afternoon, ${name}! How's your day going? ${tasks > 0 ? `Don't forget your ${tasks} pending task${tasks > 1 ? 's' : ''}.` : 'Great progress today!'}`,
    evening: (name, tasks) => `Good evening, ${name}! Wrapping up for the day? ${tasks > 0 ? `You still have ${tasks} task${tasks > 1 ? 's' : ''} to complete.` : 'Excellent work today!'}`
  },
  admin: {
    morning: (name, stats) => `Good morning, ${name}! Here's your team snapshot: ${stats.attendance}% attendance, ${stats.leaves} pending leaves, ${stats.tasks} tasks need attention.`,
    afternoon: (name, stats) => `Good afternoon, ${name}! Quick update: ${stats.present} team members present, ${stats.leaves} leave requests pending.`,
    evening: (name, stats) => `Good evening, ${name}! Today's summary: ${stats.attendance}% attendance achieved, ${stats.completed} tasks completed.`
  }
};

export function getTimeOfDay() {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

export function generateGreeting(role, name, stats = {}) {
  const timeOfDay = getTimeOfDay();
  const templates = DAILY_GREETING_TEMPLATES[role === 'employee' || role === 'manager' ? 'employee' : 'admin'];
  
  if (role === 'employee' || role === 'manager') {
    return templates[timeOfDay](name, stats.pendingTasks || 0);
  } else {
    return templates[timeOfDay](name, {
      attendance: stats.attendanceRate || 0,
      present: stats.presentToday || 0,
      leaves: stats.pendingLeaves || 0,
      tasks: stats.pendingTasks || 0,
      completed: stats.completedTasks || 0
    });
  }
}


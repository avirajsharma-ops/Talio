const mongoose = require('mongoose');
require('dotenv').config({ path: '.env' });
const jwt = require('jsonwebtoken');

async function testAnalyze() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Find a user to create a token for
    const user = await mongoose.connection.db.collection('users').findOne({ role: { $in: ['admin', 'god_admin'] } });
    if (!user) {
      console.log('No admin user found');
      process.exit(1);
    }
    console.log('Using user:', user.email);
    
    // Create a JWT token
    const token = jwt.sign(
      { userId: user._id.toString(), email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    // Find a session with screenshots
    const session = await mongoose.connection.db.collection('productivitysessions').findOne(
      { 'screenshots.0': { $exists: true } },
      { sort: { createdAt: -1 } }
    );
    
    if (!session) {
      console.log('No session with screenshots found');
      process.exit(1);
    }
    console.log('Found session:', session._id.toString());
    console.log('Screenshots:', session.screenshots?.length);
    console.log('Apps:', session.topApps?.length || 0);
    console.log('Websites:', session.topWebsites?.length || 0);
    
    // Call the analyze API
    console.log('\n🔍 Starting comprehensive analysis (analyzing ALL screenshots one by one)...\n');
    const startTime = Date.now();
    
    const response = await fetch('http://localhost:3000/api/productivity/sessions/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ sessionId: session._id.toString() })
    });
    
    const data = await response.json();
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    
    console.log(`\n✅ Analysis complete in ${duration}s\n`);
    console.log('='.repeat(60));
    console.log('COMPREHENSIVE ANALYSIS RESULT');
    console.log('='.repeat(60));
    
    if (data.success) {
      const a = data.analysis;
      console.log('\n📊 SCORES:');
      console.log(`   Productivity: ${a.productivityScore}%`);
      console.log(`   Focus: ${a.focusScore}%`);
      console.log(`   Efficiency: ${a.efficiencyScore}%`);
      
      console.log('\n📝 SUMMARY:');
      console.log(`   ${a.summary}`);
      
      if (a.workActivities?.length) {
        console.log('\n🎯 WORK ACTIVITIES:');
        a.workActivities.forEach(w => console.log(`   • ${w}`));
      }
      
      if (a.insights?.length) {
        console.log('\n💡 INSIGHTS:');
        a.insights.forEach(i => console.log(`   • ${i}`));
      }
      
      if (a.recommendations?.length) {
        console.log('\n📌 RECOMMENDATIONS:');
        a.recommendations.forEach(r => console.log(`   • ${r}`));
      }
      
      if (a.screenshotAnalysis?.length) {
        console.log('\n📸 SCREENSHOT-BY-SCREENSHOT ANALYSIS:');
        a.screenshotAnalysis.forEach(s => {
          console.log(`   [${s.time}] ${s.description}`);
        });
      }
      
      if (a.topAchievements?.length) {
        console.log('\n🏆 ACHIEVEMENTS:');
        a.topAchievements.forEach(t => console.log(`   • ${t}`));
      }
      
      if (a.areasOfImprovement?.length) {
        console.log('\n⚠️  AREAS TO IMPROVE:');
        a.areasOfImprovement.forEach(i => console.log(`   • ${i}`));
      }
    } else {
      console.log('Error:', data.error);
    }
    
    console.log('\n' + '='.repeat(60));
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

testAnalyze();

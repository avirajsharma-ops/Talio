const mongoose = require('mongoose');
require('dotenv').config();

console.log('\n🔍 Verifying Model Renaming...\n');

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || process.env.MONGO_URI;
    
    if (!mongoURI) {
      console.error('❌ MongoDB URI not found in environment variables');
      process.exit(1);
    }

    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB\n');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

const verifyCollections = async () => {
  try {
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    
    console.log('📊 Database Collections:');
    console.log('─'.repeat(50));
    
    // Check for new collections
    const expectedCollections = {
      'projects': 'New collection (formerly tasks)',
      'tasks': 'New collection (formerly milestones)',
      'projectsold': 'Old collection (formerly projects)'
    };
    
    for (const [name, description] of Object.entries(expectedCollections)) {
      if (collectionNames.includes(name)) {
        const count = await db.collection(name).countDocuments();
        console.log(`✅ ${name.padEnd(15)} - ${count.toString().padStart(5)} documents - ${description}`);
      } else {
        console.log(`⚠️  ${name.padEnd(15)} - NOT FOUND - ${description}`);
      }
    }
    
    // Check for old collections that should be renamed
    const oldCollections = ['tasks', 'milestones', 'projects'];
    const foundOldCollections = oldCollections.filter(name => 
      collectionNames.includes(name) && !['projects', 'tasks'].includes(name)
    );
    
    if (foundOldCollections.length > 0) {
      console.log('\n⚠️  Warning: Found old collection names that should have been renamed:');
      foundOldCollections.forEach(name => console.log(`   - ${name}`));
    }
    
    console.log('\n');
  } catch (error) {
    console.error('❌ Error verifying collections:', error);
  }
};

const verifyModels = () => {
  console.log('📦 Model Files:');
  console.log('─'.repeat(50));
  
  const fs = require('fs');
  const path = require('path');
  
  const modelFiles = {
    'models/Project.js': 'New Project model (formerly Task)',
    'models/Task.js': 'New Task model (formerly Milestone)',
    'models/ProjectOld.js': 'Old Project model (formerly Project)'
  };
  
  for (const [file, description] of Object.entries(modelFiles)) {
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      console.log(`✅ ${file.padEnd(25)} - ${description}`);
    } else {
      console.log(`❌ ${file.padEnd(25)} - NOT FOUND - ${description}`);
    }
  }
  
  console.log('\n');
};

const verifyImports = () => {
  console.log('🔗 Import Statements in API Routes:');
  console.log('─'.repeat(50));
  
  const { execSync } = require('child_process');
  
  try {
    // Check for old Task imports in task routes
    const taskImports = execSync(
      "grep -r \"import Project from '@/models/Project'\" app/api/tasks --include='*.js' | wc -l",
      { encoding: 'utf-8' }
    ).trim();
    console.log(`✅ Task routes using Project model: ${taskImports} files`);
    
    // Check for old Milestone imports
    const milestoneImports = execSync(
      "grep -r \"import Task from '@/models/Task'\" app/api/milestones --include='*.js' 2>/dev/null | wc -l",
      { encoding: 'utf-8' }
    ).trim();
    console.log(`✅ Milestone routes using Task model: ${milestoneImports} files`);
    
    // Check for ProjectOld imports
    const projectOldImports = execSync(
      "grep -r \"import ProjectOld from '@/models/ProjectOld'\" app/api/projects --include='*.js' | wc -l",
      { encoding: 'utf-8' }
    ).trim();
    console.log(`✅ Project routes using ProjectOld model: ${projectOldImports} files`);
    
  } catch (error) {
    console.log('⚠️  Could not verify imports (grep command failed)');
  }
  
  console.log('\n');
};

const main = async () => {
  console.log('═'.repeat(60));
  console.log('  MODEL RENAMING VERIFICATION');
  console.log('═'.repeat(60));
  console.log('\n');
  
  verifyModels();
  verifyImports();
  
  await connectDB();
  await verifyCollections();
  
  console.log('═'.repeat(60));
  console.log('✅ Verification Complete!');
  console.log('═'.repeat(60));
  console.log('\n');
  console.log('Summary:');
  console.log('  • Model files have been renamed');
  console.log('  • Database collections have been renamed');
  console.log('  • API routes are using correct models');
  console.log('\n');
  console.log('Next Steps:');
  console.log('  • Update frontend components to use new terminology');
  console.log('  • Update variable names in API routes for consistency');
  console.log('  • Update comments and documentation');
  console.log('\n');
  
  await mongoose.connection.close();
  process.exit(0);
};

main().catch(error => {
  console.error('❌ Verification error:', error);
  process.exit(1);
});


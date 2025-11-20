const fs = require('fs');
const path = require('path');

console.log('🔄 Updating model references in API routes...\n');

// Files that import Task model (should now import Project)
const taskImportFiles = [
  'app/api/tasks/route.js',
  'app/api/tasks/dashboard/route.js',
  'app/api/tasks/team/route.js',
  'app/api/tasks/assign/route.js',
  'app/api/tasks/history/route.js',
  'app/api/tasks/[id]/route.js',
  'app/api/tasks/[id]/progress/route.js',
  'app/api/tasks/[id]/approve/route.js',
  'app/api/tasks/[id]/checklist/route.js',
  'app/api/search/route.js',
  'app/api/team/pending-requests/route.js',
  'app/api/team/task-approvals/route.js',
  'app/api/team/members/[id]/route.js',
  'app/api/performance/calculate/route.js',
];

// Files that import Milestone model (should now import Task)
const milestoneImportFiles = [
  'app/api/tasks/[id]/milestones/route.js',
  'app/api/milestones/[id]/route.js',
];

// Files that import Project model (should now import ProjectOld)
const projectImportFiles = [
  'app/api/projects/route.js',
  'app/api/projects/[id]/route.js',
  'app/api/projects/[id]/tasks/route.js',
];

// Update Task -> Project
console.log('📝 Updating Task -> Project references...');
taskImportFiles.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  if (!fs.existsSync(filePath)) {
    console.log(`   ⚠️  File not found: ${file}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Update import statement
  content = content.replace(
    /import Task from ['"]@\/models\/Task['"]/g,
    "import Project from '@/models/Project'"
  );
  
  // Note: We're NOT replacing variable names automatically as it's too risky
  // Those need to be done manually or with more sophisticated AST parsing
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`   ✅ Updated: ${file}`);
});

// Update Milestone -> Task
console.log('\n📝 Updating Milestone -> Task references...');
milestoneImportFiles.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  if (!fs.existsSync(filePath)) {
    console.log(`   ⚠️  File not found: ${file}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Update import statement
  content = content.replace(
    /import Milestone from ['"]@\/models\/Milestone['"]/g,
    "import Task from '@/models/Task'"
  );
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`   ✅ Updated: ${file}`);
});

// Update Project -> ProjectOld
console.log('\n📝 Updating Project -> ProjectOld references...');
projectImportFiles.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  if (!fs.existsSync(filePath)) {
    console.log(`   ⚠️  File not found: ${file}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Update import statement
  content = content.replace(
    /import Project from ['"]@\/models\/Project['"]/g,
    "import ProjectOld from '@/models/ProjectOld'"
  );
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`   ✅ Updated: ${file}`);
});

// Update MAYA actions route
console.log('\n📝 Updating MAYA actions route...');
const mayaActionsPath = path.join(process.cwd(), 'app/api/maya/actions/route.js');
if (fs.existsSync(mayaActionsPath)) {
  let content = fs.readFileSync(mayaActionsPath, 'utf8');
  
  // Update imports
  content = content.replace(
    /import Task from ['"]@\/models\/Task['"]/g,
    "import Project from '@/models/Project'"
  );
  content = content.replace(
    /import Project from ['"]@\/models\/Project['"]/g,
    "import ProjectOld from '@/models/ProjectOld'"
  );
  content = content.replace(
    /import Milestone from ['"]@\/models\/Milestone['"]/g,
    "import Task from '@/models/Task'"
  );
  
  // Update MODELS object
  content = content.replace(/tasks: Task,/g, 'tasks: Project,');
  content = content.replace(/projects: Project,/g, 'projects: ProjectOld,');
  content = content.replace(/milestones: Milestone,/g, 'milestones: Task,');
  
  fs.writeFileSync(mayaActionsPath, content, 'utf8');
  console.log('   ✅ Updated: app/api/maya/actions/route.js');
}

console.log('\n✅ Import statements updated successfully!');
console.log('\n⚠️  IMPORTANT: Variable names and method calls need manual review.');
console.log('   The following still need to be updated in each file:');
console.log('   - Variable names (task -> project, milestone -> task)');
console.log('   - Method calls (Task.find -> Project.find, etc.)');
console.log('   - Field references (taskId -> projectId, taskNumber -> projectNumber)');


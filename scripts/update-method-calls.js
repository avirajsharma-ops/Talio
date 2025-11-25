const fs = require('fs');
const path = require('path');

console.log('🔄 Updating method calls and variable names...\n');

// Files that use Task model (should now use Project)
const taskFiles = [
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

// Files that use Milestone model (should now use Task)
const milestoneFiles = [
  'app/api/tasks/[id]/milestones/route.js',
  'app/api/milestones/[id]/route.js',
];

// Files that use Project model (should now use ProjectOld)
const projectFiles = [
  'app/api/projects/route.js',
  'app/api/projects/[id]/route.js',
  'app/api/projects/[id]/tasks/route.js',
];

// Update Task -> Project method calls
console.log('📝 Updating Task -> Project method calls...');
taskFiles.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  if (!fs.existsSync(filePath)) {
    console.log(`   ⚠️  File not found: ${file}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Update method calls
  content = content.replace(/\bTask\./g, 'Project.');
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`   ✅ Updated: ${file}`);
});

// Update Milestone -> Task method calls
console.log('\n📝 Updating Milestone -> Task method calls...');
milestoneFiles.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  if (!fs.existsSync(filePath)) {
    console.log(`   ⚠️  File not found: ${file}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Update method calls
  content = content.replace(/\bMilestone\./g, 'Task.');
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`   ✅ Updated: ${file}`);
});

// Update Project -> ProjectOld method calls
console.log('\n📝 Updating Project -> ProjectOld method calls...');
projectFiles.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  if (!fs.existsSync(filePath)) {
    console.log(`   ⚠️  File not found: ${file}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Update method calls - be careful not to replace Project in import statements
  content = content.replace(/\bProject\.find/g, 'ProjectOld.find');
  content = content.replace(/\bProject\.create/g, 'ProjectOld.create');
  content = content.replace(/\bProject\.updateOne/g, 'ProjectOld.updateOne');
  content = content.replace(/\bProject\.deleteOne/g, 'ProjectOld.deleteOne');
  content = content.replace(/\bProject\.countDocuments/g, 'ProjectOld.countDocuments');
  content = content.replace(/\bProject\.aggregate/g, 'ProjectOld.aggregate');
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`   ✅ Updated: ${file}`);
});

console.log('\n✅ Method calls updated successfully!');
console.log('\n⚠️  NOTE: Variable names still need manual review in complex files.');
console.log('   Consider using find-and-replace in your IDE for:');
console.log('   - const task = -> const project =');
console.log('   - const tasks = -> const projects =');
console.log('   - const milestone = -> const task =');
console.log('   - const milestones = -> const tasks =');
console.log('   - taskId -> projectId');
console.log('   - taskNumber -> projectNumber');
console.log('   - milestoneId -> taskId');


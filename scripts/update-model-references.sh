#!/bin/bash

# Script to update model references after renaming
# Old Task -> New Project
# Old Milestone -> New Task
# Old Project -> ProjectOld

echo "🔄 Updating model references in codebase..."
echo ""

# Update API routes in app/api/tasks (these work with Projects now)
echo "📁 Updating app/api/tasks routes..."
find app/api/tasks -name "*.js" -type f -exec sed -i '' \
  -e "s/import Task from '@\/models\/Task'/import Project from '@\/models\/Project'/g" \
  -e "s/from '@\/models\/Task'/from '@\/models\/Project'/g" \
  -e "s/Task\.find/Project.find/g" \
  -e "s/Task\.findOne/Project.findOne/g" \
  -e "s/Task\.findById/Project.findById/g" \
  -e "s/Task\.create/Project.create/g" \
  -e "s/Task\.updateOne/Project.updateOne/g" \
  -e "s/Task\.deleteOne/Project.deleteOne/g" \
  -e "s/Task\.countDocuments/Project.countDocuments/g" \
  -e "s/Task\.aggregate/Project.aggregate/g" \
  -e "s/const task = /const project = /g" \
  -e "s/const tasks = /const projects = /g" \
  -e "s/task\./project./g" \
  -e "s/tasks\./projects./g" \
  -e "s/taskId/projectId/g" \
  -e "s/taskNumber/projectNumber/g" \
  {} +

# Update API routes in app/api/milestones (these work with Tasks now)
echo "📁 Updating app/api/milestones routes..."
find app/api/milestones -name "*.js" -type f -exec sed -i '' \
  -e "s/import Milestone from '@\/models\/Milestone'/import Task from '@\/models\/Task'/g" \
  -e "s/from '@\/models\/Milestone'/from '@\/models\/Task'/g" \
  -e "s/Milestone\.find/Task.find/g" \
  -e "s/Milestone\.findOne/Task.findOne/g" \
  -e "s/Milestone\.findById/Task.findById/g" \
  -e "s/Milestone\.create/Task.create/g" \
  -e "s/Milestone\.updateOne/Task.updateOne/g" \
  -e "s/Milestone\.deleteOne/Task.deleteOne/g" \
  -e "s/const milestone = /const task = /g" \
  -e "s/const milestones = /const tasks = /g" \
  -e "s/milestone\./task./g" \
  -e "s/milestones\./tasks./g" \
  -e "s/milestoneId/taskId/g" \
  {} +

# Update API routes in app/api/projects (these work with ProjectOld now)
echo "📁 Updating app/api/projects routes..."
find app/api/projects -name "*.js" -type f -exec sed -i '' \
  -e "s/import Project from '@\/models\/Project'/import ProjectOld from '@\/models\/ProjectOld'/g" \
  -e "s/from '@\/models\/Project'/from '@\/models\/ProjectOld'/g" \
  -e "s/Project\.find/ProjectOld.find/g" \
  -e "s/Project\.findOne/ProjectOld.findOne/g" \
  -e "s/Project\.findById/ProjectOld.findById/g" \
  -e "s/Project\.create/ProjectOld.create/g" \
  -e "s/Project\.updateOne/ProjectOld.updateOne/g" \
  -e "s/Project\.deleteOne/ProjectOld.deleteOne/g" \
  {} +

# Update MAYA actions route
echo "📁 Updating MAYA actions route..."
sed -i '' \
  -e "s/tasks: Task,/tasks: Project,/g" \
  -e "s/projects: Project,/projects: ProjectOld,/g" \
  -e "s/milestones: Milestone,/milestones: Task,/g" \
  app/api/maya/actions/route.js

echo ""
echo "✅ Model references updated successfully!"
echo ""
echo "⚠️  Note: You may need to manually review and update:"
echo "   - Frontend components"
echo "   - Variable names in complex logic"
echo "   - Comments and documentation"


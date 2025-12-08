/**
 * Script to clean all project-related data from the database
 * This will delete:
 * - All projects
 * - All tasks
 * - All project members
 * - All project timeline events
 * - All project notes
 * - All project-related approval requests
 */

const mongoose = require('mongoose')

async function cleanProjectsDatabase() {
  try {
    console.log('🗑️  Starting project database cleanup...\n')

    // Load environment variables
    require('dotenv').config()

    // Connect to MongoDB
    const MONGODB_URI = process.env.MONGODB_URI
    if (!MONGODB_URI) {
      throw new Error('MONGODB_URI not found in environment variables')
    }

    await mongoose.connect(MONGODB_URI)
    console.log('✅ Connected to MongoDB\n')

    // Define models directly in the script
    const Project = mongoose.models.Project || mongoose.model('Project', new mongoose.Schema({}, { strict: false }), 'projects')
    const Task = mongoose.models.Task || mongoose.model('Task', new mongoose.Schema({}, { strict: false }), 'tasks')
    const ProjectMember = mongoose.models.ProjectMember || mongoose.model('ProjectMember', new mongoose.Schema({}, { strict: false }), 'projectmembers')
    const ProjectTimelineEvent = mongoose.models.ProjectTimelineEvent || mongoose.model('ProjectTimelineEvent', new mongoose.Schema({}, { strict: false }), 'projecttimelineevents')
    const ProjectNote = mongoose.models.ProjectNote || mongoose.model('ProjectNote', new mongoose.Schema({}, { strict: false }), 'projectnotes')
    const ProjectApprovalRequest = mongoose.models.ProjectApprovalRequest || mongoose.model('ProjectApprovalRequest', new mongoose.Schema({}, { strict: false }), 'projectapprovalrequests')
    const TaskAssignee = mongoose.models.TaskAssignee || mongoose.model('TaskAssignee', new mongoose.Schema({}, { strict: false }), 'taskassignees')

    // Count before deletion
    const projectCount = await Project.countDocuments()
    const taskCount = await Task.countDocuments()
    const memberCount = await ProjectMember.countDocuments()
    const timelineCount = await ProjectTimelineEvent.countDocuments()
    const noteCount = await ProjectNote.countDocuments()
    const taskAssigneeCount = await TaskAssignee.countDocuments()
    const approvalCount = await ProjectApprovalRequest.countDocuments({ 
      type: { $in: ['task_deletion', 'project_completion', 'task_completion'] } 
    })

    console.log('📊 Current counts:')
    console.log(`   Projects: ${projectCount}`)
    console.log(`   Tasks: ${taskCount}`)
    console.log(`   Task Assignees: ${taskAssigneeCount}`)
    console.log(`   Project Members: ${memberCount}`)
    console.log(`   Timeline Events: ${timelineCount}`)
    console.log(`   Project Notes: ${noteCount}`)
    console.log(`   Project Approval Requests: ${approvalCount}`)
    console.log('')

    // Confirm deletion
    console.log('⚠️  WARNING: This will permanently delete all project-related data!')
    console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...\n')
    
    await new Promise(resolve => setTimeout(resolve, 5000))

    console.log('🧹 Deleting data...\n')

    // Delete in order of dependencies
    const taskAssigneeResult = await TaskAssignee.deleteMany({})
    console.log(`✅ Deleted ${taskAssigneeResult.deletedCount} task assignees`)

    const taskResult = await Task.deleteMany({})
    console.log(`✅ Deleted ${taskResult.deletedCount} tasks`)

    const memberResult = await ProjectMember.deleteMany({})
    console.log(`✅ Deleted ${memberResult.deletedCount} project members`)

    const timelineResult = await ProjectTimelineEvent.deleteMany({})
    console.log(`✅ Deleted ${timelineResult.deletedCount} timeline events`)

    const noteResult = await ProjectNote.deleteMany({})
    console.log(`✅ Deleted ${noteResult.deletedCount} project notes`)

    const approvalResult = await ProjectApprovalRequest.deleteMany({ 
      type: { $in: ['task_deletion', 'project_completion', 'task_completion'] } 
    })
    console.log(`✅ Deleted ${approvalResult.deletedCount} project-related approval requests`)

    const projectResult = await Project.deleteMany({})
    console.log(`✅ Deleted ${projectResult.deletedCount} projects`)

    console.log('\n✨ Project database cleanup complete!')
    console.log('\n📊 Summary:')
    console.log(`   Total items deleted: ${
      taskAssigneeResult.deletedCount +
      taskResult.deletedCount +
      memberResult.deletedCount +
      timelineResult.deletedCount +
      noteResult.deletedCount +
      approvalResult.deletedCount +
      projectResult.deletedCount
    }`)

    await mongoose.connection.close()
    console.log('\n✅ Database connection closed')
    process.exit(0)
  } catch (error) {
    console.error('❌ Error cleaning database:', error)
    await mongoose.connection.close()
    process.exit(1)
  }
}

// Run cleanup
cleanProjectsDatabase()

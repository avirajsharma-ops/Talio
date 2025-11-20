/**
 * Script to drop all project management data and tasks history
 * This will delete all data from:
 * - Projects
 * - Tasks
 * - Milestones
 * 
 * WARNING: This action is irreversible!
 */

const mongoose = require('mongoose')
const readline = require('readline')

// Load environment variables
require('dotenv').config()

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

// MongoDB connection
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || process.env.MONGO_URI
    
    if (!mongoURI) {
      console.error('❌ MongoDB URI not found in environment variables')
      process.exit(1)
    }

    await mongoose.connect(mongoURI)
    console.log('✅ Connected to MongoDB')
  } catch (error) {
    console.error('❌ MongoDB connection error:', error)
    process.exit(1)
  }
}

// Function to get collection stats
const getCollectionStats = async () => {
  try {
    const db = mongoose.connection.db
    
    const projectsCount = await db.collection('projects').countDocuments()
    const tasksCount = await db.collection('tasks').countDocuments()
    const milestonesCount = await db.collection('milestones').countDocuments()
    
    return {
      projects: projectsCount,
      tasks: tasksCount,
      milestones: milestonesCount,
      total: projectsCount + tasksCount + milestonesCount
    }
  } catch (error) {
    console.error('❌ Error getting collection stats:', error)
    return null
  }
}

// Function to drop all project management data
const dropProjectManagementData = async () => {
  try {
    const db = mongoose.connection.db
    
    console.log('\n🗑️  Dropping project management data...\n')
    
    // Drop Projects
    console.log('📦 Dropping Projects collection...')
    const projectsResult = await db.collection('projects').deleteMany({})
    console.log(`   ✅ Deleted ${projectsResult.deletedCount} projects`)
    
    // Drop Tasks
    console.log('📋 Dropping Tasks collection...')
    const tasksResult = await db.collection('tasks').deleteMany({})
    console.log(`   ✅ Deleted ${tasksResult.deletedCount} tasks`)
    
    // Drop Milestones
    console.log('🎯 Dropping Milestones collection...')
    const milestonesResult = await db.collection('milestones').deleteMany({})
    console.log(`   ✅ Deleted ${milestonesResult.deletedCount} milestones`)
    
    console.log('\n✅ All project management data has been deleted successfully!\n')
    
    return {
      projects: projectsResult.deletedCount,
      tasks: tasksResult.deletedCount,
      milestones: milestonesResult.deletedCount,
      total: projectsResult.deletedCount + tasksResult.deletedCount + milestonesResult.deletedCount
    }
  } catch (error) {
    console.error('❌ Error dropping project management data:', error)
    throw error
  }
}

// Main function
const main = async () => {
  console.log('\n' + '='.repeat(60))
  console.log('🗑️  DROP PROJECT MANAGEMENT DATA SCRIPT')
  console.log('='.repeat(60) + '\n')
  
  await connectDB()
  
  // Get current stats
  console.log('📊 Current database statistics:\n')
  const stats = await getCollectionStats()
  
  if (!stats) {
    console.error('❌ Failed to get collection statistics')
    process.exit(1)
  }
  
  console.log(`   Projects:   ${stats.projects}`)
  console.log(`   Tasks:      ${stats.tasks}`)
  console.log(`   Milestones: ${stats.milestones}`)
  console.log(`   ─────────────────────────`)
  console.log(`   Total:      ${stats.total}\n`)
  
  if (stats.total === 0) {
    console.log('ℹ️  No project management data found. Nothing to delete.')
    await mongoose.connection.close()
    process.exit(0)
  }
  
  // Ask for confirmation
  rl.question('⚠️  WARNING: This will permanently delete ALL project management data!\n   Type "DELETE ALL" to confirm: ', async (answer) => {
    if (answer === 'DELETE ALL') {
      try {
        const result = await dropProjectManagementData()
        
        console.log('📊 Deletion Summary:')
        console.log(`   Projects deleted:   ${result.projects}`)
        console.log(`   Tasks deleted:      ${result.tasks}`)
        console.log(`   Milestones deleted: ${result.milestones}`)
        console.log(`   ─────────────────────────────`)
        console.log(`   Total deleted:      ${result.total}\n`)
        
        console.log('✅ Operation completed successfully!')
      } catch (error) {
        console.error('❌ Operation failed:', error)
      }
    } else {
      console.log('\n❌ Operation cancelled. No data was deleted.')
    }
    
    await mongoose.connection.close()
    rl.close()
    process.exit(0)
  })
}

// Run the script
main().catch(error => {
  console.error('❌ Script error:', error)
  process.exit(1)
})


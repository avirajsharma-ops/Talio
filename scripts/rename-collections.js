/**
 * Script to rename database collections
 * - tasks collection -> projects collection
 * - milestones collection -> tasks collection
 * 
 * WARNING: This action modifies the database structure!
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
    
    const collections = await db.listCollections().toArray()
    const collectionNames = collections.map(c => c.name)
    
    const stats = {}
    
    if (collectionNames.includes('tasks')) {
      stats.tasks = await db.collection('tasks').countDocuments()
    } else {
      stats.tasks = 0
    }
    
    if (collectionNames.includes('milestones')) {
      stats.milestones = await db.collection('milestones').countDocuments()
    } else {
      stats.milestones = 0
    }
    
    if (collectionNames.includes('projects')) {
      stats.projects = await db.collection('projects').countDocuments()
    } else {
      stats.projects = 0
    }
    
    return stats
  } catch (error) {
    console.error('❌ Error getting collection stats:', error)
    return null
  }
}

// Function to rename collections
const renameCollections = async () => {
  try {
    const db = mongoose.connection.db
    
    console.log('\n🔄 Renaming collections...\n')
    
    // Step 1: Rename existing 'projects' to 'projectsold' (if exists)
    const collections = await db.listCollections().toArray()
    const collectionNames = collections.map(c => c.name)
    
    if (collectionNames.includes('projects')) {
      console.log('📦 Renaming existing "projects" collection to "projectsold"...')
      await db.collection('projects').rename('projectsold')
      console.log('   ✅ Renamed projects -> projectsold')
    }
    
    // Step 2: Rename 'tasks' to 'projects'
    if (collectionNames.includes('tasks')) {
      console.log('📦 Renaming "tasks" collection to "projects"...')
      await db.collection('tasks').rename('projects')
      console.log('   ✅ Renamed tasks -> projects')
    } else {
      console.log('   ⚠️  "tasks" collection not found, skipping')
    }
    
    // Step 3: Rename 'milestones' to 'tasks'
    if (collectionNames.includes('milestones')) {
      console.log('📋 Renaming "milestones" collection to "tasks"...')
      await db.collection('milestones').rename('tasks')
      console.log('   ✅ Renamed milestones -> tasks')
    } else {
      console.log('   ⚠️  "milestones" collection not found, skipping')
    }
    
    console.log('\n✅ Collection renaming completed successfully!\n')
    
    return true
  } catch (error) {
    console.error('❌ Error renaming collections:', error)
    throw error
  }
}

// Main function
const main = async () => {
  console.log('\n' + '='.repeat(60))
  console.log('🔄 RENAME DATABASE COLLECTIONS SCRIPT')
  console.log('='.repeat(60) + '\n')
  
  await connectDB()
  
  // Get current stats
  console.log('📊 Current database statistics:\n')
  const stats = await getCollectionStats()
  
  if (!stats) {
    console.error('❌ Failed to get collection statistics')
    process.exit(1)
  }
  
  console.log(`   tasks collection:      ${stats.tasks} documents`)
  console.log(`   milestones collection: ${stats.milestones} documents`)
  console.log(`   projects collection:   ${stats.projects} documents\n`)
  
  console.log('📝 This script will:')
  console.log('   1. Rename "projects" -> "projectsold" (if exists)')
  console.log('   2. Rename "tasks" -> "projects"')
  console.log('   3. Rename "milestones" -> "tasks"\n')
  
  // Ask for confirmation
  rl.question('⚠️  Type "RENAME" to confirm: ', async (answer) => {
    if (answer === 'RENAME') {
      try {
        await renameCollections()
        console.log('✅ Operation completed successfully!')
      } catch (error) {
        console.error('❌ Operation failed:', error)
      }
    } else {
      console.log('\n❌ Operation cancelled.')
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


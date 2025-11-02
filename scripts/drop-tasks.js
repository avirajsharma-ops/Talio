/**
 * Script to drop all tasks from the database
 * Run with: node scripts/drop-tasks.js
 */

const mongoose = require('mongoose')
require('dotenv').config({ path: '.env.local' })

const MONGODB_URI = process.env.MONGODB_URI

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not defined in environment variables')
  process.exit(1)
}

async function dropAllTasks() {
  try {
    console.log('🔌 Connecting to MongoDB...')
    await mongoose.connect(MONGODB_URI)
    console.log('✅ Connected to MongoDB')

    const db = mongoose.connection.db
    
    // Drop tasks collection
    console.log('🗑️  Dropping tasks collection...')
    try {
      await db.collection('tasks').drop()
      console.log('✅ Tasks collection dropped successfully')
    } catch (error) {
      if (error.message.includes('ns not found')) {
        console.log('ℹ️  Tasks collection does not exist')
      } else {
        throw error
      }
    }

    // Drop milestones collection (related to tasks)
    console.log('🗑️  Dropping milestones collection...')
    try {
      await db.collection('milestones').drop()
      console.log('✅ Milestones collection dropped successfully')
    } catch (error) {
      if (error.message.includes('ns not found')) {
        console.log('ℹ️  Milestones collection does not exist')
      } else {
        throw error
      }
    }

    // Drop taskhistories collection (task history)
    console.log('🗑️  Dropping taskhistories collection...')
    try {
      await db.collection('taskhistories').drop()
      console.log('✅ Task histories collection dropped successfully')
    } catch (error) {
      if (error.message.includes('ns not found')) {
        console.log('ℹ️  Task histories collection does not exist')
      } else {
        throw error
      }
    }

    console.log('\n✅ All tasks, milestones, and task histories have been removed from the database')
    console.log('You can now start with fresh task data')

  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  } finally {
    await mongoose.connection.close()
    console.log('🔌 Database connection closed')
    process.exit(0)
  }
}

dropAllTasks()


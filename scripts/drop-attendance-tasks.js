import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import readline from 'readline'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') })

const MONGODB_URI = process.env.MONGODB_URI

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local')
}

// Create readline interface for user confirmation
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer)
    })
  })
}

async function dropCollections() {
  try {
    console.log('🔌 Connecting to MongoDB...')
    await mongoose.connect(MONGODB_URI)
    console.log('✅ Connected to MongoDB')

    // Get list of all collections
    const collections = await mongoose.connection.db.listCollections().toArray()
    const collectionNames = collections.map(c => c.name)

    console.log('\n📦 Available Collections:')
    collectionNames.forEach((name, i) => {
      console.log(`   ${i + 1}. ${name}`)
    })

    // Check which collections exist
    const attendanceExists = collectionNames.includes('attendances')
    const tasksExists = collectionNames.includes('tasks')
    const milestonesExists = collectionNames.includes('milestones')
    const activitiesExists = collectionNames.includes('activities')

    console.log('\n⚠️  WARNING: This will permanently delete the following collections:')
    if (attendanceExists) console.log('   ❌ attendances')
    if (tasksExists) console.log('   ❌ tasks')
    if (milestonesExists) console.log('   ❌ milestones (related to tasks)')
    if (activitiesExists) console.log('   ❌ activities (activity logs)')

    if (!attendanceExists && !tasksExists && !milestonesExists && !activitiesExists) {
      console.log('\n✅ No collections to drop. All specified collections are already empty.')
      rl.close()
      await mongoose.connection.close()
      process.exit(0)
    }

    // Get counts before deletion
    let attendanceCount = 0
    let tasksCount = 0
    let milestonesCount = 0
    let activitiesCount = 0

    if (attendanceExists) {
      attendanceCount = await mongoose.connection.db.collection('attendances').countDocuments()
      console.log(`\n   📊 Attendance records: ${attendanceCount}`)
    }
    if (tasksExists) {
      tasksCount = await mongoose.connection.db.collection('tasks').countDocuments()
      console.log(`   📊 Task records: ${tasksCount}`)
    }
    if (milestonesExists) {
      milestonesCount = await mongoose.connection.db.collection('milestones').countDocuments()
      console.log(`   📊 Milestone records: ${milestonesCount}`)
    }
    if (activitiesExists) {
      activitiesCount = await mongoose.connection.db.collection('activities').countDocuments()
      console.log(`   📊 Activity records: ${activitiesCount}`)
    }

    console.log('\n⚠️  This action CANNOT be undone!')
    const answer = await askQuestion('\n❓ Are you sure you want to proceed? (yes/no): ')

    if (answer.toLowerCase() !== 'yes') {
      console.log('\n❌ Operation cancelled by user')
      rl.close()
      await mongoose.connection.close()
      process.exit(0)
    }

    console.log('\n🗑️  Dropping collections...\n')

    let droppedCount = 0

    // Drop attendances collection
    if (attendanceExists) {
      await mongoose.connection.db.collection('attendances').drop()
      console.log(`✅ Dropped 'attendances' collection (${attendanceCount} records deleted)`)
      droppedCount++
    }

    // Drop tasks collection
    if (tasksExists) {
      await mongoose.connection.db.collection('tasks').drop()
      console.log(`✅ Dropped 'tasks' collection (${tasksCount} records deleted)`)
      droppedCount++
    }

    // Drop milestones collection
    if (milestonesExists) {
      await mongoose.connection.db.collection('milestones').drop()
      console.log(`✅ Dropped 'milestones' collection (${milestonesCount} records deleted)`)
      droppedCount++
    }

    // Drop activities collection
    if (activitiesExists) {
      await mongoose.connection.db.collection('activities').drop()
      console.log(`✅ Dropped 'activities' collection (${activitiesCount} records deleted)`)
      droppedCount++
    }

    console.log('\n' + '='.repeat(60))
    console.log('📈 Deletion Summary:')
    console.log(`   Total Collections Dropped: ${droppedCount}`)
    console.log(`   Total Records Deleted: ${attendanceCount + tasksCount + milestonesCount + activitiesCount}`)
    console.log('='.repeat(60))

    console.log('\n✨ Collections dropped successfully!')
    console.log('\n💡 Note: The collections will be recreated automatically when you:')
    console.log('   - Create a new task')
    console.log('   - Check in/out (attendance)')
    console.log('   - Perform any logged activity')
    
  } catch (error) {
    console.error('\n❌ Operation failed:', error)
    process.exit(1)
  } finally {
    rl.close()
    await mongoose.connection.close()
    console.log('\n🔌 Disconnected from MongoDB')
    process.exit(0)
  }
}

// Run the script
dropCollections()


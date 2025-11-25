import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') })

const MONGODB_URI = process.env.MONGODB_URI

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local')
}

// Define Activity Schema (same as in models/Activity.js)
const ActivitySchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: [
      'attendance_checkin',
      'attendance_checkout',
      'leave_apply',
      'leave_approve',
      'leave_reject',
      'task_create',
      'task_update',
      'task_complete',
      'task_review',
      'task_approve',
      'task_reject',
      'milestone_create',
      'milestone_complete',
      'profile_update',
      'password_change',
      'document_upload',
      'expense_submit',
      'travel_request',
      'goal_create',
      'goal_complete',
      'performance_review',
      'training_enroll',
      'training_complete',
      'project_join',
      'team_join',
      'comment_add',
      'file_upload',
      'other'
    ],
    required: true,
    index: true
  },
  action: {
    type: String,
    required: true
  },
  details: {
    type: String
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
  },
  relatedModel: {
    type: String,
    enum: ['Task', 'Leave', 'Attendance', 'Expense', 'Travel', 'Goal', 'Performance', 'Training', 'Project', 'Document', 'Employee', null]
  },
  relatedId: {
    type: mongoose.Schema.Types.ObjectId
  },
  ipAddress: String,
  userAgent: String
}, {
  timestamps: true
})

// Indexes for efficient querying
ActivitySchema.index({ employee: 1, createdAt: -1 })
ActivitySchema.index({ type: 1, createdAt: -1 })
ActivitySchema.index({ createdAt: -1 })

const Activity = mongoose.models.Activity || mongoose.model('Activity', ActivitySchema)

async function setupActivityCollection() {
  try {
    console.log('🔌 Connecting to MongoDB...')
    await mongoose.connect(MONGODB_URI)
    console.log('✅ Connected to MongoDB')

    // Check if Activity collection exists
    const collections = await mongoose.connection.db.listCollections({ name: 'activities' }).toArray()
    
    if (collections.length === 0) {
      console.log('\n📦 Creating Activity collection...')
      await Activity.createCollection()
      console.log('✅ Activity collection created')
    } else {
      console.log('\n✅ Activity collection already exists')
    }

    // Ensure indexes are created
    console.log('\n🔍 Creating indexes...')
    await Activity.createIndexes()
    console.log('✅ Indexes created successfully')

    // Get collection stats
    const stats = await mongoose.connection.db.collection('activities').stats()
    console.log('\n📊 Activity Collection Stats:')
    console.log(`   Total Documents: ${stats.count}`)
    console.log(`   Total Indexes: ${stats.nindexes}`)
    console.log(`   Storage Size: ${(stats.storageSize / 1024).toFixed(2)} KB`)

    // List all indexes
    const indexes = await mongoose.connection.db.collection('activities').indexes()
    console.log('\n📑 Indexes:')
    indexes.forEach((index, i) => {
      console.log(`   ${i + 1}. ${index.name}`)
    })

    console.log('\n✨ Activity collection setup completed successfully!')
    
  } catch (error) {
    console.error('❌ Setup failed:', error)
    process.exit(1)
  } finally {
    await mongoose.connection.close()
    console.log('\n🔌 Disconnected from MongoDB')
    process.exit(0)
  }
}

// Run setup
setupActivityCollection()


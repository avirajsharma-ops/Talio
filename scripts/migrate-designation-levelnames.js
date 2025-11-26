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

// Define Designation Schema
const DesignationSchema = new mongoose.Schema({
  title: String,
  code: String,
  description: String,
  level: Number,
  levelName: String,
  department: mongoose.Schema.Types.ObjectId,
  isActive: Boolean,
}, {
  timestamps: true,
})

const Designation = mongoose.models.Designation || mongoose.model('Designation', DesignationSchema)

// Level name mapping based on level number
const levelNameMap = {
  1: 'Entry',
  2: 'Junior',
  3: 'Mid',
  4: 'Senior',
  5: 'Lead',
  6: 'Manager',
  7: 'Director',
  8: 'Executive'
}

async function migrateLevelNames() {
  try {
    console.log('🔌 Connecting to MongoDB...')
    await mongoose.connect(MONGODB_URI)
    console.log('✅ Connected to MongoDB')

    // Get all designations
    const designations = await Designation.find({})
    console.log(`\n📊 Found ${designations.length} designations`)

    let updated = 0
    let skipped = 0

    for (const designation of designations) {
      // If levelName is already set, skip
      if (designation.levelName && designation.levelName.trim() !== '') {
        console.log(`⏭️  Skipping "${designation.title}" - levelName already set: "${designation.levelName}"`)
        skipped++
        continue
      }

      // Get level name from mapping
      const levelName = levelNameMap[designation.level] || 'Mid'
      
      // Update designation
      designation.levelName = levelName
      await designation.save()
      
      console.log(`✅ Updated "${designation.title}" - Level ${designation.level} → "${levelName}"`)
      updated++
    }

    console.log('\n' + '='.repeat(60))
    console.log('📈 Migration Summary:')
    console.log(`   Total Designations: ${designations.length}`)
    console.log(`   ✅ Updated: ${updated}`)
    console.log(`   ⏭️  Skipped: ${skipped}`)
    console.log('='.repeat(60))

    console.log('\n✨ Migration completed successfully!')
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  } finally {
    await mongoose.connection.close()
    console.log('\n🔌 Disconnected from MongoDB')
    process.exit(0)
  }
}

// Run migration
migrateLevelNames()


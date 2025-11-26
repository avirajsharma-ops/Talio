require('dotenv').config({ path: '.env.local' })
const mongoose = require('mongoose')

async function fixTaskNumberIndex() {
    try {
        console.log('Connecting to MongoDB...')
        await mongoose.connect(process.env.MONGODB_URI)
        console.log('Connected!')

        const db = mongoose.connection.db
        const collection = db.collection('projects')

        // Check existing indexes
        console.log('\nChecking existing indexes...')
        const indexes = await collection.indexes()
        console.log('Existing indexes:', indexes.map(idx => idx.name))

        // List of indexes to fix (make sparse)
        const indexesToFix = ['taskNumber_1', 'projectCode_1']

        for (const indexName of indexesToFix) {
            const hasIndex = indexes.some(idx => idx.name === indexName)
            if (hasIndex) {
                console.log(`\nDropping old ${indexName} index...`)
                await collection.dropIndex(indexName)
                console.log(`✅ Old ${indexName} index dropped!`)

                // Create new sparse unique index
                const fieldName = indexName.replace('_1', '')
                console.log(`Creating new sparse unique index on ${fieldName}...`)
                await collection.createIndex(
                    { [fieldName]: 1 },
                    {
                        unique: true,
                        sparse: true,
                        name: indexName
                    }
                )
                console.log(`✅ New sparse ${indexName} index created!`)
            }
        }

        // Update all documents with null taskNumber to have a generated value
        console.log('\nUpdating documents with null taskNumber or projectCode...')
        const nullDocs = await collection.find({
            $or: [
                { taskNumber: null },
                { taskNumber: { $exists: false } },
                { projectCode: null },
                { projectCode: { $exists: false } }
            ]
        }).toArray()

        console.log(`Found ${nullDocs.length} documents with null values`)

        let updated = 0
        for (const doc of nullDocs) {
            const updates = {}

            // Generate taskNumber from projectNumber if it exists, otherwise create new one
            if (!doc.taskNumber) {
                let taskNumber = doc.projectNumber

                if (!taskNumber) {
                    const year = new Date().getFullYear()
                    const month = String(new Date().getMonth() + 1).padStart(2, '0')
                    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
                    taskNumber = `PRJ${year}${month}${random}`
                }

                updates.taskNumber = taskNumber
                if (!doc.projectNumber) {
                    updates.projectNumber = taskNumber
                }
            }

            // projectCode is optional, don't auto-generate
            // Just unset it if it's null to avoid the unique constraint issue
            if (doc.projectCode === null) {
                await collection.updateOne(
                    { _id: doc._id },
                    { $unset: { projectCode: "" } }
                )
            }

            if (Object.keys(updates).length > 0) {
                await collection.updateOne(
                    { _id: doc._id },
                    { $set: updates }
                )
            }

            updated++
        }

        console.log(`✅ Updated ${updated} documents`)

        // Verify the fix
        console.log('\nVerifying indexes...')
        const finalIndexes = await collection.indexes()

        for (const indexName of indexesToFix) {
            const idx = finalIndexes.find(i => i.name === indexName)
            if (idx) {
                console.log(`${indexName}:`, idx)
            }
        }

        console.log('\n✅ Migration complete!')
        process.exit(0)

    } catch (error) {
        console.error('❌ Migration failed:', error)
        process.exit(1)
    }
}

fixTaskNumberIndex()

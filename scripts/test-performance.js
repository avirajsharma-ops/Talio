// Performance test script
// Run with: node scripts/test-performance.js

const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'your-mongodb-uri';

async function testPerformance() {
    console.log('🧪 Performance Testing Started\n');

    try {
        // Test 1: Connection Time
        console.log('Test 1: MongoDB Connection Speed');
        const connStart = Date.now();
        await mongoose.connect(MONGODB_URI, {
            maxPoolSize: 10,
            minPoolSize: 2,
            serverSelectionTimeoutMS: 10000,
            family: 4,
            compressors: ['zlib'],
        });
        const connTime = Date.now() - connStart;
        console.log(`✅ Connected in ${connTime}ms\n`);

        // Test 2: Check Indexes
        console.log('Test 2: Checking Database Indexes');
        const collections = await mongoose.connection.db.listCollections().toArray();

        for (const coll of collections) {
            const indexes = await mongoose.connection.db.collection(coll.name).indexes();
            console.log(`📋 ${coll.name}: ${indexes.length} indexes`);

            // Show index details
            indexes.forEach(idx => {
                if (idx.name !== '_id_') {
                    console.log(`   - ${idx.name}`);
                }
            });
        }
        console.log('');

        // Test 3: Query Performance (if models exist)
        if (mongoose.models.Employee) {
            console.log('Test 3: Employee Query Performance');

            // Test without lean()
            const start1 = Date.now();
            await mongoose.models.Employee.find().limit(10);
            const time1 = Date.now() - start1;
            console.log(`   Without lean(): ${time1}ms`);

            // Test with lean()
            const start2 = Date.now();
            await mongoose.models.Employee.find().limit(10).lean();
            const time2 = Date.now() - start2;
            console.log(`   With lean(): ${time2}ms`);
            console.log(`   ✅ Improvement: ${Math.round((1 - time2 / time1) * 100)}%\n`);
        }

        // Test 4: Index Usage
        console.log('Test 4: Index Usage Analysis');
        if (mongoose.models.Employee) {
            const query = mongoose.models.Employee.find({ status: 'active' }).explain('executionStats');
            const result = await query;

            if (result.executionStats.totalKeysExamined > 0) {
                console.log('   ✅ Query is using indexes');
                console.log(`   Keys examined: ${result.executionStats.totalKeysExamined}`);
                console.log(`   Docs examined: ${result.executionStats.totalDocsExamined}`);
            } else {
                console.log('   ⚠️  Query is NOT using indexes (full collection scan)');
            }
        }

        console.log('\n✅ Performance test completed successfully!');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
}

testPerformance();

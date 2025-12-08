const mongoose = require('mongoose')
require('dotenv').config()

async function debugSubtasks() {
  try {
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('Connected to MongoDB')
    
    // Find tasks with subtasks
    const tasksWithSubtasks = await mongoose.connection.db.collection('tasks').find({
      'subtasks.0': { $exists: true }
    }).limit(5).toArray()
    
    console.log('\n=== Tasks with subtasks ===')
    console.log(`Found ${tasksWithSubtasks.length} tasks with subtasks`)
    
    tasksWithSubtasks.forEach(task => {
      console.log(`\nTask: ${task.title}`)
      console.log(`  ID: ${task._id}`)
      console.log(`  Subtasks count: ${task.subtasks?.length || 0}`)
      if (task.subtasks) {
        task.subtasks.forEach((st, i) => {
          console.log(`    ${i + 1}. ${st.title} (completed: ${st.completed})`)
        })
      }
    })
    
    // Find all tasks and check subtasks field
    const allTasks = await mongoose.connection.db.collection('tasks').find({}).limit(10).toArray()
    console.log('\n=== All tasks (first 10) ===')
    allTasks.forEach(task => {
      console.log(`${task.title}: subtasks = ${JSON.stringify(task.subtasks)}`)
    })
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await mongoose.disconnect()
  }
}

debugSubtasks()

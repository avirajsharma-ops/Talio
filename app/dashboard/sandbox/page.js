'use client'

import { useState } from 'react'
import { FaLightbulb, FaPlus, FaThumbsUp, FaComment, FaUser } from 'react-icons/fa'

export default function SandboxPage() {
  const [showAddIdea, setShowAddIdea] = useState(false)
  const [newIdea, setNewIdea] = useState({ title: '', description: '' })

  const dummyIdeas = [
    {
      id: 1,
      title: 'Implement AI-powered Task Prioritization',
      description: 'Use machine learning to automatically prioritize tasks based on deadlines, importance, and team capacity.',
      author: 'John Doe',
      date: '2 days ago',
      likes: 15,
      comments: 8,
      status: 'Under Review'
    },
    {
      id: 2,
      title: 'Mobile App for Quick Attendance',
      description: 'Develop a mobile app that allows employees to mark attendance with face recognition.',
      author: 'Sarah Smith',
      date: '5 days ago',
      likes: 23,
      comments: 12,
      status: 'In Progress'
    },
    {
      id: 3,
      title: 'Team Collaboration Spaces',
      description: 'Create virtual collaboration spaces where teams can brainstorm and share ideas in real-time.',
      author: 'Mike Johnson',
      date: '1 week ago',
      likes: 18,
      comments: 6,
      status: 'New'
    },
    {
      id: 4,
      title: 'Automated Leave Balance Alerts',
      description: 'Send automated notifications to employees when their leave balance is running low.',
      author: 'Emily Davis',
      date: '2 weeks ago',
      likes: 31,
      comments: 15,
      status: 'Implemented'
    }
  ]

  const handleSubmitIdea = (e) => {
    e.preventDefault()
    // Handle idea submission
    console.log('New idea:', newIdea)
    setNewIdea({ title: '', description: '' })
    setShowAddIdea(false)
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'New':
        return 'bg-blue-100 text-blue-800'
      case 'Under Review':
        return 'bg-yellow-100 text-yellow-800'
      case 'In Progress':
        return 'bg-purple-100 text-purple-800'
      case 'Implemented':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="page-container pb-14 md:pb-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4 sm:mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Ideas Sandbox</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Share your innovative ideas with the team</p>
        </div>
        <button
          onClick={() => setShowAddIdea(!showAddIdea)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <FaPlus />
          <span className="hidden sm:inline">New Idea</span>
        </button>
      </div>

      {/* Add Idea Form */}
      {showAddIdea && (
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Share Your Idea</h2>
          <form onSubmit={handleSubmitIdea}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title
                </label>
                <input
                  type="text"
                  value={newIdea.title}
                  onChange={(e) => setNewIdea({ ...newIdea, title: e.target.value })}
                  placeholder="Enter a catchy title for your idea"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={newIdea.description}
                  onChange={(e) => setNewIdea({ ...newIdea, description: e.target.value })}
                  placeholder="Describe your idea in detail..."
                  rows="4"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Submit Idea
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddIdea(false)}
                  className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Ideas Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {dummyIdeas.map((idea) => (
          <div key={idea.id} className="bg-white rounded-lg shadow-md p-4 sm:p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center flex-shrink-0">
                <FaLightbulb className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-gray-800 mb-1">{idea.title}</h3>
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(idea.status)}`}>
                  {idea.status}
                </span>
              </div>
            </div>

            <p className="text-gray-600 mb-4 line-clamp-3">{idea.description}</p>

            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                  <FaUser className="text-white text-xs" />
                </div>
                <span>{idea.author}</span>
                <span>•</span>
                <span>{idea.date}</span>
              </div>
            </div>

            <div className="flex items-center gap-4 mt-4">
              <button className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors">
                <FaThumbsUp />
                <span className="text-sm">{idea.likes}</span>
              </button>
              <button className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors">
                <FaComment />
                <span className="text-sm">{idea.comments}</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {dummyIdeas.length === 0 && (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <FaLightbulb className="text-6xl text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-800 mb-2">No Ideas Yet</h3>
          <p className="text-gray-600 mb-6">Be the first to share an innovative idea!</p>
          <button
            onClick={() => setShowAddIdea(true)}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Share Your First Idea
          </button>
        </div>
      )}
    </div>
  )
}


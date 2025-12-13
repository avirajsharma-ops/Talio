'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  HiOutlineComputerDesktop, 
  HiOutlineCalendarDays,
  HiOutlineSparkles,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineUsers,
  HiOutlineUser,
  HiOutlinePhoto,
  HiOutlineClock,
  HiOutlineXMark,
  HiOutlineArrowPath
} from 'react-icons/hi2'

export default function ProductivityPage() {
  const [user, setUser] = useState(null)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [sessions, setSessions] = useState([])
  const [teamSessions, setTeamSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('my') // 'my' or 'team'
  const [selectedSession, setSelectedSession] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [canViewTeam, setCanViewTeam] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  // Get user from localStorage
  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      setUser(JSON.parse(userData))
    }
  }, [])

  const userRole = user?.role

  // Check if user can view team (admin, hr, manager, dept_head, god_admin)
  useEffect(() => {
    const teamRoles = ['admin', 'hr', 'manager', 'department_head', 'god_admin']
    setCanViewTeam(teamRoles.includes(userRole))
  }, [userRole])

  // Fetch sessions for selected date
  const fetchSessions = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/productivity/sessions?date=${selectedDate}`)
      if (res.ok) {
        const data = await res.json()
        setSessions(data.sessions || [])
      }
    } catch (error) {
      console.error('Error fetching sessions:', error)
    } finally {
      setLoading(false)
    }
  }, [selectedDate])

  // Fetch team sessions
  const fetchTeamSessions = useCallback(async () => {
    if (!canViewTeam) return
    try {
      const res = await fetch(`/api/productivity/team?date=${selectedDate}`)
      if (res.ok) {
        const data = await res.json()
        setTeamSessions(data.members || [])
      }
    } catch (error) {
      console.error('Error fetching team sessions:', error)
    }
  }, [selectedDate, canViewTeam])

  useEffect(() => {
    fetchSessions()
    if (activeTab === 'team') {
      fetchTeamSessions()
    }
  }, [fetchSessions, fetchTeamSessions, activeTab])

  // Create sessions from screenshots
  const refreshSessions = async () => {
    try {
      setRefreshing(true)
      await fetch('/api/productivity/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: selectedDate })
      })
      await fetchSessions()
    } catch (error) {
      console.error('Error refreshing sessions:', error)
    } finally {
      setRefreshing(false)
    }
  }

  // Navigate date
  const changeDate = (direction) => {
    const date = new Date(selectedDate)
    date.setDate(date.getDate() + direction)
    setSelectedDate(date.toISOString().split('T')[0])
  }

  // Analyze session with AI
  const analyzeSession = async (sessionId) => {
    try {
      setAnalyzing(true)
      const res = await fetch(`/api/productivity/sessions/${sessionId}/analyze`, {
        method: 'POST'
      })
      if (res.ok) {
        const data = await res.json()
        // Update the session in the list
        setSessions(prev => prev.map(s => 
          s._id === sessionId ? { ...s, ...data.session } : s
        ))
        if (selectedSession?._id === sessionId) {
          setSelectedSession({ ...selectedSession, ...data.session })
        }
      }
    } catch (error) {
      console.error('Error analyzing session:', error)
    } finally {
      setAnalyzing(false)
    }
  }

  // Format time from timestamp
  const formatTime = (timestamp) => {
    if (!timestamp) return '--:--'
    const date = new Date(timestamp)
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  }

  // Get score color
  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600 bg-green-100'
    if (score >= 60) return 'text-yellow-600 bg-yellow-100'
    if (score >= 40) return 'text-orange-600 bg-orange-100'
    return 'text-red-600 bg-red-100'
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl shadow-lg">
            <HiOutlineComputerDesktop className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Productivity</h1>
            <p className="text-sm text-gray-500">Monitor your work activity</p>
          </div>
        </div>

        {/* Date Navigation */}
        <div className="flex items-center gap-2 bg-white rounded-xl shadow-sm border px-2 py-1">
          <button 
            onClick={() => changeDate(-1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <HiOutlineChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 px-3">
            <HiOutlineCalendarDays className="w-5 h-5 text-gray-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="border-0 focus:ring-0 text-sm font-medium"
            />
          </div>
          <button 
            onClick={() => changeDate(1)}
            disabled={selectedDate >= new Date().toISOString().split('T')[0]}
            className="p-2 hover:bg-gray-100 rounded-lg transition disabled:opacity-50"
          >
            <HiOutlineChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Tabs (if can view team) */}
      {canViewTeam && (
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('my')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
              activeTab === 'my' 
                ? 'bg-purple-600 text-white' 
                : 'bg-white text-gray-600 hover:bg-gray-50 border'
            }`}
          >
            <HiOutlineUser className="w-5 h-5" />
            My Activity
          </button>
          <button
            onClick={() => setActiveTab('team')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
              activeTab === 'team' 
                ? 'bg-purple-600 text-white' 
                : 'bg-white text-gray-600 hover:bg-gray-50 border'
            }`}
          >
            <HiOutlineUsers className="w-5 h-5" />
            Team Activity
          </button>
        </div>
      )}

      {/* My Activity Tab */}
      {activeTab === 'my' && (
        <>
          {/* Refresh Button */}
          <div className="flex justify-end mb-4">
            <button
              onClick={refreshSessions}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-white border rounded-lg hover:bg-gray-50 transition text-sm font-medium"
            >
              <HiOutlineArrowPath className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh Sessions'}
            </button>
          </div>

          {/* Sessions Grid */}
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            </div>
          ) : sessions.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border p-12 text-center">
              <HiOutlinePhoto className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No activity recorded</h3>
              <p className="text-gray-500 mb-4">
                No screenshots were captured on this date. Make sure the desktop app is running while clocked in.
              </p>
              <button
                onClick={refreshSessions}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
              >
                Check for Screenshots
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sessions.map((session, index) => (
                <div
                  key={session._id}
                  className="bg-white rounded-xl shadow-sm border overflow-hidden hover:shadow-md transition cursor-pointer"
                  onClick={() => setSelectedSession(session)}
                >
                  {/* Session Preview - First screenshot */}
                  <div className="aspect-video bg-gray-100 relative">
                    {session.screenshots?.[0]?.url ? (
                      <img
                        src={session.screenshots[0].url}
                        alt="Session preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <HiOutlinePhoto className="w-12 h-12 text-gray-300" />
                      </div>
                    )}
                    {/* Screenshot count badge */}
                    <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                      <HiOutlinePhoto className="w-3 h-3" />
                      {session.screenshots?.length || 0}
                    </div>
                  </div>

                  {/* Session Info */}
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-gray-900">Session {index + 1}</h3>
                      {session.analysis?.score && (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getScoreColor(session.analysis.score)}`}>
                          {session.analysis.score}%
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <HiOutlineClock className="w-4 h-4" />
                        {formatTime(session.startTime)} - {formatTime(session.endTime)}
                      </span>
                    </div>
                    {session.analysis?.summary && (
                      <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                        {session.analysis.summary}
                      </p>
                    )}
                    {!session.analysis && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          analyzeSession(session._id)
                        }}
                        disabled={analyzing}
                        className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg text-sm font-medium hover:opacity-90 transition disabled:opacity-50"
                      >
                        <HiOutlineSparkles className="w-4 h-4" />
                        {analyzing ? 'Analyzing...' : 'Analyze with AI'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Team Activity Tab */}
      {activeTab === 'team' && (
        <div className="space-y-4">
          {teamSessions.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border p-12 text-center">
              <HiOutlineUsers className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No team activity</h3>
              <p className="text-gray-500">
                No team members have recorded activity on this date.
              </p>
            </div>
          ) : (
            teamSessions.map((member) => (
              <div key={member.userId} className="bg-white rounded-xl shadow-sm border p-4">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-medium">
                    {member.name?.charAt(0) || 'U'}
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{member.name}</h3>
                    <p className="text-sm text-gray-500">{member.sessionCount} sessions today</p>
                  </div>
                </div>
                {member.sessions?.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {member.sessions.slice(0, 4).map((session, idx) => (
                      <div 
                        key={session._id}
                        className="aspect-video bg-gray-100 rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition"
                        onClick={() => setSelectedSession(session)}
                      >
                        {session.screenshots?.[0]?.url ? (
                          <img
                            src={session.screenshots[0].url}
                            alt={`Session ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <HiOutlinePhoto className="w-8 h-8 text-gray-300" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Session Detail Modal */}
      {selectedSession && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Session Details</h2>
                <p className="text-sm text-gray-500">
                  {formatTime(selectedSession.startTime)} - {formatTime(selectedSession.endTime)} • {selectedSession.screenshots?.length || 0} screenshots
                </p>
              </div>
              <div className="flex items-center gap-2">
                {!selectedSession.analysis && (
                  <button
                    onClick={() => analyzeSession(selectedSession._id)}
                    disabled={analyzing}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg text-sm font-medium hover:opacity-90 transition disabled:opacity-50"
                  >
                    <HiOutlineSparkles className="w-4 h-4" />
                    {analyzing ? 'Analyzing...' : 'Analyze with AI'}
                  </button>
                )}
                <button
                  onClick={() => setSelectedSession(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition"
                >
                  <HiOutlineXMark className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {/* AI Analysis (if available) */}
              {selectedSession.analysis && (
                <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-4 mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <HiOutlineSparkles className="w-5 h-5 text-purple-600" />
                    <h3 className="font-medium text-purple-900">AI Analysis</h3>
                    {selectedSession.analysis.score && (
                      <span className={`ml-auto px-3 py-1 rounded-full text-sm font-medium ${getScoreColor(selectedSession.analysis.score)}`}>
                        Score: {selectedSession.analysis.score}%
                      </span>
                    )}
                  </div>
                  <p className="text-gray-700 mb-3">{selectedSession.analysis.summary}</p>
                  {selectedSession.analysis.improvements?.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Suggestions:</h4>
                      <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                        {selectedSession.analysis.improvements.map((imp, idx) => (
                          <li key={idx}>{imp}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Screenshots Grid */}
              <h3 className="font-medium text-gray-900 mb-3">Screenshots</h3>
              <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-2">
                {selectedSession.screenshots?.map((screenshot, idx) => (
                  <div 
                    key={idx}
                    className="aspect-video bg-gray-100 rounded-lg overflow-hidden group relative cursor-pointer"
                    onClick={() => window.open(screenshot.url, '_blank')}
                  >
                    <img
                      src={screenshot.url}
                      alt={`Screenshot ${idx + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition"
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1 text-center opacity-0 group-hover:opacity-100 transition">
                      {formatTime(screenshot.capturedAt)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

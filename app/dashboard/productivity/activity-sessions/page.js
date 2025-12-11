'use client';

import { useState, useEffect } from 'react';
import { FaChartLine, FaUser, FaCalendarAlt, FaClock, FaDesktop, FaGlobe, FaKeyboard, FaMouse, FaChevronDown, FaChevronUp, FaSync, FaFilter } from 'react-icons/fa';
import toast from 'react-hot-toast';

export default function ActivitySessionsPage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState('all');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [expandedSession, setExpandedSession] = useState(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      fetchEmployees(parsedUser);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchSessions();
    }
  }, [user, selectedEmployee, selectedDate]);

  const fetchEmployees = async (currentUser) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/employees?status=active', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setEmployees(data.employees || data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch employees:', error);
    }
  };

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      let url = '/api/productivity/sessions?';
      
      if (selectedEmployee && selectedEmployee !== 'all') {
        url += `employeeId=${selectedEmployee}&`;
      }
      
      if (selectedDate) {
        url += `date=${selectedDate}`;
      }
      
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSessions(data.data || []);
      } else {
        toast.error(data.error || 'Failed to fetch sessions');
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
      toast.error('Failed to fetch sessions');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchSessions();
    toast.success('Refreshed sessions');
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (ms) => {
    const minutes = Math.floor(ms / 60000);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m`;
    }
    return `${minutes}m`;
  };

  const getProductivityColor = (score) => {
    if (score >= 70) return 'text-green-600 bg-green-100';
    if (score >= 40) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'productive': return 'bg-green-500';
      case 'neutral': return 'bg-gray-400';
      case 'unproductive': return 'bg-red-500';
      default: return 'bg-gray-300';
    }
  };

  const isAdmin = user?.role === 'admin' || user?.role === 'god_admin';

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <FaChartLine className="text-blue-600" />
              Activity Sessions
            </h1>
            <p className="text-gray-600 mt-1">
              Analyze productivity sessions and activity patterns
            </p>
          </div>
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <FaSync className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-4 flex flex-wrap gap-4 items-center">
          {/* Employee Filter */}
          {isAdmin && (
            <div className="flex items-center gap-2">
              <FaUser className="text-gray-400" />
              <select
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Employees</option>
                {employees.map((emp) => (
                  <option key={emp._id} value={emp._id}>
                    {emp.firstName} {emp.lastName}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Date Filter */}
          <div className="flex items-center gap-2">
            <FaCalendarAlt className="text-gray-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Results count */}
          <div className="ml-auto text-gray-600">
            {sessions.length} sessions found
          </div>
        </div>
      </div>

      {/* Sessions List */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm p-6 animate-pulse">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-5 bg-gray-200 rounded w-1/4 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                </div>
                <div className="h-10 w-24 bg-gray-200 rounded-lg"></div>
              </div>
              <div className="h-4 bg-gray-200 rounded w-full"></div>
            </div>
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <div className="bg-white rounded-xl shadow-lg p-12 text-center">
          <FaChartLine className="text-6xl text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-600 mb-2">No Sessions Found</h3>
          <p className="text-gray-500">
            No activity sessions available for the selected date and filters.
            <br />
            Sessions are generated from screen captures when employees use the desktop app.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sessions.map((session) => (
            <div
              key={session._id}
              className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Session Header */}
              <div
                className="p-6 cursor-pointer"
                onClick={() => setExpandedSession(expandedSession === session._id ? null : session._id)}
              >
                <div className="flex items-center gap-4">
                  {/* User Avatar */}
                  <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                    {session.employeeName?.[0]?.toUpperCase() || 'U'}
                  </div>

                  {/* User Info */}
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">
                      {session.employeeName || 'Unknown Employee'}
                    </h3>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <FaClock />
                        {formatTime(session.sessionStart)} - {formatTime(session.sessionEnd)}
                      </span>
                      <span className="flex items-center gap-1">
                        Duration: {formatDuration(session.totalActiveTime || 0)}
                      </span>
                    </div>
                  </div>

                  {/* Productivity Score */}
                  <div className={`px-4 py-2 rounded-lg font-semibold ${getProductivityColor(session.productivityScore || 0)}`}>
                    {session.productivityScore || 0}%
                  </div>

                  {/* Expand Icon */}
                  <button className="text-gray-400 hover:text-gray-600">
                    {expandedSession === session._id ? <FaChevronUp /> : <FaChevronDown />}
                  </button>
                </div>

                {/* Time Distribution Bar */}
                <div className="mt-4 h-3 bg-gray-200 rounded-full overflow-hidden flex">
                  {session.productiveTime > 0 && (
                    <div
                      className="bg-green-500 h-full"
                      style={{ width: `${(session.productiveTime / session.totalActiveTime) * 100}%` }}
                      title={`Productive: ${formatDuration(session.productiveTime)}`}
                    />
                  )}
                  {session.neutralTime > 0 && (
                    <div
                      className="bg-gray-400 h-full"
                      style={{ width: `${(session.neutralTime / session.totalActiveTime) * 100}%` }}
                      title={`Neutral: ${formatDuration(session.neutralTime)}`}
                    />
                  )}
                  {session.unproductiveTime > 0 && (
                    <div
                      className="bg-red-500 h-full"
                      style={{ width: `${(session.unproductiveTime / session.totalActiveTime) * 100}%` }}
                      title={`Unproductive: ${formatDuration(session.unproductiveTime)}`}
                    />
                  )}
                </div>

                {/* Legend */}
                <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    Productive
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                    Neutral
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                    Unproductive
                  </span>
                </div>
              </div>

              {/* Expanded Details */}
              {expandedSession === session._id && (
                <div className="border-t border-gray-200 p-6 bg-gray-50">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Activity Summary */}
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <FaKeyboard className="text-blue-500" />
                        Keyboard Activity
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Total Keystrokes</span>
                          <span className="font-medium">{session.keystrokeSummary?.totalCount || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Avg per Minute</span>
                          <span className="font-medium">{session.keystrokeSummary?.averagePerMinute?.toFixed(1) || 0}</span>
                        </div>
                      </div>
                    </div>

                    {/* Mouse Activity */}
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <FaMouse className="text-purple-500" />
                        Mouse Activity
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Total Clicks</span>
                          <span className="font-medium">{session.mouseActivitySummary?.totalClicks || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Scroll Distance</span>
                          <span className="font-medium">{Math.round(session.mouseActivitySummary?.totalScrollDistance || 0)}px</span>
                        </div>
                      </div>
                    </div>

                    {/* Top Apps */}
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <FaDesktop className="text-green-500" />
                        Top Applications
                      </h4>
                      <div className="space-y-2 text-sm">
                        {(session.topApps || []).slice(0, 3).map((app, idx) => (
                          <div key={idx} className="flex justify-between items-center">
                            <span className="text-gray-600 truncate flex-1 mr-2">{app.appName}</span>
                            <span className="font-medium text-gray-900">{app.percentage}%</span>
                          </div>
                        ))}
                        {(!session.topApps || session.topApps.length === 0) && (
                          <span className="text-gray-400">No data</span>
                        )}
                      </div>
                    </div>

                    {/* Top Websites */}
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <FaGlobe className="text-orange-500" />
                        Top Websites
                      </h4>
                      <div className="space-y-2 text-sm">
                        {(session.topWebsites || []).slice(0, 3).map((site, idx) => (
                          <div key={idx} className="flex justify-between items-center">
                            <span className="text-gray-600 truncate flex-1 mr-2">{site.domain}</span>
                            <span className="font-medium text-gray-900">{site.percentage}%</span>
                          </div>
                        ))}
                        {(!session.topWebsites || session.topWebsites.length === 0) && (
                          <span className="text-gray-400">No data</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Screenshots */}
                  {session.screenshots && session.screenshots.length > 0 && (
                    <div className="mt-6">
                      <h4 className="font-semibold text-gray-700 mb-3">Session Screenshots</h4>
                      <div className="flex gap-3 overflow-x-auto pb-2">
                        {session.screenshots.slice(0, 6).map((screenshot, idx) => (
                          <div key={idx} className="flex-shrink-0 w-40">
                            <div className="aspect-video bg-gray-200 rounded-lg overflow-hidden">
                              {screenshot.thumbnail ? (
                                <img
                                  src={screenshot.thumbnail.startsWith('data:') ? screenshot.thumbnail : `data:image/webp;base64,${screenshot.thumbnail}`}
                                  alt={`Screenshot ${idx + 1}`}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                  <FaDesktop />
                                </div>
                              )}
                            </div>
                            <div className="text-xs text-gray-500 mt-1 text-center">
                              {formatTime(screenshot.capturedAt)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { FaEye, FaHistory, FaUsers, FaChartLine, FaCalendar, FaFilter } from 'react-icons/fa';
import toast from 'react-hot-toast';

export default function ProductivityMonitoringPage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [monitoringData, setMonitoringData] = useState([]);
  const [chatHistory, setChatHistory] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [activeTab, setActiveTab] = useState('monitoring'); // 'monitoring' or 'chat'
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [includeScreenshots, setIncludeScreenshots] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
      fetchEmployees();
      fetchMonitoringData();
    }
  }, []);

  const fetchEmployees = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/employees', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setEmployees(data.employees || []);
      }
    } catch (error) {
      console.error('Failed to fetch employees:', error);
    }
  };

  const fetchMonitoringData = async (userId = null) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      let url = '/api/productivity/monitor?limit=100';
      if (userId) url += `&userId=${userId}`;
      if (includeScreenshots) url += '&includeScreenshot=true';
      if (dateRange.start) url += `&startDate=${dateRange.start}`;
      if (dateRange.end) url += `&endDate=${dateRange.end}`;

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (data.success) {
        setMonitoringData(data.data || []);
      } else {
        toast.error(data.error || 'Failed to fetch monitoring data');
      }
    } catch (error) {
      toast.error('Failed to load monitoring data');
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchChatHistory = async (userId = null) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      let url = '/api/productivity/chat-history?limit=100';
      if (userId) url += `&userId=${userId}`;
      if (dateRange.start) url += `&startDate=${dateRange.start}`;
      if (dateRange.end) url += `&endDate=${dateRange.end}`;

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (data.success) {
        setChatHistory(data.data || []);
      } else {
        toast.error(data.error || 'Failed to fetch chat history');
      }
    } catch (error) {
      toast.error('Failed to load chat history');
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEmployeeSelect = (employeeId) => {
    const employee = employees.find(e => e._id === employeeId);
    setSelectedEmployee(employee);
    
    if (activeTab === 'monitoring') {
      fetchMonitoringData(employee?.userId);
    } else {
      fetchChatHistory(employee?.userId);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'monitoring') {
      fetchMonitoringData(selectedEmployee?.userId);
    } else {
      fetchChatHistory(selectedEmployee?.userId);
    }
  };

  const handleDateFilter = () => {
    if (activeTab === 'monitoring') {
      fetchMonitoringData(selectedEmployee?.userId);
    } else {
      fetchChatHistory(selectedEmployee?.userId);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
          <FaChartLine className="text-blue-600" />
          Productivity Monitoring
        </h1>
        <p className="text-gray-600 mt-2">
          {user.role === 'admin' || user.role === 'god_admin' 
            ? 'View productivity data and chat history for all employees'
            : user.role === 'department_head'
            ? 'View productivity data for your department members'
            : 'View your own productivity tracking and chat history'}
        </p>
      </div>

      {/* Employee Filter (for admins and department heads) */}
      {(user.role === 'admin' || user.role === 'god_admin' || user.role === 'department_head') && (
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex items-center gap-4">
            <FaUsers className="text-gray-500" />
            <select
              value={selectedEmployee?._id || ''}
              onChange={(e) => handleEmployeeSelect(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Employees</option>
              {employees.map(emp => (
                <option key={emp._id} value={emp._id}>
                  {emp.name} - {emp.employeeCode}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Date Range Filter */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          <FaCalendar className="text-gray-500" />
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="Start Date"
          />
          <span className="text-gray-500">to</span>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="End Date"
          />
          <button
            onClick={handleDateFilter}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <FaFilter />
            Apply Filter
          </button>
          {activeTab === 'monitoring' && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeScreenshots}
                onChange={(e) => setIncludeScreenshots(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm text-gray-700">Include Screenshots</span>
            </label>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="flex border-b">
          <button
            onClick={() => handleTabChange('monitoring')}
            className={`flex-1 px-6 py-4 font-semibold flex items-center justify-center gap-2 ${
              activeTab === 'monitoring'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <FaEye />
            Screen Monitoring
          </button>
          <button
            onClick={() => handleTabChange('chat')}
            className={`flex-1 px-6 py-4 font-semibold flex items-center justify-center gap-2 ${
              activeTab === 'chat'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <FaHistory />
            MAYA Chat History
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-lg shadow">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading data...</p>
          </div>
        ) : activeTab === 'monitoring' ? (
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">
              Screen Monitoring Data ({monitoringData.length} records)
            </h2>
            {monitoringData.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No monitoring data available</p>
            ) : (
              <div className="space-y-4">
                {monitoringData.map((record) => (
                  <div key={record._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-800">
                          {record.monitoredEmployeeId?.name || 'Unknown Employee'}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {record.monitoredEmployeeId?.employeeCode} - {record.monitoredEmployeeId?.designation}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">
                          {new Date(record.createdAt).toLocaleString()}
                        </p>
                        <span className={`text-xs px-2 py-1 rounded ${
                          record.status === 'captured' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {record.status}
                        </span>
                      </div>
                    </div>
                    
                    <p className="text-gray-700 mb-2">{record.summary}</p>
                    
                    {record.currentPage && (
                      <div className="text-sm text-gray-600 mb-2">
                        <strong>Page:</strong> {record.currentPage.title || record.currentPage.url}
                      </div>
                    )}
                    
                    {record.activities && record.activities.length > 0 && (
                      <div className="text-sm text-gray-600 mb-2">
                        <strong>Activities:</strong> {record.activities.join(', ')}
                      </div>
                    )}
                    
                    {includeScreenshots && record.screenshotUrl && (
                      <div className="mt-3">
                        <img 
                          src={record.screenshotUrl} 
                          alt="Screen capture" 
                          className="max-w-full rounded border border-gray-300"
                          style={{ maxHeight: '300px' }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">
              MAYA Chat History ({chatHistory.length} sessions)
            </h2>
            {chatHistory.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No chat history available</p>
            ) : (
              <div className="space-y-4">
                {chatHistory.map((session) => (
                  <div key={session._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-800">
                          {session.employeeId?.name || session.userId?.name || 'Unknown User'}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {session.employeeId?.employeeCode} - {session.employeeId?.designation}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">
                          {new Date(session.createdAt).toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-400">
                          {session.messages?.length || 0} messages
                        </p>
                      </div>
                    </div>
                    
                    {session.messages && session.messages.length > 0 && (
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {session.messages.map((msg, idx) => (
                          <div key={idx} className={`p-3 rounded ${
                            msg.role === 'user' ? 'bg-blue-50 ml-4' : 'bg-gray-50 mr-4'
                          }`}>
                            <p className="text-xs text-gray-500 mb-1">
                              {msg.role === 'user' ? 'User' : 'MAYA'} - {new Date(msg.timestamp).toLocaleTimeString()}
                            </p>
                            <p className="text-sm text-gray-800">{msg.content}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

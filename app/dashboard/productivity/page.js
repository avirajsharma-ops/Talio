'use client';

import { useState, useEffect } from 'react';
import { FaEye, FaHistory, FaUsers, FaChartLine, FaCalendar, FaFilter, FaChevronDown, FaChevronUp, FaClock, FaSave } from 'react-icons/fa';
import toast from 'react-hot-toast';

export default function ProductivityMonitoringPage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [monitoringData, setMonitoringData] = useState([]);
  const [chatHistory, setChatHistory] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [departmentHeads, setDepartmentHeads] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [activeTab, setActiveTab] = useState('monitoring'); // 'monitoring' or 'chat'
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [includeScreenshots, setIncludeScreenshots] = useState(true);
  const [expandedCards, setExpandedCards] = useState(new Set());
  const [screenshotInterval, setScreenshotInterval] = useState(5); // minutes
  const [savingInterval, setSavingInterval] = useState(false);
  const [modalData, setModalData] = useState(null); // { type: 'chat' | 'monitoring', title, data, userInfo }
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      fetchEmployees(parsedUser);
      fetchAllData(parsedUser);
      
      // Load saved screenshot interval
      const savedInterval = localStorage.getItem('screenshotInterval');
      if (savedInterval) {
        setScreenshotInterval(parseInt(savedInterval));
      }
    }
  }, []);

  const fetchEmployees = async (currentUser) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/employees', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        const allEmployees = data.employees || [];
        
        // Separate department heads and regular employees
        const heads = allEmployees.filter(emp => 
          emp.designation?.toLowerCase().includes('head') || 
          emp.role === 'department_head'
        );
        const regularEmps = allEmployees.filter(emp => 
          !emp.designation?.toLowerCase().includes('head') && 
          emp.role !== 'department_head'
        );
        
        setDepartmentHeads(heads);
        setEmployees(regularEmps);
      }
    } catch (error) {
      console.error('Failed to fetch employees:', error);
    }
  };

  const fetchAllData = async (currentUser) => {
    if (activeTab === 'monitoring') {
      await fetchMonitoringData(currentUser);
    } else {
      await fetchChatHistory(currentUser);
    }
  };

  const fetchMonitoringData = async (currentUser, userId = null) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      let url = '/api/productivity/monitor?limit=500';
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

  const fetchChatHistory = async (currentUser, userId = null) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      let url = '/api/productivity/chat-history?limit=500';
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

  const toggleCardExpansion = (cardId) => {
    const newExpanded = new Set(expandedCards);
    if (newExpanded.has(cardId)) {
      newExpanded.delete(cardId);
    } else {
      newExpanded.add(cardId);
    }
    setExpandedCards(newExpanded);
  };

  const openModal = (type, title, data, userInfo) => {
    setModalData({ type, title, data, userInfo });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setTimeout(() => setModalData(null), 300); // Wait for animation
  };

  const saveScreenshotInterval = async () => {
    try {
      setSavingInterval(true);
      localStorage.setItem('screenshotInterval', screenshotInterval.toString());
      toast.success(`Screenshot interval set to ${screenshotInterval} minutes`);
      
      // TODO: Send to backend to configure actual screenshot capture
      const token = localStorage.getItem('token');
      await fetch('/api/settings/screenshot-interval', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ interval: screenshotInterval })
      });
    } catch (error) {
      console.error('Failed to save interval:', error);
    } finally {
      setSavingInterval(false);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'monitoring') {
      fetchMonitoringData(user);
    } else {
      fetchChatHistory(user);
    }
  };

  const handleDateFilter = () => {
    if (activeTab === 'monitoring') {
      fetchMonitoringData(user);
    } else {
      fetchChatHistory(user);
    }
  };

  // Group data by user for card-based display
  const groupDataByUser = (data, type) => {
    if (!user) return { own: [], departmentHeads: [], employees: [] };
    
    const grouped = {
      own: [],
      departmentHeads: [],
      employees: []
    };

    data.forEach(item => {
      const itemUserId = type === 'chat' 
        ? item.userId?._id || item.userId
        : item.monitoredUserId?._id || item.monitoredUserId;
      
      const itemUser = type === 'chat'
        ? item.userId
        : item.monitoredEmployeeId || item.monitoredUserId;

      if (itemUserId === user._id || itemUserId === user.userId) {
        grouped.own.push(item);
      } else if (departmentHeads.some(dh => dh.userId === itemUserId || dh._id === itemUserId)) {
        grouped.departmentHeads.push(item);
      } else {
        grouped.employees.push(item);
      }
    });

    return grouped;
  };

  const renderChatCard = (title, sessions, cardId, userInfo = null) => {
    const messageCount = sessions.reduce((sum, s) => sum + (s.messages?.length || 0), 0);

    return (
      <div key={cardId} className="bg-white rounded-xl shadow-lg border-2 border-gray-200 overflow-hidden hover:shadow-xl transition-all duration-300">
        <div className="p-6">
          {/* Profile Picture or Initial */}
          <div className="flex justify-center mb-4">
            {userInfo?.profilePicture ? (
              <img
                src={userInfo.profilePicture}
                alt={userInfo.name || title}
                className="w-20 h-20 rounded-full border-4 border-blue-500 shadow-lg object-cover"
              />
            ) : (
              <div className="w-20 h-20 rounded-full border-4 border-blue-500 shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <span className="text-3xl font-bold text-white">
                  {(userInfo?.name || title)?.charAt(0)?.toUpperCase() || 'U'}
                </span>
              </div>
            )}
          </div>

          <div className="text-center mb-4">
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              {title}
            </h3>
            {userInfo && (
              <p className="text-sm text-gray-600 font-medium">
                {userInfo.designation || 'N/A'}
              </p>
            )}
          </div>

          <div className="flex justify-between items-center text-xs text-gray-500 mb-4">
            <span>{sessions.length} session{sessions.length !== 1 ? 's' : ''}</span>
            <span>{messageCount} message{messageCount !== 1 ? 's' : ''}</span>
          </div>

          <button
            onClick={() => openModal('chat', title, sessions, userInfo)}
            className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-semibold hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-md hover:shadow-lg"
          >
            Show
          </button>
        </div>
      </div>
    );
  };

  const renderMonitoringCard = (title, records, cardId, userInfo = null) => {
    return (
      <div key={cardId} className="bg-white rounded-xl shadow-lg border-2 border-gray-200 overflow-hidden hover:shadow-xl transition-all duration-300">
        <div className="p-6">
          {/* Profile Picture or Initial */}
          <div className="flex justify-center mb-4">
            {userInfo?.profilePicture ? (
              <img
                src={userInfo.profilePicture}
                alt={userInfo.name || title}
                className="w-20 h-20 rounded-full border-4 border-green-500 shadow-lg object-cover"
              />
            ) : (
              <div className="w-20 h-20 rounded-full border-4 border-green-500 shadow-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                <span className="text-3xl font-bold text-white">
                  {(userInfo?.name || title)?.charAt(0)?.toUpperCase() || 'U'}
                </span>
              </div>
            )}
          </div>

          <div className="text-center mb-4">
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              {title}
            </h3>
            {userInfo && (
              <p className="text-sm text-gray-600 font-medium">
                {userInfo.designation || 'N/A'}
              </p>
            )}
          </div>

          <div className="flex justify-between items-center text-xs text-gray-500 mb-4">
            <span>{records.length} capture{records.length !== 1 ? 's' : ''}</span>
            {records.length > 0 && records[0].createdAt && (
              <span>{new Date(records[0].createdAt).toLocaleDateString()}</span>
            )}
          </div>

          <button
            onClick={() => openModal('monitoring', title, records, userInfo)}
            className="w-full py-2.5 px-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg font-semibold hover:from-green-600 hover:to-green-700 transition-all duration-200 shadow-md hover:shadow-lg"
          >
            Show
          </button>
        </div>
      </div>
    );
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const isAdminOrGodAdmin = user.role === 'admin' || user.role === 'god_admin';
  const isDepartmentHead = user.role === 'department_head';
  const isEmployee = !isAdminOrGodAdmin && !isDepartmentHead;

  const groupedMonitoring = groupDataByUser(monitoringData, 'monitoring');
  const groupedChat = groupDataByUser(chatHistory, 'chat');

  // Group by individual users for card display
  const getMonitoringByUser = () => {
    const userMap = new Map();
    monitoringData.forEach(record => {
      const userId = record.monitoredUserId?._id || record.monitoredUserId;
      const userKey = userId?.toString() || 'unknown';
      if (!userMap.has(userKey)) {
        userMap.set(userKey, {
          user: record.monitoredEmployeeId || record.monitoredUserId,
          records: []
        });
      }
      userMap.get(userKey).records.push(record);
    });
    return Array.from(userMap.values());
  };

  const getChatByUser = () => {
    const userMap = new Map();
    chatHistory.forEach(session => {
      const userId = session.userId?._id || session.userId;
      const userKey = userId?.toString() || 'unknown';
      if (!userMap.has(userKey)) {
        userMap.set(userKey, {
          user: session.employeeId || session.userId,
          sessions: []
        });
      }
      userMap.get(userKey).sessions.push(session);
    });
    return Array.from(userMap.values());
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
        .animate-scaleIn {
          animation: scaleIn 0.3s ease-out;
        }
      `}</style>

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
          <FaChartLine className="text-blue-600" />
          Productivity Monitoring
        </h1>
        <p className="text-gray-600 mt-2">
          {isAdminOrGodAdmin
            ? 'View productivity data and chat history for all employees'
            : isDepartmentHead
            ? 'View productivity data for your department members'
            : 'View your own productivity tracking and chat history'}
        </p>
      </div>

      {/* Screenshot Interval Configuration (Admin & Department Head only) */}
      {(isAdminOrGodAdmin || isDepartmentHead) && activeTab === 'monitoring' && (
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg shadow-md p-6 mb-6 border border-purple-200">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <FaClock className="text-purple-600 text-2xl" />
              <div>
                <h3 className="font-semibold text-gray-800">Screenshot Capture Interval</h3>
                <p className="text-sm text-gray-600">Set how often screenshots are automatically captured</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={screenshotInterval}
                onChange={(e) => setScreenshotInterval(parseInt(e.target.value))}
                className="px-4 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white"
              >
                <option value={1}>Every 1 minute</option>
                <option value={2}>Every 2 minutes</option>
                <option value={5}>Every 5 minutes</option>
                <option value={10}>Every 10 minutes</option>
                <option value={15}>Every 15 minutes</option>
                <option value={30}>Every 30 minutes</option>
                <option value={60}>Every 1 hour</option>
              </select>
              <button
                onClick={saveScreenshotInterval}
                disabled={savingInterval}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2 disabled:opacity-50"
              >
                <FaSave />
                {savingInterval ? 'Saving...' : 'Save'}
              </button>
            </div>
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
            Productivity Monitoring
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
      {loading ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading data...</p>
        </div>
      ) : activeTab === 'monitoring' ? (
        <div>
          <div className="mb-6 flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-800">
              Screen Monitoring Data
            </h2>
            <span className="text-sm text-gray-600 bg-gray-100 px-4 py-2 rounded-full">
              {monitoringData.length} record{monitoringData.length !== 1 ? 's' : ''}
            </span>
          </div>
          
          {/* Grid Layout for Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Own Monitoring Card */}
            {groupedMonitoring.own.length > 0 && renderMonitoringCard(
              'Your Productivity Monitoring',
              groupedMonitoring.own,
              'own-monitoring',
              user.employeeId || user
            )}

            {/* Department Heads Cards (Admin only) */}
            {isAdminOrGodAdmin && getMonitoringByUser()
              .filter(item => {
                const userId = item.user?._id || item.user?.userId;
                return departmentHeads.some(dh => dh.userId === userId || dh._id === userId);
              })
              .map((item, idx) => {
                const userInfo = item.user;
                return renderMonitoringCard(
                  `${userInfo?.name || 'Department Head'}`,
                  item.records,
                  `dh-monitoring-${idx}`,
                  userInfo
                );
              })
            }

            {/* Employee Cards */}
            {(isAdminOrGodAdmin || isDepartmentHead) && getMonitoringByUser()
              .filter(item => {
                const userId = item.user?._id || item.user?.userId;
                const isOwn = userId === user._id || userId === user.userId;
                const isDH = departmentHeads.some(dh => dh.userId === userId || dh._id === userId);
                return !isOwn && !isDH;
              })
              .map((item, idx) => {
                const userInfo = item.user;
                return renderMonitoringCard(
                  `${userInfo?.name || 'Employee'}`,
                  item.records,
                  `emp-monitoring-${idx}`,
                  userInfo
                );
              })
            }
          </div>

          {monitoringData.length === 0 && (
            <div className="bg-white rounded-xl shadow-lg p-16 text-center border-2 border-gray-200">
              <FaEye className="text-7xl text-gray-300 mx-auto mb-6" />
              <h3 className="text-xl font-bold text-gray-600 mb-2">No Monitoring Data</h3>
              <p className="text-gray-500">
                Productivity monitoring will appear here once captures are made
              </p>
            </div>
          )}
        </div>
      ) : (
        <div>
          <div className="mb-6 flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-800">
              MAYA Chat History
            </h2>
            <span className="text-sm text-gray-600 bg-gray-100 px-4 py-2 rounded-full">
              {chatHistory.length} session{chatHistory.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Grid Layout for Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Own Chat Card */}
            {groupedChat.own.length > 0 && renderChatCard(
              'Your MAYA Chat History',
              groupedChat.own,
              'own-chat',
              user.employeeId || user
            )}

            {/* Department Heads Cards (Admin only) */}
            {isAdminOrGodAdmin && getChatByUser()
              .filter(item => {
                const userId = item.user?._id || item.user?.userId;
                return departmentHeads.some(dh => dh.userId === userId || dh._id === userId);
              })
              .map((item, idx) => {
                const userInfo = item.user;
                return renderChatCard(
                  `${userInfo?.name || 'Department Head'}`,
                  item.sessions,
                  `dh-chat-${idx}`,
                  userInfo
                );
              })
            }

            {/* Employee Cards */}
            {(isAdminOrGodAdmin || isDepartmentHead) && getChatByUser()
              .filter(item => {
                const userId = item.user?._id || item.user?.userId;
                const isOwn = userId === user._id || userId === user.userId;
                const isDH = departmentHeads.some(dh => dh.userId === userId || dh._id === userId);
                return !isOwn && !isDH;
              })
              .map((item, idx) => {
                const userInfo = item.user;
                return renderChatCard(
                  `${userInfo?.name || 'Employee'}`,
                  item.sessions,
                  `emp-chat-${idx}`,
                  userInfo
                );
              })
            }
          </div>

          {chatHistory.length === 0 && (
            <div className="bg-white rounded-xl shadow-lg p-16 text-center border-2 border-gray-200">
              <FaHistory className="text-7xl text-gray-300 mx-auto mb-6" />
              <h3 className="text-xl font-bold text-gray-600 mb-2">No Chat History</h3>
              <p className="text-gray-500">
                MAYA conversations will appear here once employees start chatting
              </p>
            </div>
          )}
        </div>
      )}

      {/* Modal for displaying chat/monitoring details */}
      {isModalOpen && modalData && (
        <>
          {/* Backdrop with blur - covers entire screen including sidebar/header */}
          <div
            className="fixed inset-0"
            style={{
              backdropFilter: 'blur(5px)',
              WebkitBackdropFilter: 'blur(5px)',
              backgroundColor: 'transparent',
              zIndex: 99999
            }}
            onClick={closeModal}
          />

          {/* Modal Content */}
          <div className="fixed inset-0 flex items-center justify-center p-4 pointer-events-none" style={{ zIndex: 100000 }}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden animate-scaleIn pointer-events-auto">
              {/* Modal Header with Profile Picture - SOLID PROFESSIONAL COLOR */}
              <div
                className="px-6 py-4 flex items-center gap-4"
                style={{
                  backgroundColor: modalData.type === 'chat' ? '#3b82f6' : '#10b981'
                }}
              >
                {/* Profile Picture or Initial */}
                <div className="flex-shrink-0">
                  {modalData.userInfo?.profilePicture ? (
                    <img 
                      src={modalData.userInfo.profilePicture} 
                      alt={modalData.userInfo.name || 'User'}
                      className="w-14 h-14 rounded-full border-3 border-white shadow-lg object-cover"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full border-3 border-white shadow-lg bg-white flex items-center justify-center">
                      <span className="text-2xl font-bold text-blue-600">
                        {modalData.userInfo?.name?.charAt(0)?.toUpperCase() || 'U'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Title and Info */}
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-white">{modalData.title}</h2>
                  {modalData.userInfo && (
                    <p className="text-sm text-white text-opacity-90 mt-1">
                      {modalData.userInfo.employeeCode} - {modalData.userInfo.designation}
                    </p>
                  )}
                </div>

                {/* Close Button */}
                <button
                  onClick={closeModal}
                  className="flex-shrink-0 text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-all"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 80px)' }}>
              {modalData.type === 'chat' ? (
                <div className="space-y-6">
                  {modalData.data.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No chat history available</p>
                  ) : (
                    modalData.data.map((session, idx) => (
                      <div key={session._id || idx} className="bg-gray-50 rounded-xl p-6 border-2 border-gray-200">
                        <div className="flex justify-between items-center mb-4 pb-3 border-b-2 border-gray-300">
                          <span className="text-sm text-gray-600 font-semibold">
                            📅 {new Date(session.createdAt).toLocaleString()}
                          </span>
                          <span className="text-sm bg-blue-500 text-white px-3 py-1 rounded-full font-semibold">
                            {session.messages?.length || 0} messages
                          </span>
                        </div>
                        
                        {/* WhatsApp-style messages */}
                        <div className="space-y-4">
                          {session.messages && session.messages.map((msg, msgIdx) => (
                            <div key={msgIdx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                              <div className={`max-w-[75%] rounded-2xl px-5 py-3 shadow-md ${
                                msg.role === 'user'
                                  ? 'bg-blue-500 text-white rounded-br-sm'
                                  : 'bg-white text-gray-800 rounded-bl-sm border-2 border-gray-200'
                              }`}>
                                <p className="text-sm leading-relaxed break-words">{msg.content}</p>
                                <p className={`text-xs mt-2 ${
                                  msg.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                                }`}>
                                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  {modalData.data.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No monitoring data available</p>
                  ) : (
                    modalData.data.map((record) => (
                      <div key={record._id} className="bg-gray-50 rounded-xl overflow-hidden border-2 border-gray-200">
                        {/* Split View: Screenshot Left, Summary Right */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
                          {/* Left: Screenshot */}
                          <div className="flex flex-col">
                            <div className="flex justify-between items-center mb-4">
                              <span className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                <FaEye className="text-green-600" />
                                Screenshot
                              </span>
                              <span className="text-xs text-gray-500 bg-white px-3 py-1.5 rounded-full border border-gray-300">
                                {new Date(record.createdAt).toLocaleString()}
                              </span>
                            </div>
                            {record.screenshotUrl ? (
                              <img 
                                src={record.screenshotUrl} 
                                alt="Screen capture" 
                                className="w-full h-auto rounded-xl border-2 border-gray-300 object-contain shadow-lg"
                              />
                            ) : (
                              <div className="w-full h-96 bg-white rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center">
                                <p className="text-gray-400 text-lg">No screenshot available</p>
                              </div>
                            )}
                          </div>

                          {/* Right: AI Summary & Productivity Insights */}
                          <div className="flex flex-col">
                            <div className="mb-4">
                              <span className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                <FaChartLine className="text-blue-600" />
                                AI Analysis & Insights
                              </span>
                            </div>
                            
                            <div className="flex-1 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-5 border-2 border-blue-200 shadow-md">
                              <h4 className="font-bold text-gray-800 mb-3 text-lg">
                                📊 Summary
                              </h4>
                              <p className="text-sm text-gray-700 mb-5 leading-relaxed">
                                {record.summary || 'No summary available'}
                              </p>

                              {record.currentPage && (
                                <div className="mb-4 p-4 bg-white rounded-xl border-2 border-gray-200 shadow-sm">
                                  <p className="text-sm font-bold text-gray-700 mb-2">📄 Current Page</p>
                                  <p className="text-sm text-gray-800 break-words">
                                    {record.currentPage.title || record.currentPage.url}
                                  </p>
                                </div>
                              )}

                              {record.activities && record.activities.length > 0 && (
                                <div className="mb-4 p-4 bg-white rounded-xl border-2 border-gray-200 shadow-sm">
                                  <p className="text-sm font-bold text-gray-700 mb-3">🎯 Activities Detected</p>
                                  <div className="flex flex-wrap gap-2">
                                    {record.activities.map((activity, idx) => (
                                      <span key={idx} className="text-xs bg-green-100 text-green-700 px-3 py-1.5 rounded-full font-semibold">
                                        {activity}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Productivity Recommendations */}
                              <div className="mt-4 p-4 bg-yellow-50 border-2 border-yellow-300 rounded-xl shadow-sm">
                                <p className="text-sm font-bold text-yellow-800 mb-2">💡 Productivity Tips</p>
                                <p className="text-sm text-yellow-700 leading-relaxed">
                                  {record.productivityTips || 'Continue focusing on your current tasks. Regular breaks every 45-60 minutes can help maintain productivity.'}
                                </p>
                              </div>

                              <div className="mt-4 flex justify-between items-center">
                                <span className={`px-4 py-2 rounded-full font-bold text-sm ${
                                  record.status === 'captured' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                                }`}>
                                  {record.status}
                                </span>
                                {record.confidenceScore && (
                                  <span className="text-sm text-gray-700 font-semibold">
                                    Confidence: {Math.round(record.confidenceScore * 100)}%
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

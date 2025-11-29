'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { FaEye, FaHistory, FaUsers, FaChartLine, FaCalendar, FaFilter, FaChevronDown, FaChevronUp, FaClock, FaSave, FaCamera, FaPlay, FaPause, FaChevronLeft, FaChevronRight, FaExpand, FaCompress, FaDesktop, FaLaptop, FaUser } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { formatLocalDateTime, formatLocalDateOnly, formatLocalTime } from '@/lib/browserTimezone';

export default function ProductivityMonitoringPage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [monitoringData, setMonitoringData] = useState([]);
  const [chatHistory, setChatHistory] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [departmentHeads, setDepartmentHeads] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [activeTab, setActiveTab] = useState('monitoring');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [includeScreenshots, setIncludeScreenshots] = useState(true);
  const [screenshotInterval, setScreenshotInterval] = useState(5);
  const [savingInterval, setSavingInterval] = useState(false);
  const [modalData, setModalData] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [capturingInstant, setCapturingInstant] = useState(null);
  const [selectedCaptureTarget, setSelectedCaptureTarget] = useState('');
  const [accessibleEmployees, setAccessibleEmployees] = useState([]);
  const [isUserDepartmentHead, setIsUserDepartmentHead] = useState(false);
  const [userDepartment, setUserDepartment] = useState(null);
  const [expandedSessions, setExpandedSessions] = useState(new Set());
  const [selectedUserFilter, setSelectedUserFilter] = useState('all');

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      checkIfDepartmentHead(parsedUser);
      fetchEmployees(parsedUser);
      fetchAllData(parsedUser);
      
      const savedInterval = localStorage.getItem('screenshotInterval');
      if (savedInterval) {
        setScreenshotInterval(parseInt(savedInterval));
      }
    }
  }, []);

  const checkIfDepartmentHead = async (currentUser) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/team/check-head', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (data.success) {
        const isDH = data.isDepartmentHead || data.isTeamLead || false;
        const deptId = data.departmentId || data.department?._id || null;
        
        setIsUserDepartmentHead(isDH);
        setUserDepartment(deptId);
        
        if (isDH || currentUser.role === 'admin' || currentUser.role === 'god_admin') {
          fetchAccessibleEmployees(currentUser, deptId);
        }
      }
    } catch (error) {
      console.error('Failed to check department head status:', error);
    }
  };

  const fetchEmployees = async (currentUser) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/employees', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        const allEmployees = data.employees || [];
        const heads = allEmployees.filter(emp => 
          emp.designation?.toLowerCase().includes('head') || emp.role === 'department_head'
        );
        const regularEmps = allEmployees.filter(emp => 
          !emp.designation?.toLowerCase().includes('head') && emp.role !== 'department_head'
        );
        setDepartmentHeads(heads);
        setEmployees(regularEmps);
      }
    } catch (error) {
      console.error('Failed to fetch employees:', error);
    }
  };

  const fetchAccessibleEmployees = async (currentUser, departmentId = null) => {
    try {
      const token = localStorage.getItem('token');
      let url = '/api/employees?status=active';
      
      if (departmentId && currentUser.role !== 'admin' && currentUser.role !== 'god_admin') {
        url += `&department=${departmentId}`;
      }
      
      const response = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await response.json();
      if (data.success) {
        const emps = data.employees || data.data || [];
        const filtered = emps.filter(emp => {
          const empUserId = emp.userId?._id || emp.userId || emp._id;
          const currentUserId = currentUser._id || currentUser.userId;
          return empUserId?.toString() !== currentUserId?.toString();
        });
        setAccessibleEmployees(filtered);
      }
    } catch (error) {
      console.error('Failed to fetch accessible employees:', error);
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

      const response = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await response.json();
      
      if (data.success) {
        const completedCaptures = (data.data || []).filter(item => item.status !== 'pending');
        setMonitoringData(completedCaptures);
      } else {
        toast.error(data.error || 'Failed to fetch monitoring data');
      }
    } catch (error) {
      toast.error('Failed to load monitoring data');
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

      const response = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await response.json();
      
      if (data.success) {
        setChatHistory(data.data || []);
      } else {
        toast.error(data.error || 'Failed to fetch chat history');
      }
    } catch (error) {
      toast.error('Failed to load chat history');
    } finally {
      setLoading(false);
    }
  };

  const openModal = (type, title, data, userInfo) => {
    setModalData({ type, title, data, userInfo });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setTimeout(() => setModalData(null), 300);
  };

  const saveScreenshotInterval = async () => {
    try {
      setSavingInterval(true);
      localStorage.setItem('screenshotInterval', screenshotInterval.toString());
      toast.success(`Screenshot interval set to ${screenshotInterval} minutes`);
      
      const token = localStorage.getItem('token');
      await fetch('/api/settings/screenshot-interval', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ interval: screenshotInterval })
      });
    } catch (error) {
      console.error('Failed to save interval:', error);
    } finally {
      setSavingInterval(false);
    }
  };

  const handleCaptureFromDropdown = async () => {
    if (!selectedCaptureTarget) {
      toast.error('Please select an employee to capture');
      return;
    }

    if (selectedCaptureTarget === 'all') {
      await captureAllEmployees();
    } else {
      const employee = accessibleEmployees.find(emp => {
        const empUserId = emp.userId?._id || emp.userId || emp._id;
        return empUserId === selectedCaptureTarget;
      });
      if (employee) {
        const empName = `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || 'Employee';
        await requestInstantCapture(selectedCaptureTarget, empName);
      } else {
        toast.error('Employee not found');
      }
    }
    setSelectedCaptureTarget('');
  };

  const captureAllEmployees = async () => {
    const totalEmployees = accessibleEmployees.length;
    if (totalEmployees === 0) {
      toast.error('No employees available to capture');
      return;
    }

    toast.loading(`Initiating capture for ${totalEmployees} employees...`, { duration: 2000 });

    let successCount = 0;
    let failCount = 0;

    for (const employee of accessibleEmployees) {
      try {
        const empUserId = employee.userId?._id || employee.userId || employee._id;
        if (!empUserId) { failCount++; continue; }
        
        const token = localStorage.getItem('token');
        const response = await fetch('/api/productivity/instant-capture', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ targetUserId: empUserId }),
        });

        if (response.ok) successCount++;
        else failCount++;
      } catch (error) {
        failCount++;
      }
    }

    if (successCount > 0) {
      toast.success(`Capture requested for ${successCount} employee${successCount !== 1 ? 's' : ''}!`);
      setTimeout(() => fetchAllData(user), 3000);
    }
    if (failCount > 0) {
      toast.error(`Failed to capture ${failCount} employee${failCount !== 1 ? 's' : ''}`);
    }
  };

  const requestInstantCapture = async (targetUserId, targetUserName) => {
    if (capturingInstant) {
      toast.error('Please wait for the current capture to complete');
      return;
    }

    if (!targetUserId) {
      toast.error('Invalid user ID');
      return;
    }

    setCapturingInstant(targetUserId);
    toast.loading(`Requesting instant capture from ${targetUserName}...`, { id: 'instant-capture' });

    try {
      const response = await fetch('/api/productivity/instant-capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ targetUserId })
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success(`Instant capture requested for ${targetUserName}. Waiting for screenshot...`, { id: 'instant-capture' });
        
        let attempts = 0;
        const maxAttempts = 30;
        const pollInterval = setInterval(async () => {
          attempts++;
          
          try {
            const statusResponse = await fetch(
              `/api/productivity/instant-capture?requestId=${data.data.requestId}`,
              { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }
            );
            
            const statusData = await statusResponse.json();
            
            if (statusData.success && statusData.data.status !== 'pending') {
              clearInterval(pollInterval);
              setCapturingInstant(null);
              
              if (statusData.data.status === 'analyzed' || statusData.data.status === 'captured') {
                toast.success(`Screenshot captured! Score: ${statusData.data.productivityScore || 'N/A'}`, { id: 'instant-capture', duration: 4000 });
                await fetchAllData(user);
              } else {
                toast.error('Capture failed', { id: 'instant-capture' });
              }
            } else if (attempts >= maxAttempts) {
              clearInterval(pollInterval);
              setCapturingInstant(null);
              toast.error('Capture timeout - desktop app may not be running', { id: 'instant-capture' });
            }
          } catch (err) {
            console.error('Poll error:', err);
          }
        }, 1000);
      } else {
        toast.error(data.error || 'Failed to request instant capture', { id: 'instant-capture' });
        setCapturingInstant(null);
      }
    } catch (error) {
      toast.error('Failed to request instant capture', { id: 'instant-capture' });
      setCapturingInstant(null);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'monitoring') fetchMonitoringData(user);
    else fetchChatHistory(user);
  };

  const handleDateFilter = () => {
    if (activeTab === 'monitoring') fetchMonitoringData(user);
    else fetchChatHistory(user);
  };

  const toggleSessionExpand = (sessionId) => {
    setExpandedSessions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sessionId)) newSet.delete(sessionId);
      else newSet.add(sessionId);
      return newSet;
    });
  };

  // Group sessions by user
  const getSessionsByUser = () => {
    const userMap = new Map();
    const currentUserId = user?._id?.toString() || user?.userId?.toString();
    
    monitoringData.forEach(session => {
      const userId = session.monitoredUserId?._id?.toString() || session.monitoredUserId?.toString();
      const userKey = userId || 'unknown';
      
      if (!userMap.has(userKey)) {
        const employeeInfo = session.monitoredEmployeeId || {};
        const userInfo = session.monitoredUserId || {};
        
        let userName = 'Unknown User';
        if (employeeInfo.firstName) {
          userName = `${employeeInfo.firstName} ${employeeInfo.lastName || ''}`.trim();
        } else if (employeeInfo.name) {
          userName = employeeInfo.name;
        } else if (userInfo.name) {
          userName = userInfo.name;
        }
        
        userMap.set(userKey, {
          user: {
            _id: userId,
            userId: userId,
            name: userName,
            employeeCode: employeeInfo.employeeCode || '',
            designation: employeeInfo.designation?.title || employeeInfo.designation || '',
            department: employeeInfo.department?.name || employeeInfo.department || '',
            profilePicture: employeeInfo.profilePicture || userInfo.profilePicture || null
          },
          sessions: [],
          isOwn: userId === currentUserId
        });
      }
      userMap.get(userKey).sessions.push(session);
    });
    
    // Sort sessions by date for each user
    userMap.forEach(userData => {
      userData.sessions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    });
    
    return Array.from(userMap.values());
  };

  // Get unique users for filter dropdown
  const getUniqueUsers = () => {
    const users = getSessionsByUser();
    return users.map(u => ({ id: u.user._id, name: u.user.name, isOwn: u.isOwn }));
  };

  // Filter sessions by selected user
  const getFilteredSessions = () => {
    const allUserData = getSessionsByUser();
    if (selectedUserFilter === 'all') {
      return allUserData;
    }
    return allUserData.filter(u => u.user._id === selectedUserFilter);
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
  const isDepartmentHead = isUserDepartmentHead || user.role === 'department_head';
  const canViewTeamData = isAdminOrGodAdmin || isDepartmentHead;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <style jsx>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes slideIn { from { transform: translateX(20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
        .animate-scaleIn { animation: scaleIn 0.3s ease-out; }
        .animate-slideIn { animation: slideIn 0.3s ease-out; }
      `}</style>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
          <FaChartLine className="text-blue-600" />
          Productivity Monitoring
        </h1>
        <p className="text-gray-600 mt-2">
          {isAdminOrGodAdmin
            ? 'View productivity sessions and analytics for all employees'
            : isDepartmentHead
            ? 'View productivity sessions for your department members'
            : 'View your own productivity tracking sessions'}
        </p>
      </div>

      {/* Desktop App Info */}
      {(isAdminOrGodAdmin || isDepartmentHead) && activeTab === 'monitoring' && (
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 rounded-r-lg">
          <div className="flex items-start gap-3">
            <div className="text-blue-500 text-xl mt-0.5">ℹ️</div>
            <div>
              <h4 className="font-semibold text-blue-900 mb-1">Desktop App Required</h4>
              <p className="text-sm text-blue-800">
                Instant capture requires the <strong>MAYA Desktop App</strong> to be running on the employee's computer.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Instant Capture Panel */}
      {(isAdminOrGodAdmin || isDepartmentHead) && activeTab === 'monitoring' && (
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                <FaCamera className="text-purple-600 text-2xl" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Instant Screenshot Capture</h3>
                <p className="text-purple-100 text-sm">Capture screenshots on-demand from employees</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={selectedCaptureTarget}
                onChange={(e) => setSelectedCaptureTarget(e.target.value)}
                className="px-4 py-2.5 border-2 border-white bg-white text-gray-800 rounded-lg min-w-[250px] font-medium"
              >
                <option value="">Select Employee...</option>
                <option value="all" className="font-bold bg-purple-50">📸 Capture All ({accessibleEmployees.length})</option>
                <option disabled>──────────</option>
                {accessibleEmployees.map((emp) => {
                  const empUserId = emp.userId?._id || emp.userId || emp._id;
                  const empName = `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || 'Unknown';
                  const empCode = emp.employeeCode || 'N/A';
                  const designation = emp.designation?.title || emp.designation?.levelName || 'Employee';
                  return (
                    <option key={empUserId} value={empUserId}>
                      {empName} ({empCode}) - {designation}
                    </option>
                  );
                })}
              </select>
              <button
                onClick={handleCaptureFromDropdown}
                disabled={!selectedCaptureTarget || capturingInstant}
                className="px-6 py-2.5 bg-white text-purple-600 rounded-lg font-bold hover:bg-purple-50 disabled:opacity-50 flex items-center gap-2"
              >
                {capturingInstant ? (
                  <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>Capturing...</>
                ) : (
                  <><FaEye />Capture Now</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Screenshot Interval */}
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
                className="px-4 py-2 border border-purple-300 rounded-lg bg-white"
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
                <FaSave />{savingInterval ? 'Saving...' : 'Save'}
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
            className="px-4 py-2 border border-gray-300 rounded-lg"
          />
          <span className="text-gray-500">to</span>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          />
          <button
            onClick={handleDateFilter}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <FaFilter />Apply Filter
          </button>
          
          {/* User Filter */}
          {canViewTeamData && activeTab === 'monitoring' && (
            <select
              value={selectedUserFilter}
              onChange={(e) => setSelectedUserFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg ml-auto"
            >
              <option value="all">All Users</option>
              {getUniqueUsers().map(u => (
                <option key={u.id} value={u.id}>
                  {u.isOwn ? 'You' : u.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="flex border-b">
          <button
            onClick={() => handleTabChange('monitoring')}
            className={`flex-1 px-6 py-4 font-semibold flex items-center justify-center gap-2 ${
              activeTab === 'monitoring' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <FaEye />Productivity Sessions
          </button>
          <button
            onClick={() => handleTabChange('chat')}
            className={`flex-1 px-6 py-4 font-semibold flex items-center justify-center gap-2 ${
              activeTab === 'chat' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <FaHistory />MAYA Chat History
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading sessions...</p>
        </div>
      ) : activeTab === 'monitoring' ? (
        <div className="space-y-6">
          {/* Stats Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
              <div className="text-2xl font-bold text-blue-600">{monitoringData.length}</div>
              <div className="text-sm text-gray-600">Total Sessions</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
              <div className="text-2xl font-bold text-green-600">
                {Math.round(monitoringData.reduce((sum, s) => sum + (s.productivityScore || 0), 0) / Math.max(monitoringData.length, 1))}%
              </div>
              <div className="text-sm text-gray-600">Avg Productivity</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-purple-500">
              <div className="text-2xl font-bold text-purple-600">{getUniqueUsers().length}</div>
              <div className="text-sm text-gray-600">Active Users</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-orange-500">
              <div className="text-2xl font-bold text-orange-600">
                {Math.round(monitoringData.reduce((sum, s) => sum + (s.totalActiveTime || 0), 0) / 60000)} min
              </div>
              <div className="text-sm text-gray-600">Total Active Time</div>
            </div>
          </div>

          {/* Sessions by User */}
          {getFilteredSessions().map((userData, userIdx) => (
            <div key={userData.user._id || userIdx} className="bg-white rounded-xl shadow-lg overflow-hidden animate-fadeIn">
              {/* User Header */}
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4 flex items-center gap-4">
                {userData.user.profilePicture ? (
                  <img src={userData.user.profilePicture} alt={userData.user.name} className="w-14 h-14 rounded-full border-3 border-white shadow-lg object-cover" />
                ) : (
                  <div className="w-14 h-14 rounded-full border-3 border-white shadow-lg bg-white flex items-center justify-center">
                    <span className="text-2xl font-bold text-blue-600">{userData.user.name?.charAt(0)?.toUpperCase() || 'U'}</span>
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    {userData.isOwn ? 'Your Sessions' : userData.user.name}
                    {userData.isOwn && <span className="text-xs bg-white/20 px-2 py-1 rounded-full">You</span>}
                  </h3>
                  <p className="text-blue-100 text-sm">{userData.user.designation || userData.user.employeeCode || 'Employee'}</p>
                </div>
                <div className="text-right text-white">
                  <div className="text-2xl font-bold">{userData.sessions.length}</div>
                  <div className="text-sm text-blue-100">Sessions</div>
                </div>
              </div>

              {/* Sessions List */}
              <div className="divide-y divide-gray-100">
                {userData.sessions.map((session, sessionIdx) => (
                  <SessionCard 
                    key={session._id || sessionIdx} 
                    session={session} 
                    isExpanded={expandedSessions.has(session._id)}
                    onToggle={() => toggleSessionExpand(session._id)}
                    openModal={openModal}
                    userData={userData}
                  />
                ))}
              </div>
            </div>
          ))}

          {monitoringData.length === 0 && (
            <div className="bg-white rounded-xl shadow-lg p-16 text-center border-2 border-gray-200">
              <FaEye className="text-7xl text-gray-300 mx-auto mb-6" />
              <h3 className="text-xl font-bold text-gray-600 mb-2">No Productivity Sessions</h3>
              <p className="text-gray-500">Sessions will appear here once captures are made</p>
            </div>
          )}
        </div>
      ) : (
        /* Chat History Tab */
        <div>
          <div className="mb-6 flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-800">MAYA Chat History</h2>
            <span className="text-sm text-gray-600 bg-gray-100 px-4 py-2 rounded-full">
              {chatHistory.length} session{chatHistory.length !== 1 ? 's' : ''}
            </span>
          </div>
          
          {chatHistory.length === 0 ? (
            <div className="bg-white rounded-xl shadow-lg p-16 text-center border-2 border-gray-200">
              <FaHistory className="text-7xl text-gray-300 mx-auto mb-6" />
              <h3 className="text-xl font-bold text-gray-600 mb-2">No Chat History</h3>
              <p className="text-gray-500">MAYA conversations will appear here</p>
            </div>
          ) : (
            <div className="space-y-4">
              {chatHistory.map((session, idx) => (
                <div key={session._id || idx} className="bg-white rounded-xl shadow p-6 border border-gray-200">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-sm text-gray-600">{formatLocalDateTime(session.createdAt)}</span>
                    <span className="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded-full">
                      {session.messages?.length || 0} messages
                    </span>
                  </div>
                  <div className="space-y-3 max-h-48 overflow-y-auto">
                    {session.messages?.slice(0, 4).map((msg, msgIdx) => (
                      <div key={msgIdx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] rounded-xl px-4 py-2 text-sm ${
                          msg.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {msg.content?.substring(0, 150)}{msg.content?.length > 150 ? '...' : ''}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Session Card Component with Screenshot Slider
function SessionCard({ session, isExpanded, onToggle, openModal, userData }) {
  const [currentScreenshot, setCurrentScreenshot] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const playIntervalRef = useRef(null);
  
  // Collect all screenshots from the session
  const screenshots = [];
  if (session.screenshotUrl) screenshots.push({ url: session.screenshotUrl, time: session.createdAt });
  if (session.screenshot?.data) {
    const dataUrl = session.screenshot.data.startsWith('data:') 
      ? session.screenshot.data 
      : `data:image/png;base64,${session.screenshot.data}`;
    screenshots.push({ url: dataUrl, time: session.screenshot.capturedAt || session.createdAt });
  }
  
  const productivityScore = session.productivityScore || session.aiAnalysis?.productivityScore || 0;
  const summary = session.summary || session.aiAnalysis?.summary || 'Session data captured';
  const insights = session.productivityInsights || session.aiAnalysis?.insights || [];
  const tips = session.productivityTips || session.aiAnalysis?.recommendations?.join('. ') || '';
  const achievements = session.topAchievements || session.aiAnalysis?.topAchievements || [];
  const improvements = session.areasOfImprovement || session.aiAnalysis?.areasOfImprovement || [];
  
  const totalMins = Math.round((session.totalActiveTime || 0) / 60000);
  const productivePercent = session.totalActiveTime > 0 
    ? Math.round((session.productiveTime / session.totalActiveTime) * 100) 
    : 0;

  // Auto-play screenshots
  useEffect(() => {
    if (isPlaying && screenshots.length > 1) {
      playIntervalRef.current = setInterval(() => {
        setCurrentScreenshot(prev => (prev + 1) % screenshots.length);
      }, 3000);
    } else {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    }
    return () => {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    };
  }, [isPlaying, screenshots.length]);

  const nextScreenshot = () => setCurrentScreenshot(prev => (prev + 1) % screenshots.length);
  const prevScreenshot = () => setCurrentScreenshot(prev => (prev - 1 + screenshots.length) % screenshots.length);

  return (
    <div className="bg-white hover:bg-gray-50 transition-colors">
      {/* Session Header - Always visible */}
      <div 
        className="px-6 py-4 cursor-pointer flex items-center gap-4"
        onClick={onToggle}
      >
        {/* Time */}
        <div className="flex-shrink-0 text-center w-20">
          <div className="text-lg font-bold text-gray-800">{formatLocalTime(session.createdAt)}</div>
          <div className="text-xs text-gray-500">{formatLocalDateOnly(session.createdAt)}</div>
        </div>

        {/* Progress Bar */}
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <div className="h-2 flex-1 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full ${
                  productivityScore >= 70 ? 'bg-green-500' :
                  productivityScore >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${productivityScore}%` }}
              />
            </div>
            <span className={`text-lg font-bold ${
              productivityScore >= 70 ? 'text-green-600' :
              productivityScore >= 40 ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {productivityScore}%
            </span>
          </div>
          <p className="text-sm text-gray-600 truncate">{summary}</p>
        </div>

        {/* Quick Stats */}
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <div className="flex items-center gap-1">
            <FaClock className="text-gray-400" />
            <span>{totalMins} min</span>
          </div>
          {session.topApps?.length > 0 && (
            <div className="flex items-center gap-1">
              <FaDesktop className="text-gray-400" />
              <span>{session.topApps.length} apps</span>
            </div>
          )}
          {screenshots.length > 0 && (
            <div className="flex items-center gap-1">
              <FaCamera className="text-gray-400" />
              <span>{screenshots.length}</span>
            </div>
          )}
        </div>

        {/* Expand Icon */}
        <div className="flex-shrink-0">
          {isExpanded ? (
            <FaChevronUp className="text-gray-400" />
          ) : (
            <FaChevronDown className="text-gray-400" />
          )}
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-6 pb-6 border-t border-gray-100 pt-4 animate-slideIn">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Screenshot Slider */}
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-semibold text-gray-800">Screenshots</h4>
                {screenshots.length > 1 && (
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={(e) => { e.stopPropagation(); setIsPlaying(!isPlaying); }}
                      className="p-2 bg-white rounded-full shadow hover:bg-gray-100"
                    >
                      {isPlaying ? <FaPause className="text-gray-600 w-3 h-3" /> : <FaPlay className="text-gray-600 w-3 h-3" />}
                    </button>
                    <span className="text-xs text-gray-500">{currentScreenshot + 1}/{screenshots.length}</span>
                  </div>
                )}
              </div>
              
              {screenshots.length > 0 ? (
                <div className="relative">
                  <img 
                    src={screenshots[currentScreenshot]?.url}
                    alt="Screenshot"
                    className="w-full h-auto rounded-lg border border-gray-200 shadow-md"
                  />
                  
                  {screenshots.length > 1 && (
                    <>
                      <button 
                        onClick={(e) => { e.stopPropagation(); prevScreenshot(); }}
                        className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-white/80 rounded-full shadow hover:bg-white"
                      >
                        <FaChevronLeft className="text-gray-600" />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); nextScreenshot(); }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white/80 rounded-full shadow hover:bg-white"
                      >
                        <FaChevronRight className="text-gray-600" />
                      </button>
                      
                      {/* Dots */}
                      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1">
                        {screenshots.map((_, idx) => (
                          <button 
                            key={idx}
                            onClick={(e) => { e.stopPropagation(); setCurrentScreenshot(idx); }}
                            className={`w-2 h-2 rounded-full transition-colors ${
                              idx === currentScreenshot ? 'bg-blue-500' : 'bg-white/60'
                            }`}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="h-48 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
                  No screenshot available
                </div>
              )}
            </div>

            {/* Right: AI Insights */}
            <div className="space-y-4">
              {/* Summary */}
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-4 border border-blue-200">
                <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                  <FaChartLine className="text-blue-600" /> AI Analysis
                </h4>
                <p className="text-sm text-gray-700">{summary}</p>
              </div>

              {/* Key Insights */}
              {insights.length > 0 && (
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                  <h5 className="font-semibold text-blue-800 mb-2">💡 Key Insights</h5>
                  <ul className="space-y-1">
                    {insights.slice(0, 3).map((insight, idx) => (
                      <li key={idx} className="text-sm text-blue-700 flex items-start gap-2">
                        <span className="text-blue-400">•</span>{insight}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Productivity Tips */}
              {tips && (
                <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
                  <h5 className="font-semibold text-yellow-800 mb-2">
                    💡 Tips
                    {session.captureMode === 'instant' && (
                      <span className="ml-2 text-xs bg-purple-500 text-white px-2 py-0.5 rounded-full">Instant</span>
                    )}
                  </h5>
                  <p className="text-sm text-yellow-700">{tips}</p>
                </div>
              )}

              {/* Achievements & Improvements */}
              <div className="grid grid-cols-2 gap-3">
                {achievements.length > 0 && (
                  <div className="bg-green-50 rounded-xl p-3 border border-green-200">
                    <h5 className="font-semibold text-green-800 text-sm mb-2">🏆 Achievements</h5>
                    <ul className="space-y-1">
                      {achievements.slice(0, 2).map((a, idx) => (
                        <li key={idx} className="text-xs text-green-700">{a}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {improvements.length > 0 && (
                  <div className="bg-orange-50 rounded-xl p-3 border border-orange-200">
                    <h5 className="font-semibold text-orange-800 text-sm mb-2">📈 Improve</h5>
                    <ul className="space-y-1">
                      {improvements.slice(0, 2).map((a, idx) => (
                        <li key={idx} className="text-xs text-orange-700">{a}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Top Apps */}
              {session.topApps?.length > 0 && (
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <h5 className="font-semibold text-gray-800 text-sm mb-3">💻 Top Applications</h5>
                  <div className="space-y-2">
                    {session.topApps.slice(0, 4).map((app, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="text-sm text-gray-700 flex-1 truncate">{app.appName}</span>
                        <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500" style={{ width: `${app.percentage || 0}%` }} />
                        </div>
                        <span className="text-xs text-gray-500 w-10 text-right">{app.percentage}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Time Distribution Bar */}
          {session.totalActiveTime > 0 && (
            <div className="mt-4 bg-gray-50 rounded-xl p-4 border border-gray-200">
              <h5 className="font-semibold text-gray-800 text-sm mb-3">Time Distribution</h5>
              <div className="flex h-4 rounded-full overflow-hidden">
                <div 
                  className="bg-green-500" 
                  style={{ width: `${productivePercent}%` }}
                  title={`Productive: ${Math.round((session.productiveTime || 0) / 60000)} min`}
                />
                <div 
                  className="bg-gray-400" 
                  style={{ width: `${session.totalActiveTime > 0 ? Math.round((session.neutralTime / session.totalActiveTime) * 100) : 0}%` }}
                  title={`Neutral: ${Math.round((session.neutralTime || 0) / 60000)} min`}
                />
                <div 
                  className="bg-red-500" 
                  style={{ width: `${session.totalActiveTime > 0 ? Math.round((session.unproductiveTime / session.totalActiveTime) * 100) : 0}%` }}
                  title={`Unproductive: ${Math.round((session.unproductiveTime || 0) / 60000)} min`}
                />
              </div>
              <div className="flex justify-between mt-2 text-xs text-gray-500">
                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-green-500 rounded-full"></span> Productive</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-gray-400 rounded-full"></span> Neutral</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-red-500 rounded-full"></span> Unproductive</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

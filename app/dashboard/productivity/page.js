'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FaEye, FaHistory, FaUsers, FaChartLine, FaCalendar, FaFilter, FaChevronDown, FaChevronUp, FaClock, FaSave, FaCamera } from 'react-icons/fa';
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
  const [activeTab, setActiveTab] = useState('monitoring'); // 'monitoring' or 'chat'
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [includeScreenshots, setIncludeScreenshots] = useState(true);
  const [expandedCards, setExpandedCards] = useState(new Set());
  const [screenshotInterval, setScreenshotInterval] = useState(5); // minutes
  const [savingInterval, setSavingInterval] = useState(false);
  const [modalData, setModalData] = useState(null); // { type: 'chat' | 'monitoring', title, data, userInfo }
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [capturingInstant, setCapturingInstant] = useState(null); // userId being captured
  const [selectedCaptureTarget, setSelectedCaptureTarget] = useState(''); // Employee ID for instant capture
  const [showCaptureDropdown, setShowCaptureDropdown] = useState(false);
  const [accessibleEmployees, setAccessibleEmployees] = useState([]); // Employees user can capture
  const [isUserDepartmentHead, setIsUserDepartmentHead] = useState(false); // Track if user is department head
  const [userDepartment, setUserDepartment] = useState(null); // User's department (if they are head)

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
      
      // Load saved screenshot interval
      const savedInterval = localStorage.getItem('screenshotInterval');
      if (savedInterval) {
        setScreenshotInterval(parseInt(savedInterval));
      }
    }
  }, []);

  // Check if user is a department head (via Department.head field - not by role or designation)
  const checkIfDepartmentHead = async (currentUser) => {
    try {
      const token = localStorage.getItem('token');
      
      // Use the team/check-head API which checks if user is head of any department
      const response = await fetch('/api/team/check-head', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (data.success) {
        const isDH = data.isDepartmentHead || data.isTeamLead || false;
        const deptId = data.departmentId || data.department?._id || null;
        
        setIsUserDepartmentHead(isDH);
        setUserDepartment(deptId);
        
        console.log('[Productivity] Department head check result:', { isDH, departmentId: deptId, data });
        
        // If user is department head or admin, fetch accessible employees
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

  const fetchAccessibleEmployees = async (currentUser, departmentId = null) => {
    try {
      const token = localStorage.getItem('token');
      let url = '/api/employees?status=active';
      
      // If department ID is provided (for department heads), filter by it
      if (departmentId && currentUser.role !== 'admin' && currentUser.role !== 'god_admin') {
        url += `&department=${departmentId}`;
      }
      // Admin and god_admin get all employees (no department filter)
      
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        const emps = data.employees || data.data || [];
        // Filter out current user from the list (for instant capture dropdown)
        const filtered = emps.filter(emp => {
          // userId is an object with _id, so compare properly
          const empUserId = emp.userId?._id || emp.userId || emp._id;
          const currentUserId = currentUser._id || currentUser.userId;
          return empUserId?.toString() !== currentUserId?.toString();
        });
        console.log('[Productivity] Accessible employees loaded:', filtered.length, 'for department:', departmentId);
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

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (data.success) {
        // Filter out pending captures (waiting for desktop app upload)
        const completedCaptures = (data.data || []).filter(item => 
          item.status !== 'pending'
        );
        setMonitoringData(completedCaptures);
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

  const handleCaptureFromDropdown = async () => {
    if (!selectedCaptureTarget) {
      toast.error('Please select an employee to capture');
      return;
    }

    if (selectedCaptureTarget === 'all') {
      // Capture all accessible employees
      await captureAllEmployees();
    } else {
      // Capture single employee - selectedCaptureTarget is already the user ID
      const employee = accessibleEmployees.find(emp => {
        const empUserId = emp.userId?._id || emp.userId || emp._id;
        return empUserId === selectedCaptureTarget;
      });
      if (employee) {
        const empName = `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || 'Employee';
        // selectedCaptureTarget is already the correct user ID
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
        // userId is an object with _id, email, role
        const empUserId = employee.userId?._id || employee.userId || employee._id;
        const empName = `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || 'Employee';
        
        if (!empUserId) {
          console.error('No user ID found for employee:', employee);
          failCount++;
          continue;
        }
        
        const token = localStorage.getItem('token');
        const response = await fetch('/api/productivity/instant-capture', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ targetUserId: empUserId }),
        });

        if (response.ok) {
          successCount++;
        } else {
          failCount++;
        }
      } catch (error) {
        failCount++;
      }
    }

    if (successCount > 0) {
      toast.success(`Capture requested for ${successCount} employee${successCount !== 1 ? 's' : ''}!`);
      // Refresh data after a delay to allow captures to complete
      setTimeout(() => {
        fetchAllData(user);
      }, 3000);
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
      console.error('Invalid targetUserId:', targetUserId);
      return;
    }

    console.log('Requesting instant capture for:', { targetUserId, targetUserName });
    setCapturingInstant(targetUserId);
    toast.loading(`Requesting instant capture from ${targetUserName}...`, { id: 'instant-capture' });

    try {
      const response = await fetch('/api/productivity/instant-capture', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ targetUserId })
      });

      const data = await response.json();
      console.log('Instant capture response:', data);
      
      if (data.success) {
        toast.success(`Instant capture requested for ${targetUserName}. Waiting for screenshot...`, { id: 'instant-capture' });
        
        // Poll for result
        let attempts = 0;
        const maxAttempts = 30; // 30 seconds timeout
        const pollInterval = setInterval(async () => {
          attempts++;
          
          try {
            const statusResponse = await fetch(
              `/api/productivity/instant-capture?requestId=${data.data.requestId}`,
              {
                headers: {
                  'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
              }
            );
            
            const statusData = await statusResponse.json();
            console.log(`Poll attempt ${attempts}:`, statusData);
            
            if (statusData.success && statusData.data.status !== 'pending') {
              clearInterval(pollInterval);
              setCapturingInstant(null);
              
              if (statusData.data.status === 'analyzed' || statusData.data.status === 'captured') {
                toast.success(`Screenshot captured and analyzed successfully! Score: ${statusData.data.productivityScore || 'N/A'}`, { id: 'instant-capture', duration: 4000 });
                // Refresh monitoring data
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
      console.error('Error requesting instant capture:', error);
      toast.error('Failed to request instant capture', { id: 'instant-capture' });
      setCapturingInstant(null);
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
    const isOwnCard = cardId === 'own-monitoring';
    const targetUserId = userInfo?._id || userInfo?.userId;
    
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
              <span>{formatLocalDateOnly(records[0].createdAt)}</span>
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-2">
            <button
              onClick={() => openModal('monitoring', title, records, userInfo)}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg font-semibold hover:from-green-600 hover:to-green-700 transition-all duration-200 shadow-md hover:shadow-lg"
            >
              Show Details
            </button>
          </div>
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
  const isDepartmentHead = isUserDepartmentHead || user.role === 'department_head';
  const canViewTeamData = isAdminOrGodAdmin || isDepartmentHead;
  const isEmployee = !canViewTeamData;

  // Group by individual users for card display
  const getMonitoringByUser = () => {
    const userMap = new Map();
    const currentUserId = user?._id?.toString() || user?.userId?.toString();
    
    monitoringData.forEach(record => {
      const userId = record.monitoredUserId?._id?.toString() || record.monitoredUserId?.toString();
      const userKey = userId || 'unknown';
      
      if (!userMap.has(userKey)) {
        // Get user info from either monitoredEmployeeId or monitoredUserId
        const employeeInfo = record.monitoredEmployeeId || {};
        const userInfo = record.monitoredUserId || {};
        
        // Build name from firstName + lastName if available, otherwise use name field
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
          records: [],
          isOwn: userId === currentUserId
        });
      }
      userMap.get(userKey).records.push(record);
    });
    
    return Array.from(userMap.values());
  };

  const getChatByUser = () => {
    const userMap = new Map();
    const currentUserId = user?._id?.toString() || user?.userId?.toString();
    
    chatHistory.forEach(session => {
      const userId = session.userId?._id?.toString() || session.userId?.toString();
      const userKey = userId || 'unknown';
      
      if (!userMap.has(userKey)) {
        userMap.set(userKey, {
          user: {
            _id: userId,
            userId: userId,
            name: session.employeeName || session.userId?.name || session.employeeId?.name || 'Unknown User',
            employeeCode: session.employeeCode || session.employeeId?.employeeCode || '',
            designation: session.designation || session.employeeId?.designation || '',
            department: session.department || session.employeeId?.department || '',
            profilePicture: session.userId?.profilePicture || session.employeeId?.profilePicture || null
          },
          sessions: [],
          isOwn: userId === currentUserId
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

      {/* Desktop App Info (Admin/Department Head only) */}
      {(isAdminOrGodAdmin || isDepartmentHead) && activeTab === 'monitoring' && (
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 rounded-r-lg">
          <div className="flex items-start gap-3">
            <div className="text-blue-500 text-xl mt-0.5">ℹ️</div>
            <div>
              <h4 className="font-semibold text-blue-900 mb-1">Desktop App Required</h4>
              <p className="text-sm text-blue-800">
                Instant capture requires the <strong>MAYA Desktop App</strong> to be running on the employee's computer. 
                The app listens for capture requests via Socket.IO, captures the screenshot, and uploads it for AI analysis.
                {' '}<a href="#" className="underline font-medium">Learn more</a>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Instant Capture Dropdown (Admin/Department Head only) */}
      {(isAdminOrGodAdmin || isDepartmentHead) && activeTab === 'monitoring' && (
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center p-0">
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
                className="px-4 py-2.5 border-2 border-white bg-white text-gray-800 rounded-lg focus:ring-2 focus:ring-purple-300 focus:border-transparent min-w-[250px] font-medium"
              >
                <option value="">Select Employee...</option>
                <option value="all" className="font-bold bg-purple-50">
                  📸 Capture All ({accessibleEmployees.length} employees)
                </option>
                <option disabled>──────────</option>
                {accessibleEmployees.map((emp) => {
                  // userId is an object with _id, email, role
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
                className="px-6 py-2.5 bg-white text-purple-600 rounded-lg font-bold hover:bg-purple-50 transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
              >
                {capturingInstant ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
                    Capturing...
                  </>
                ) : (
                  <>
                    <FaEye />
                    Capture Now
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

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
            {/* Render cards using getMonitoringByUser - own card first, then others */}
            {(() => {
              const allUserData = getMonitoringByUser();
              const currentUserId = user?._id?.toString() || user?.userId?.toString();
              
              // Separate own card from others
              const ownData = allUserData.find(item => item.isOwn);
              const otherData = allUserData.filter(item => !item.isOwn);
              
              // For admin, separate department heads from regular employees
              const dhData = isAdminOrGodAdmin ? otherData.filter(item => {
                const userId = item.user?._id?.toString() || item.user?.userId?.toString();
                return departmentHeads.some(dh => {
                  const dhUserId = dh.userId?._id?.toString() || dh.userId?.toString() || dh._id?.toString();
                  return dhUserId === userId;
                });
              }) : [];
              
              const employeeData = otherData.filter(item => {
                const userId = item.user?._id?.toString() || item.user?.userId?.toString();
                const isDH = departmentHeads.some(dh => {
                  const dhUserId = dh.userId?._id?.toString() || dh.userId?.toString() || dh._id?.toString();
                  return dhUserId === userId;
                });
                return !isDH;
              });
              
              return (
                <>
                  {/* Own card first (for admins, department heads, or any user with data) */}
                  {ownData && ownData.records.length > 0 && renderMonitoringCard(
                    'Your Productivity Monitoring',
                    ownData.records,
                    'own-monitoring',
                    { ...ownData.user, name: user.name || ownData.user.name }
                  )}
                  
                  {/* Department Heads Cards (Admin only) */}
                  {isAdminOrGodAdmin && dhData.map((item, idx) => 
                    renderMonitoringCard(
                      item.user?.name || 'Department Head',
                      item.records,
                      `dh-monitoring-${idx}`,
                      item.user
                    )
                  )}
                  
                  {/* Employee Cards (Admin and Department Head can see) */}
                  {(isAdminOrGodAdmin || isDepartmentHead) && employeeData.map((item, idx) => 
                    renderMonitoringCard(
                      item.user?.name || 'Employee',
                      item.records,
                      `emp-monitoring-${idx}`,
                      item.user
                    )
                  )}
                </>
              );
            })()}
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
            {/* Render cards using getChatByUser - own card first, then others */}
            {(() => {
              const allUserData = getChatByUser();
              const currentUserId = user?._id?.toString() || user?.userId?.toString();
              
              // Separate own card from others
              const ownData = allUserData.find(item => item.isOwn);
              const otherData = allUserData.filter(item => !item.isOwn);
              
              // For admin, separate department heads from regular employees
              const dhData = isAdminOrGodAdmin ? otherData.filter(item => {
                const userId = item.user?._id?.toString() || item.user?.userId?.toString();
                return departmentHeads.some(dh => {
                  const dhUserId = dh.userId?._id?.toString() || dh.userId?.toString() || dh._id?.toString();
                  return dhUserId === userId;
                });
              }) : [];
              
              const employeeData = otherData.filter(item => {
                const userId = item.user?._id?.toString() || item.user?.userId?.toString();
                const isDH = departmentHeads.some(dh => {
                  const dhUserId = dh.userId?._id?.toString() || dh.userId?.toString() || dh._id?.toString();
                  return dhUserId === userId;
                });
                return !isDH;
              });
              
              return (
                <>
                  {/* Own card first (for admins, department heads, or any user with data) */}
                  {ownData && ownData.sessions.length > 0 && renderChatCard(
                    'Your MAYA Chat History',
                    ownData.sessions,
                    'own-chat',
                    { ...ownData.user, name: user.name || ownData.user.name }
                  )}
                  
                  {/* Department Heads Cards (Admin only) */}
                  {isAdminOrGodAdmin && dhData.map((item, idx) => 
                    renderChatCard(
                      item.user?.name || 'Department Head',
                      item.sessions,
                      `dh-chat-${idx}`,
                      item.user
                    )
                  )}
                  
                  {/* Employee Cards (Admin and Department Head can see) */}
                  {(isAdminOrGodAdmin || isDepartmentHead) && employeeData.map((item, idx) => 
                    renderChatCard(
                      item.user?.name || 'Employee',
                      item.sessions,
                      `emp-chat-${idx}`,
                      item.user
                    )
                  )}
                </>
              );
            })()}
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

      {/* Modal for displaying chat/monitoring details - Rendered via Portal */}
      {isMounted && isModalOpen && modalData && createPortal(
        <>
          {/* Backdrop with blur - covers entire screen including sidebar/header */}
          <div
            className="fixed inset-0"
            style={{
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
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
                      {modalData.userInfo.employeeCode || ''}{modalData.userInfo.employeeCode && modalData.userInfo.designation ? ' - ' : ''}
                      {typeof modalData.userInfo.designation === 'object' 
                        ? modalData.userInfo.designation?.title || modalData.userInfo.designation?.levelName || ''
                        : modalData.userInfo.designation || ''}
                    </p>
                  )}
                </div>

                {/* Close Button */}
                <button
                  onClick={closeModal}
                  className="flex-shrink-0  bg-opacity-20 hover:bg-opacity-30 rounded-full p-2 transition-all"
                >
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
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
                            📅 {formatLocalDateTime(session.createdAt)}
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
                                  {formatLocalTime(msg.timestamp)}
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
                                {formatLocalDateTime(record.createdAt)}
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
                            <div className="mb-4 flex justify-between items-center">
                              <span className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                <FaChartLine className="text-blue-600" />
                                AI Analysis & Insights
                              </span>
                              {record.productivityScore !== undefined && (
                                <div className="text-right">
                                  <div className="text-xs text-gray-600">Productivity Score</div>
                                  <div className={`text-2xl font-bold ${
                                    record.productivityScore >= 70 ? 'text-green-600' :
                                    record.productivityScore >= 40 ? 'text-yellow-600' :
                                    'text-red-600'
                                  }`}>
                                    {record.productivityScore}/100
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            <div className="flex-1 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-5 border-2 border-blue-200 shadow-md">
                              <h4 className="font-bold text-gray-800 mb-3 text-lg">
                                📊 Summary
                              </h4>
                              <p className="text-sm text-gray-700 mb-5 leading-relaxed">
                                {record.summary || 'No summary available'}
                              </p>

                              {/* Productivity Insights */}
                              {record.productivityInsights && record.productivityInsights.length > 0 && (
                                <div className="mb-4 p-4 bg-blue-50 border-2 border-blue-300 rounded-xl shadow-sm">
                                  <p className="text-sm font-bold text-blue-800 mb-2">💡 Key Insights</p>
                                  <ul className="list-disc list-inside space-y-1">
                                    {record.productivityInsights.map((insight, idx) => (
                                      <li key={idx} className="text-sm text-blue-700">{insight}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}

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

                              {/* Productivity Tips */}
                              {record.productivityTips && (
                                <div className="mt-4 p-4 bg-yellow-50 border-2 border-yellow-300 rounded-xl shadow-sm">
                                  <p className="text-sm font-bold text-yellow-800 mb-2 flex items-center gap-2">
                                    💡 Productivity Tips
                                    {record.captureMode === 'instant' && (
                                      <span className="text-xs bg-purple-500 text-white px-2 py-0.5 rounded-full">Instant Capture</span>
                                    )}
                                  </p>
                                  <p className="text-sm text-yellow-700 leading-relaxed">
                                    {record.productivityTips}
                                  </p>
                                </div>
                              )}

                              {/* Areas of Improvement */}
                              {record.areasOfImprovement && record.areasOfImprovement.length > 0 && (
                                <div className="mt-4 p-4 bg-orange-50 border-2 border-orange-300 rounded-xl shadow-sm">
                                  <p className="text-sm font-bold text-orange-800 mb-2">📈 Areas for Improvement</p>
                                  <ul className="list-disc list-inside space-y-1">
                                    {record.areasOfImprovement.map((area, idx) => (
                                      <li key={idx} className="text-sm text-orange-700">{area}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {/* Top Achievements */}
                              {record.topAchievements && record.topAchievements.length > 0 && (
                                <div className="mt-4 p-4 bg-green-50 border-2 border-green-300 rounded-xl shadow-sm">
                                  <p className="text-sm font-bold text-green-800 mb-2">🏆 Achievements</p>
                                  <ul className="list-disc list-inside space-y-1">
                                    {record.topAchievements.map((achievement, idx) => (
                                      <li key={idx} className="text-sm text-green-700">{achievement}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              <div className="mt-4 flex justify-between items-center">
                                <span className={`px-4 py-2 rounded-full font-bold text-sm ${
                                  record.status === 'captured' || record.status === 'analyzed' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                                }`}>
                                  {record.status}
                                </span>
                                {record.focusScore !== undefined && (
                                  <span className="text-sm text-gray-700 font-semibold">
                                    Focus: {record.focusScore}%
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Rich Productivity Data - Full Width Section */}
                        {(record.topApps?.length > 0 || record.topWebsites?.length > 0 || record.keystrokes?.totalCount > 0 || record.totalActiveTime > 0) && (
                          <div className="border-t-2 border-gray-200 p-6 bg-white">
                            <h4 className="text-lg font-bold text-gray-800 mb-4">📊 Detailed Activity Breakdown</h4>
                            
                            {/* Time Distribution */}
                            {record.totalActiveTime > 0 && (
                              <div className="mb-6">
                                <h5 className="text-sm font-semibold text-gray-700 mb-3">Time Distribution</h5>
                                <div className="flex gap-4 flex-wrap">
                                  <div className="flex-1 min-w-[120px] bg-green-50 rounded-lg p-3 border border-green-200">
                                    <div className="text-xs text-green-600 font-medium">Productive</div>
                                    <div className="text-lg font-bold text-green-700">
                                      {Math.round((record.productiveTime || 0) / 60000)} min
                                    </div>
                                  </div>
                                  <div className="flex-1 min-w-[120px] bg-gray-50 rounded-lg p-3 border border-gray-200">
                                    <div className="text-xs text-gray-600 font-medium">Neutral</div>
                                    <div className="text-lg font-bold text-gray-700">
                                      {Math.round((record.neutralTime || 0) / 60000)} min
                                    </div>
                                  </div>
                                  <div className="flex-1 min-w-[120px] bg-red-50 rounded-lg p-3 border border-red-200">
                                    <div className="text-xs text-red-600 font-medium">Unproductive</div>
                                    <div className="text-lg font-bold text-red-700">
                                      {Math.round((record.unproductiveTime || 0) / 60000)} min
                                    </div>
                                  </div>
                                  <div className="flex-1 min-w-[120px] bg-blue-50 rounded-lg p-3 border border-blue-200">
                                    <div className="text-xs text-blue-600 font-medium">Total Active</div>
                                    <div className="text-lg font-bold text-blue-700">
                                      {Math.round((record.totalActiveTime || 0) / 60000)} min
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                              {/* Top Apps */}
                              {record.topApps && record.topApps.length > 0 && (
                                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                                  <h5 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                    💻 Top Applications
                                  </h5>
                                  <div className="space-y-2">
                                    {record.topApps.slice(0, 5).map((app, idx) => (
                                      <div key={idx} className="flex items-center justify-between">
                                        <span className="text-sm text-gray-800 truncate flex-1">{app.appName}</span>
                                        <div className="flex items-center gap-2">
                                          <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                                            <div 
                                              className="h-full bg-blue-500 rounded-full"
                                              style={{ width: `${app.percentage || 0}%` }}
                                            />
                                          </div>
                                          <span className="text-xs text-gray-600 w-12 text-right">
                                            {Math.round((app.duration || 0) / 60000)}m
                                          </span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Top Websites */}
                              {record.topWebsites && record.topWebsites.length > 0 && (
                                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                                  <h5 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                    🌐 Top Websites
                                  </h5>
                                  <div className="space-y-2">
                                    {record.topWebsites.slice(0, 5).map((site, idx) => (
                                      <div key={idx} className="flex items-center justify-between">
                                        <span className="text-sm text-gray-800 truncate flex-1">{site.domain}</span>
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs text-gray-500">{site.visits} visits</span>
                                          <span className="text-xs text-gray-600 w-12 text-right">
                                            {Math.round((site.duration || 0) / 60000)}m
                                          </span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Activity Stats */}
                              {(record.keystrokes?.totalCount > 0 || record.mouseActivity?.clicks > 0) && (
                                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                                  <h5 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                    ⌨️ Activity Stats
                                  </h5>
                                  <div className="grid grid-cols-2 gap-3">
                                    {record.keystrokes?.totalCount > 0 && (
                                      <div className="bg-white rounded-lg p-3 border border-gray-200">
                                        <div className="text-xs text-gray-500">Keystrokes</div>
                                        <div className="text-lg font-bold text-gray-800">
                                          {record.keystrokes.totalCount.toLocaleString()}
                                        </div>
                                        {record.keystrokes.averagePerMinute > 0 && (
                                          <div className="text-xs text-gray-500">{record.keystrokes.averagePerMinute}/min avg</div>
                                        )}
                                      </div>
                                    )}
                                    {record.mouseActivity?.clicks > 0 && (
                                      <div className="bg-white rounded-lg p-3 border border-gray-200">
                                        <div className="text-xs text-gray-500">Mouse Clicks</div>
                                        <div className="text-lg font-bold text-gray-800">
                                          {record.mouseActivity.clicks.toLocaleString()}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Efficiency Scores */}
                              {(record.focusScore !== undefined || record.efficiencyScore !== undefined) && (
                                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                                  <h5 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                    🎯 Performance Scores
                                  </h5>
                                  <div className="grid grid-cols-2 gap-3">
                                    {record.focusScore !== undefined && (
                                      <div className="bg-white rounded-lg p-3 border border-gray-200">
                                        <div className="text-xs text-gray-500">Focus Score</div>
                                        <div className={`text-lg font-bold ${
                                          record.focusScore >= 70 ? 'text-green-600' :
                                          record.focusScore >= 40 ? 'text-yellow-600' : 'text-red-600'
                                        }`}>
                                          {record.focusScore}/100
                                        </div>
                                      </div>
                                    )}
                                    {record.efficiencyScore !== undefined && (
                                      <div className="bg-white rounded-lg p-3 border border-gray-200">
                                        <div className="text-xs text-gray-500">Efficiency Score</div>
                                        <div className={`text-lg font-bold ${
                                          record.efficiencyScore >= 70 ? 'text-green-600' :
                                          record.efficiencyScore >= 40 ? 'text-yellow-600' : 'text-red-600'
                                        }`}>
                                          {record.efficiencyScore}/100
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
              </div>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}

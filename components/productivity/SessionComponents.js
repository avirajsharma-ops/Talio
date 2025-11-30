'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { FaUser, FaClock, FaCamera, FaChartLine, FaTimes, FaChevronLeft, FaChevronRight, FaChevronDown, FaChevronUp, FaExpand, FaPlay, FaPause, FaSync, FaExclamationTriangle, FaDesktop, FaGlobe, FaTrash, FaRobot, FaCheck } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { formatLocalDateTime, formatLocalDateOnly, formatLocalTime } from '@/lib/browserTimezone';
import { useTheme } from '@/contexts/ThemeContext';

// Cache helper for localStorage
const CACHE_PREFIX = 'talio_cache_';
const CACHE_EXPIRY = 10 * 60 * 1000; // 10 minutes - increased for better UX

// In-memory cache for faster access (survives tab switches but not page reloads)
const memoryCache = new Map();

function getCachedData(key) {
  if (typeof window === 'undefined') return null;
  
  // Check memory cache first (fastest)
  const memCached = memoryCache.get(key);
  if (memCached && Date.now() - memCached.timestamp < CACHE_EXPIRY) {
    return { data: memCached.data, version: memCached.version };
  }
  
  // Fall back to localStorage
  try {
    const cached = localStorage.getItem(CACHE_PREFIX + key);
    if (!cached) return null;
    const { data, timestamp, version } = JSON.parse(cached);
    // Check if cache is still valid
    if (Date.now() - timestamp < CACHE_EXPIRY) {
      // Also store in memory cache for faster subsequent access
      memoryCache.set(key, { data, timestamp, version });
      return { data, version };
    }
    // Cache expired, remove it
    localStorage.removeItem(CACHE_PREFIX + key);
    memoryCache.delete(key);
    return null;
  } catch (e) {
    return null;
  }
}

function setCachedData(key, data, version = Date.now()) {
  if (typeof window === 'undefined') return;
  
  // Always update memory cache
  memoryCache.set(key, { data, timestamp: Date.now(), version });
  
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({
      data,
      timestamp: Date.now(),
      version
    }));
  } catch (e) {
    // localStorage full or unavailable
  }
}

function clearCachedData(keyPattern) {
  if (typeof window === 'undefined') return;
  
  // Clear from memory cache
  for (const key of memoryCache.keys()) {
    if (key.startsWith(keyPattern)) {
      memoryCache.delete(key);
    }
  }
  
  try {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(CACHE_PREFIX + keyPattern)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
  } catch (e) {}
}

// Check if user is admin
function isUserAdmin() {
  if (typeof window === 'undefined') return false;
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return ['admin', 'god_admin'].includes(user.role);
  } catch (e) {
    return false;
  }
}

/**
 * User Cards Grid Component
 * Shows a grid of user cards with quick stats and latest session info
 * Uses progressive loading with caching: basic info first, then stats
 * Prevents unnecessary re-fetches on tab switches
 * For self_only users with a single card, auto-selects their card
 */
export function UserCardsGrid({ onUserSelect, selectedUserId, refreshKey, autoSelectSelf = true }) {
  const [userCards, setUserCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [accessLevel, setAccessLevel] = useState('admin');
  const lastRefreshRef = useRef(null);
  const hasFetchedRef = useRef(false);
  const autoSelectedRef = useRef(false);

  // Auto-select for self_only users with a single card
  useEffect(() => {
    if (autoSelectSelf && !autoSelectedRef.current && accessLevel === 'self_only' && userCards.length === 1 && userCards[0].isOwnCard) {
      autoSelectedRef.current = true;
      // Small delay to allow UI to render the card first
      setTimeout(() => {
        onUserSelect(userCards[0]);
      }, 100);
    }
  }, [accessLevel, userCards, autoSelectSelf, onUserSelect]);

  useEffect(() => {
    // Check cache first for instant display
    const cached = getCachedData('user_cards');
    if (cached?.data) {
      setUserCards(cached.data);
      setLoading(false);
      hasFetchedRef.current = true;
    }
    
    // Only fetch if:
    // 1. refreshKey explicitly changed (manual refresh), OR
    // 2. No cache exists AND we haven't fetched yet
    const refreshKeyChanged = refreshKey !== lastRefreshRef.current && lastRefreshRef.current !== null;
    const needsInitialFetch = !cached && !hasFetchedRef.current;
    
    if (refreshKeyChanged || needsInitialFetch) {
      lastRefreshRef.current = refreshKey;
      fetchUserCardsProgressive(!cached);
    } else if (!hasFetchedRef.current) {
      // First mount with cache - still update refreshKey ref
      lastRefreshRef.current = refreshKey;
    }
  }, [refreshKey]);

  const fetchUserCardsProgressive = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const token = localStorage.getItem('token');
      
      // Phase 1: Quick load - get basic user info immediately
      const quickResponse = await fetch('/api/productivity/user-cards?quick=true', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const quickData = await quickResponse.json();
      
      if (quickData.success) {
        setUserCards(quickData.data || []);
        setAccessLevel(quickData.accessLevel || 'admin');
        setCachedData('user_cards', quickData.data || []);
        setLoading(false);
        
        // Phase 2: Load full stats in background
        fetchFullStats(token);
      } else {
        console.error('Failed to fetch user cards:', quickData.error);
        setLoading(false);
      }
    } catch (error) {
      console.error('Failed to fetch user cards:', error);
      setLoading(false);
    }
  };

  const fetchFullStats = async (token) => {
    try {
      const response = await fetch('/api/productivity/user-cards', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (data.success) {
        setUserCards(data.data || []);
        setCachedData('user_cards', data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch full stats:', error);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl shadow-md p-4 animate-pulse">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
            <div className="h-2 bg-gray-200 rounded mb-2"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  if (userCards.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-12 text-center">
        <FaUser className="text-6xl text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-600 mb-2">
          {accessLevel === 'self_only' ? 'No Activity Sessions Yet' : 'No Active Users'}
        </h3>
        <p className="text-gray-500">
          {accessLevel === 'self_only' 
            ? 'Your activity sessions will appear here once you start using the desktop app'
            : 'Activity data will appear when employees use the desktop app'}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {userCards.map((card) => (
        <UserCard 
          key={card.id} 
          card={card} 
          onClick={() => onUserSelect(card)}
          isSelected={selectedUserId === card.userId}
        />
      ))}
    </div>
  );
}

/**
 * Individual User Card Component
 */
function UserCard({ card, onClick, isSelected }) {
  const getProductivityColor = (score) => {
    if (score === null || score === undefined) return { bg: 'bg-gray-300', text: 'text-gray-500', ring: 'ring-gray-200' };
    if (score >= 70) return { bg: 'bg-green-500', text: 'text-green-600', ring: 'ring-green-200' };
    if (score >= 40) return { bg: 'bg-yellow-500', text: 'text-yellow-600', ring: 'ring-yellow-200' };
    return { bg: 'bg-red-500', text: 'text-red-600', ring: 'ring-red-200' };
  };

  const colors = getProductivityColor(card.todayStats?.avgProductivity);
  const lastSessionTime = card.latestSession?.sessionEnd;
  const isOnline = lastSessionTime && (new Date() - new Date(lastSessionTime)) < 30 * 60 * 1000;
  const statsLoading = card.statsLoading || card.totalSessions === null;

  return (
    <div 
      onClick={onClick}
      className={`bg-white rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer p-4 border-2 ${
        isSelected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-transparent hover:border-gray-200'
      }`}
    >
      {/* Header with avatar and name */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative">
          {card.profilePicture ? (
            <img 
              src={card.profilePicture} 
              alt={card.name} 
              className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
              <span className="text-white font-bold text-lg">
                {card.name?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
          )}
          {/* Online indicator */}
          <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
            isOnline ? 'bg-green-500' : 'bg-gray-400'
          }`}></div>
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-gray-800 truncate flex items-center gap-2">
            {card.name}
            {card.isOwnCard && <span className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded">You</span>}
          </h4>
          <p className="text-sm text-gray-500 truncate">{card.employeeCode || card.designation || card.department}</p>
        </div>
      </div>

      {/* Productivity score bar */}
      <div className="mb-3">
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs text-gray-500">Today's Productivity</span>
          {statsLoading ? (
            <span className="text-xs text-gray-400 animate-pulse">Loading...</span>
          ) : (
            <span className={`font-bold ${colors.text}`}>{card.todayStats?.avgProductivity || 0}%</span>
          )}
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          {statsLoading ? (
            <div className="h-full bg-gray-200 animate-pulse"></div>
          ) : (
            <div 
              className={`h-full ${colors.bg} transition-all`}
              style={{ width: `${card.todayStats?.avgProductivity || 0}%` }}
            ></div>
          )}
        </div>
      </div>

      {/* Quick stats */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-1 text-gray-500">
          <FaClock className="text-gray-400" />
          {statsLoading ? (
            <span className="text-xs text-gray-400 animate-pulse">--</span>
          ) : (
            <span>{card.todayStats?.duration || 0} min</span>
          )}
        </div>
        <div className="flex items-center gap-1 text-gray-500">
          <FaCamera className="text-gray-400" />
          {statsLoading ? (
            <span className="text-xs text-gray-400 animate-pulse">--</span>
          ) : (
            <span>{card.totalSessions || card.todayStats?.sessionsCount || 0} sessions</span>
          )}
        </div>
      </div>

      {/* Latest screenshot thumbnail */}
      {card.latestSession?.latestScreenshot && (
        <div className="mt-3 relative">
          <img 
            src={card.latestSession.latestScreenshot}
            alt="Latest screenshot"
            className="w-full h-20 object-cover rounded-lg border border-gray-200"
          />
          <div className="absolute bottom-1 right-1 bg-black/60 text-white text-xs px-2 py-0.5 rounded">
            {formatLocalTime(card.latestSession.sessionEnd)}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Session Popup Modal Component
 * Shows detailed session information with screenshots
 * Includes caching and admin delete functionality
 * Preserves data on tab switches - only fetches new data
 */
export function SessionPopup({ user, isOpen, onClose, onDataChange }) {
  const { theme } = useTheme();
  const primaryColor = theme?.primary?.[600] || '#2563EB';
  const primaryLight = theme?.primary?.[100] || '#DBEAFE';
  
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [selectedSession, setSelectedSession] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const isAdmin = useMemo(() => isUserAdmin(), []);
  const cacheKey = useMemo(() => user?.userId ? `sessions_${user.userId}` : null, [user?.userId]);
  const lastUserIdRef = useRef(null);
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    if (isOpen && user) {
      const userChanged = lastUserIdRef.current !== user.userId;
      lastUserIdRef.current = user.userId;
      
      // Check cache first
      const cached = cacheKey ? getCachedData(cacheKey) : null;
      
      if (cached?.data?.length > 0) {
        setSessions(cached.data);
        setOffset(cached.data.length);
        setHasMore(cached.data.length >= 4);
        setLoading(false);
        hasFetchedRef.current = true;
        
        // Only refresh in background if user changed
        if (userChanged) {
          fetchNewSessions(cached.data);
        }
      } else if (!hasFetchedRef.current || userChanged) {
        // No cache or user changed - do full fetch
        fetchSessions(true, true);
      }
    }
  }, [isOpen, user]);

  // Fetch only new sessions (newer than the latest cached one)
  const fetchNewSessions = async (existingSessions) => {
    if (!user || existingSessions.length === 0) return;
    
    try {
      const token = localStorage.getItem('token');
      const latestTime = new Date(existingSessions[0].sessionEnd || existingSessions[0].createdAt).toISOString();
      
      const response = await fetch(`/api/productivity/sessions?userId=${user.userId}&limit=10&after=${latestTime}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();

      if (data.success && data.data?.length > 0) {
        // Prepend new sessions to existing ones
        const newSessions = data.data;
        const updatedSessions = [...newSessions, ...existingSessions];
        setSessions(updatedSessions);
        setOffset(updatedSessions.length);
        
        // Update cache
        if (cacheKey) {
          setCachedData(cacheKey, updatedSessions);
        }
      }
    } catch (error) {
      console.error('Failed to fetch new sessions:', error);
    }
  };

  const fetchSessions = async (reset = false, showLoading = true) => {
    if (!user) return;
    
    try {
      if (reset && showLoading) {
        setLoading(true);
        setSessions([]);
        setOffset(0);
      } else if (!reset) {
        setLoadingMore(true);
      }

      const newOffset = reset ? 0 : offset;
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/productivity/sessions?userId=${user.userId}&limit=4&offset=${newOffset}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();

      if (data.success) {
        const newSessions = data.data || [];
        let updatedSessions;
        if (reset) {
          updatedSessions = newSessions;
          setSessions(newSessions);
        } else {
          // When loading more, append to existing (no duplicates)
          const existingIds = new Set(sessions.map(s => s._id));
          const uniqueNewSessions = newSessions.filter(s => !existingIds.has(s._id));
          updatedSessions = [...sessions, ...uniqueNewSessions];
          setSessions(updatedSessions);
        }
        setOffset(updatedSessions.length);
        setHasMore(data.pagination?.hasMore || newSessions.length === 4);
        hasFetchedRef.current = true;
        
        // Cache the results
        if (cacheKey && updatedSessions.length > 0) {
          setCachedData(cacheKey, updatedSessions);
        }
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
      if (showLoading) toast.error('Failed to load sessions');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleDeleteSession = async (sessionId, e) => {
    e?.stopPropagation();
    if (!confirm('Are you sure you want to delete this session? This action cannot be undone.')) return;
    
    setDeleting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/productivity/sessions?sessionId=${sessionId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (data.success) {
        toast.success('Session deleted');
        setSessions(prev => prev.filter(s => s._id !== sessionId));
        // Clear cache
        if (cacheKey) clearCachedData(cacheKey);
        clearCachedData('user_cards');
        onDataChange?.();
      } else {
        toast.error(data.error || 'Failed to delete session');
      }
    } catch (error) {
      toast.error('Failed to delete session');
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteAllSessions = async () => {
    if (!confirm(`Are you sure you want to delete ALL sessions for ${user?.name}? This action cannot be undone.`)) return;
    
    setDeleting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/productivity/sessions?userId=${user.userId}&type=sessions`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (data.success) {
        toast.success(`Deleted ${data.sessionsDeleted} sessions`);
        setSessions([]);
        if (cacheKey) clearCachedData(cacheKey);
        clearCachedData('user_cards');
        onDataChange?.();
      } else {
        toast.error(data.error || 'Failed to delete sessions');
      }
    } catch (error) {
      toast.error('Failed to delete sessions');
    } finally {
      setDeleting(false);
    }
  };

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      fetchSessions(false, true);
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col mx-4">
        {/* Header */}
        <div className="px-6 py-4 flex items-center gap-4 border-b border-gray-200" style={{ backgroundColor: primaryLight }}>
          {user?.profilePicture ? (
            <img 
              src={user.profilePicture} 
              alt={user.name} 
              className="w-12 h-12 rounded-full border-2 shadow-sm object-cover"
              style={{ borderColor: primaryColor }}
            />
          ) : (
            <div 
              className="w-12 h-12 rounded-full flex items-center justify-center shadow-sm text-white"
              style={{ backgroundColor: primaryColor }}
            >
              <span className="text-xl font-bold">
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
          )}
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-800">{user?.name}'s Sessions</h2>
            <p className="text-sm text-gray-500">{user?.employeeCode || user?.designation} • {user?.department}</p>
          </div>
          
          {/* Admin Delete All Button */}
          {isAdmin && sessions.length > 0 && (
            <button
              onClick={handleDeleteAllSessions}
              disabled={deleting}
              className="px-3 py-2 bg-red-100 text-red-600 hover:bg-red-200 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              <FaTrash className="text-xs" />
              Delete All
            </button>
          )}
          
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-full transition-colors"
          >
            <FaTimes className="text-gray-600 text-xl" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-12">
              <FaCamera className="text-6xl text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">No Sessions Yet</h3>
              <p className="text-gray-500">Activity sessions will appear here once captured</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sessions.map((session) => (
                  <SessionCard 
                    key={session._id} 
                    session={session}
                    onClick={() => setSelectedSession(session)}
                    onDelete={isAdmin ? (e) => handleDeleteSession(session._id, e) : null}
                    isAdmin={isAdmin}
                  />
                ))}
              </div>

              {/* Load More Button */}
              {hasMore && (
                <div className="mt-6 text-center">
                  <button
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="px-6 py-2 text-white rounded-lg disabled:opacity-50 flex items-center gap-2 mx-auto transition-all hover:opacity-90"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {loadingMore ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Loading...
                      </>
                    ) : (
                      <>
                        <FaSync className="text-white" />
                        Load More Sessions
                      </>
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Session Detail Modal */}
      {selectedSession && (
        <SessionDetailModal 
          session={selectedSession}
          onClose={() => setSelectedSession(null)}
        />
      )}
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
}

/**
 * Session Card Component
 * Shows a summary of a single session with thumbnails
 */
function SessionCard({ session, onClick, onDelete, isAdmin }) {
  const screenshotCount = session.screenshots?.length || 0;
  
  // Get apps and websites from various possible field names - with safe defaults
  const apps = session.appUsageSummary || session.appUsage || session.topApps || [];
  const websites = session.websiteVisitSummary || session.websiteVisits || session.topWebsites || [];
  
  // Calculate productivity score from aiAnalysis or compute from time data
  const productivityScore = session.aiAnalysis?.productivityScore || 
    (session.totalActiveTime > 0 
      ? Math.round((session.productiveTime / session.totalActiveTime) * 100) 
      : 0);
  
  const getScoreColor = (score) => {
    if (score >= 70) return 'text-green-600 bg-green-100';
    if (score >= 40) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  // Get time spent in a readable format
  const formatDuration = (ms) => {
    if (!ms) return '';
    const mins = Math.round(ms / 60000);
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    return `${hrs}h ${mins % 60}m`;
  };

  // Get screenshot URL - handle various possible fields
  const getScreenshotUrl = (screenshot) => {
    if (!screenshot) return null;
    return screenshot.thumbnail || screenshot.fullData || screenshot.url || screenshot.thumbnailUrl || null;
  };

  // Calculate session duration safely
  const sessionDuration = session.durationMinutes || session.sessionDuration || 
    Math.round((new Date(session.sessionEnd) - new Date(session.sessionStart)) / 60000) || 30;

  return (
    <div 
      onClick={onClick}
      className="bg-gray-50 rounded-xl p-4 border border-gray-200 hover:border-blue-300 hover:shadow-md cursor-pointer transition-all relative group"
    >
      {/* Admin Delete Button */}
      {isAdmin && onDelete && (
        <button
          onClick={onDelete}
          className="absolute top-2 right-2 p-1.5 bg-red-100 text-red-500 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-200 transition-all z-10"
          title="Delete session"
        >
          <FaTrash className="text-xs" />
        </button>
      )}
      
      {/* Time and Score Header */}
      <div className="flex justify-between items-start mb-3">
        <div>
          <div className="font-semibold text-gray-800">
            {formatLocalTime(session.sessionStart)} - {formatLocalTime(session.sessionEnd)}
          </div>
          <div className="text-sm text-gray-500">{formatLocalDateOnly(session.sessionStart)}</div>
        </div>
        <div className={`px-3 py-1 rounded-full font-bold text-sm ${getScoreColor(productivityScore)}`}>
          {productivityScore}%
        </div>
      </div>

      {/* Screenshot Thumbnails */}
      <div className="grid grid-cols-4 gap-2 mb-3 relative">
        {session.screenshots?.slice(0, 4).map((screenshot, idx) => {
          const url = getScreenshotUrl(screenshot);
          return (
            <div 
              key={screenshot._id || idx} 
              className="relative aspect-video bg-gray-200 rounded-lg overflow-hidden"
            >
              {url ? (
                <img 
                  src={url}
                  alt={`Screenshot ${idx + 1}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <FaCamera className="text-lg" />
                </div>
              )}
            </div>
          );
        })}
        {screenshotCount > 4 && (
          <div className="absolute bottom-1 right-1 bg-black/60 text-white text-xs px-2 py-0.5 rounded">
            +{screenshotCount - 4} more
          </div>
        )}
      </div>

      {/* Top Apps Used */}
      {apps.length > 0 && (
        <div className="mb-2">
          <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
            <FaDesktop className="text-blue-500" />
            <span className="font-medium">Apps:</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {apps.slice(0, 3).map((app, idx) => (
              <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs">
                {app.appName}
                {(app.percentage || app.totalDuration || app.duration) && (
                  <span className="text-blue-500">
                    ({app.percentage ? `${app.percentage}%` : formatDuration(app.totalDuration || app.duration)})
                  </span>
                )}
              </span>
            ))}
            {apps.length > 3 && (
              <span className="text-xs text-gray-400">+{apps.length - 3} more</span>
            )}
          </div>
        </div>
      )}

      {/* Top Websites Visited */}
      {websites.length > 0 && (
        <div className="mb-2">
          <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
            <FaGlobe className="text-purple-500" />
            <span className="font-medium">Websites:</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {websites.slice(0, 3).map((site, idx) => (
              <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full text-xs">
                {site.domain}
                {(site.visitCount || site.visits) && (
                  <span className="text-purple-500">({site.visitCount || site.visits} visits)</span>
                )}
              </span>
            ))}
            {websites.length > 3 && (
              <span className="text-xs text-gray-400">+{websites.length - 3} more</span>
            )}
          </div>
        </div>
      )}

      {/* Summary */}
      <p className="text-sm text-gray-600 line-clamp-2 mb-3">
        {session.aiAnalysis?.summary || (apps.length > 0 || websites.length > 0 
          ? `Activity session with ${apps.length} app${apps.length !== 1 ? 's' : ''} and ${websites.length} website${websites.length !== 1 ? 's' : ''} tracked.`
          : 'Activity session captured')}
      </p>

      {/* Quick Stats */}
      <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
        <div className="flex items-center gap-1">
          <FaClock className="text-gray-400" />
          <span>{sessionDuration} min</span>
        </div>
        <div className="flex items-center gap-1">
          <FaCamera className="text-gray-400" />
          <span>{screenshotCount} screenshots</span>
        </div>
        {apps.length > 0 && (
          <div className="flex items-center gap-1">
            <FaDesktop className="text-gray-400" />
            <span>{apps.length} apps</span>
          </div>
        )}
        {websites.length > 0 && (
          <div className="flex items-center gap-1">
            <FaGlobe className="text-gray-400" />
            <span>{websites.length} sites</span>
          </div>
        )}
        {(session.keystrokeSummary?.totalCount > 0 || session.keystrokes?.total > 0) && (
          <div className="flex items-center gap-1">
            <span className="text-gray-400">⌨️</span>
            <span>{session.keystrokeSummary?.totalCount || session.keystrokes?.total} keys</span>
          </div>
        )}
      </div>

      {/* AI Analysis Status - Only show if analyzed */}
      {session.aiAnalysis?.summary && session.aiAnalysis?.areasOfImprovement?.length > 0 && (
        <div className="mt-2 flex items-center gap-1 text-xs text-orange-600">
          <FaExclamationTriangle />
          <span>{session.aiAnalysis.areasOfImprovement.length} area(s) to improve</span>
        </div>
      )}
      
      {/* Show "Not Analyzed" badge if no AI analysis */}
      {!session.aiAnalysis?.summary && (
        <div className="mt-2 flex items-center gap-1 text-xs text-gray-500">
          <FaRobot className="text-gray-400" />
          <span>Click to analyze with AI</span>
        </div>
      )}
    </div>
  );
}

/**
 * Session Detail Modal Component
 * Shows full session details with screenshot carousel
 */
function SessionDetailModal({ session, onClose }) {
  const [currentScreenshot, setCurrentScreenshot] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [fullscreenScreenshot, setFullscreenScreenshot] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [sessionData, setSessionData] = useState(session);
  const [loadingDetails, setLoadingDetails] = useState(true);
  const [loadingScreenshot, setLoadingScreenshot] = useState(false);
  const [loadedScreenshots, setLoadedScreenshots] = useState({}); // Cache for loaded fullData
  const [preloadingIndex, setPreloadingIndex] = useState(-1); // Track which screenshot is being preloaded
  const [allImagesLoaded, setAllImagesLoaded] = useState(false); // Track if all images are loaded for AI analysis
  const playIntervalRef = useRef(null);
  const preloadAbortRef = useRef(null); // To cancel preloading if modal closes

  // Fetch session details on mount (metadata only, screenshots loaded separately)
  useEffect(() => {
    const fetchFullSession = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/productivity/sessions/${session._id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        
        if (data.success && data.data) {
          setSessionData(data.data);
          // Start sequential preloading from screenshot 0
          if (data.data.screenshots?.length > 0) {
            startSequentialPreload(data.data._id, data.data.screenshots.length);
          }
        }
      } catch (error) {
        console.error('Failed to fetch session details:', error);
      } finally {
        setLoadingDetails(false);
      }
    };

    if (session?._id) {
      fetchFullSession();
    } else {
      setLoadingDetails(false);
    }

    // Cleanup: abort preloading when modal closes
    return () => {
      if (preloadAbortRef.current) {
        preloadAbortRef.current.abort = true;
      }
    };
  }, [session?._id]);

  const screenshots = sessionData.screenshots || [];

  // Get apps and websites from various possible field names
  const apps = sessionData.appUsageSummary || sessionData.appUsage || sessionData.topApps || [];
  const websites = sessionData.websiteVisitSummary || sessionData.websiteVisits || sessionData.topWebsites || [];

  // Sequential preload - loads screenshots one by one in order
  const startSequentialPreload = async (sessId, totalScreenshots) => {
    const abortTracker = { abort: false };
    preloadAbortRef.current = abortTracker;

    for (let i = 0; i < totalScreenshots; i++) {
      // Check if we should stop
      if (abortTracker.abort) break;
      
      // Skip if already loaded
      if (loadedScreenshots[i]) continue;

      setPreloadingIndex(i);
      setLoadingScreenshot(true);

      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/productivity/sessions/${sessId}/screenshot/${i}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (abortTracker.abort) break;
        
        const data = await response.json();
        
        if (data.success && data.data?.fullData) {
          setLoadedScreenshots(prev => {
            const updated = { ...prev, [i]: data.data.fullData };
            // Check if all screenshots are now loaded
            if (Object.keys(updated).length >= totalScreenshots) {
              setAllImagesLoaded(true);
            }
            return updated;
          });
        }
      } catch (error) {
        console.error(`Failed to preload screenshot ${i}:`, error);
      }

      setLoadingScreenshot(false);
    }

    setPreloadingIndex(-1);
    // Mark all images loaded if we completed the loop without abort
    if (!abortTracker.abort && totalScreenshots > 0) {
      setAllImagesLoaded(true);
    }
  };

  // No need for on-demand loading anymore since we preload sequentially
  // But keep this for fallback if user navigates faster than preload
  const loadScreenshotData = async (index) => {
    // Already loaded or currently being preloaded
    if (loadedScreenshots[index] || preloadingIndex === index) return;
    if (!sessionData._id) return;
    
    // If user jumps ahead, load that specific one
    setLoadingScreenshot(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/productivity/sessions/${sessionData._id}/screenshot/${index}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (data.success && data.data?.fullData) {
        setLoadedScreenshots(prev => ({ ...prev, [index]: data.data.fullData }));
      }
    } catch (error) {
      console.error('Failed to load screenshot:', error);
    } finally {
      setLoadingScreenshot(false);
    }
  };

  // Load current screenshot if not already loaded (fallback for fast navigation)
  useEffect(() => {
    if (!loadingDetails && screenshots.length > 0 && !loadedScreenshots[currentScreenshot] && preloadingIndex !== currentScreenshot) {
      loadScreenshotData(currentScreenshot);
    }
  }, [currentScreenshot, loadingDetails, screenshots.length, loadedScreenshots, preloadingIndex]);

  // Auto-play screenshots
  useEffect(() => {
    if (isPlaying && screenshots.length > 1) {
      playIntervalRef.current = setInterval(() => {
        setCurrentScreenshot(prev => (prev + 1) % screenshots.length);
      }, 2000);
    }
    return () => {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    };
  }, [isPlaying, screenshots.length]);

  const nextScreenshot = () => setCurrentScreenshot(prev => (prev + 1) % screenshots.length);
  const prevScreenshot = () => setCurrentScreenshot(prev => (prev - 1 + screenshots.length) % screenshots.length);

  const getScoreColor = (score) => {
    if (score >= 70) return 'bg-green-500';
    if (score >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // Get screenshot URL - prioritize cached fullData, then screenshot's own fullData, then thumbnail
  const getScreenshotUrl = (screenshot, index) => {
    // Check cache first
    if (loadedScreenshots[index]) {
      return loadedScreenshots[index];
    }
    // Then check the screenshot object itself
    return screenshot?.fullData || screenshot?.thumbnail || screenshot?.url || screenshot?.thumbnailUrl || '';
  };

  // Format duration
  const formatDuration = (ms) => {
    if (!ms) return '-';
    const mins = Math.round(ms / 60000);
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    return `${hrs}h ${mins % 60}m`;
  };

  // Trigger AI analysis with screenshots - pass pre-loaded images to avoid re-fetching
  const triggerAIAnalysis = async (forceReanalyze = false) => {
    if (analyzing) return;
    
    // Check if all images are loaded (required for accurate analysis)
    if (!allImagesLoaded && screenshots.length > 0) {
      toast.error('Please wait for all screenshots to load before analyzing');
      return;
    }
    
    setAnalyzing(true);
    
    // Clear caches before analysis to ensure fresh data
    clearCachedData('user_cards');
    clearCachedData('sessions_');
    
    try {
      const token = localStorage.getItem('token');
      
      // Build array of pre-loaded screenshot data to send to API
      const preloadedScreenshots = screenshots.map((ss, idx) => ({
        index: idx,
        fullData: loadedScreenshots[idx] || ss.fullData || ss.thumbnail,
        capturedAt: ss.capturedAt
      })).filter(s => s.fullData); // Only include screenshots with valid data
      
      const response = await fetch('/api/productivity/sessions/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          sessionId: sessionData._id, 
          forceReanalyze,
          preloadedScreenshots: preloadedScreenshots.length > 0 ? preloadedScreenshots : undefined
        })
      });

      const data = await response.json();
      console.log('[AI Analysis] API Response:', { 
        success: data.success, 
        cached: data.cached,
        hasAnalysis: !!data.analysis,
        summary: data.analysis?.summary?.slice(0, 100),
        scores: {
          productivity: data.analysis?.productivityScore,
          focus: data.analysis?.focusScore,
          efficiency: data.analysis?.efficiencyScore
        }
      });
      
      if (data.success && data.analysis) {
        // Show different message based on whether it was cached or new analysis
        if (data.cached) {
          toast.success('Loaded existing analysis');
        } else {
          toast.success('AI analysis complete!');
        }
        
        // Create the updated analysis object
        const updatedAnalysis = {
          summary: data.analysis.summary || '',
          productivityScore: data.analysis.productivityScore || 0,
          focusScore: data.analysis.focusScore || 0,
          efficiencyScore: data.analysis.efficiencyScore || 0,
          scoreBreakdown: data.analysis.scoreBreakdown || {},
          workActivities: data.analysis.workActivities || [],
          insights: data.analysis.insights || [],
          recommendations: data.analysis.recommendations || [],
          areasOfImprovement: data.analysis.areasOfImprovement || [],
          topAchievements: data.analysis.topAchievements || [],
          screenshotAnalysis: data.analysis.screenshotAnalysis || [],
          analyzedAt: data.analysis.analyzedAt || new Date().toISOString()
        };
        
        // Force update the session data with new analysis
        setSessionData(prev => {
          const updated = {
            ...prev,
            aiAnalysis: updatedAnalysis
          };
          console.log('[AI Analysis] Updated session data:', { 
            summary: updatedAnalysis.summary?.slice(0, 100),
            productivityScore: updatedAnalysis.productivityScore,
            focusScore: updatedAnalysis.focusScore
          });
          return updated;
        });
        
        // Clear caches again after successful analysis to refresh grids
        clearCachedData('user_cards');
        clearCachedData('sessions_');
      } else {
        toast.error(data.error || 'Failed to analyze session');
        console.error('[AI Analysis] API Error:', data.error || 'No analysis data returned');
      }
    } catch (error) {
      console.error('AI Analysis error:', error);
      toast.error('Failed to analyze session');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gray-800 px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white">
              Session: {formatLocalTime(sessionData.sessionStart)} - {formatLocalTime(sessionData.sessionEnd)}
            </h3>
            <p className="text-gray-400 text-sm">{formatLocalDateOnly(sessionData.sessionStart)} • {sessionData.sessionDuration || sessionData.durationMinutes} minutes</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full">
            <FaTimes className="text-white text-xl" />
          </button>
        </div>

        {/* Loading state while fetching full session details */}
        {loadingDetails ? (
          <div className="flex-1 flex items-center justify-center p-12">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Loading session details...</p>
            </div>
          </div>
        ) : (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Screenshot Carousel */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-semibold text-gray-800">
                  Screenshots ({Object.keys(loadedScreenshots).length}/{screenshots.length})
                  {preloadingIndex >= 0 && (
                    <span className="ml-2 text-xs text-blue-500 font-normal">
                      Loading {preloadingIndex + 1}...
                    </span>
                  )}
                </h4>
                {screenshots.length > 1 && (
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setIsPlaying(!isPlaying)}
                      className="p-2 bg-gray-100 rounded-full hover:bg-gray-200"
                    >
                      {isPlaying ? <FaPause className="text-gray-600" /> : <FaPlay className="text-gray-600" />}
                    </button>
                    <span className="text-sm text-gray-500">{currentScreenshot + 1} / {screenshots.length}</span>
                  </div>
                )}
              </div>

              {screenshots.length > 0 ? (
                <div className="relative bg-gray-900 rounded-xl overflow-hidden">
                  {!loadedScreenshots[currentScreenshot] && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 z-10">
                      <div className="text-center">
                        <div className="w-8 h-8 border-3 border-blue-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-2"></div>
                        <p className="text-white/70 text-sm">Loading screenshot {currentScreenshot + 1}...</p>
                      </div>
                    </div>
                  )}
                  <img 
                    src={getScreenshotUrl(screenshots[currentScreenshot], currentScreenshot)}
                    alt={`Screenshot ${currentScreenshot + 1}`}
                    className="w-full h-auto cursor-pointer"
                    onClick={() => setFullscreenScreenshot(true)}
                  />
                  
                  {/* Navigation arrows */}
                  {screenshots.length > 1 && (
                    <>
                      <button 
                        onClick={prevScreenshot}
                        className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 rounded-full"
                      >
                        <FaChevronLeft className="text-white" />
                      </button>
                      <button 
                        onClick={nextScreenshot}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 rounded-full"
                      >
                        <FaChevronRight className="text-white" />
                      </button>
                    </>
                  )}

                  {/* Timestamp */}
                  <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                    {formatLocalTime(screenshots[currentScreenshot]?.capturedAt)}
                  </div>

                  {/* Fullscreen button */}
                  <button 
                    onClick={() => setFullscreenScreenshot(true)}
                    className="absolute bottom-2 right-2 p-2 bg-black/50 hover:bg-black/70 rounded-full"
                  >
                    <FaExpand className="text-white" />
                  </button>

                  {/* Context info */}
                  {screenshots[currentScreenshot]?.context?.activeApp && (
                    <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                      {screenshots[currentScreenshot].context.activeApp}
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-48 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400">
                  No screenshots available
                </div>
              )}

              {/* Thumbnail strip with loading indicators */}
              {screenshots.length > 1 && (
                <div className="flex gap-2 mt-3 overflow-x-auto pb-2">
                  {screenshots.map((ss, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentScreenshot(idx)}
                      className={`relative flex-shrink-0 w-20 h-12 rounded-lg overflow-hidden border-2 transition-colors ${
                        idx === currentScreenshot ? 'border-blue-500' : 'border-transparent hover:border-gray-300'
                      }`}
                    >
                      {/* Show loading indicator for screenshots not yet loaded */}
                      {!loadedScreenshots[idx] && (
                        <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                          {preloadingIndex === idx ? (
                            <div className="w-4 h-4 border-2 border-blue-300 border-t-blue-500 rounded-full animate-spin"></div>
                          ) : (
                            <span className="text-white/50 text-xs">{idx + 1}</span>
                          )}
                        </div>
                      )}
                      {/* Show thumbnail if available */}
                      {(ss?.thumbnail || loadedScreenshots[idx]) && (
                        <img 
                          src={ss?.thumbnail || loadedScreenshots[idx]}
                          alt={`Thumbnail ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                      )}
                      {/* Green checkmark for loaded */}
                      {loadedScreenshots[idx] && (
                        <div className="absolute bottom-0 right-0 bg-green-500 rounded-tl-md p-0.5">
                          <FaCheck className="text-white text-[8px]" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Session Details */}
            <div className="space-y-4">
              {/* Scores with breakdown tooltips */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-50 rounded-xl p-4 text-center group relative">
                  <div className="text-2xl font-bold text-gray-800">{sessionData.aiAnalysis?.productivityScore || 0}%</div>
                  <div className="text-sm text-gray-500">Productivity</div>
                  <div className={`h-1 rounded-full mt-2 ${getScoreColor(sessionData.aiAnalysis?.productivityScore || 0)}`}></div>
                  {sessionData.aiAnalysis?.scoreBreakdown?.productivityReason && (
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 max-w-xs text-center">
                      {sessionData.aiAnalysis.scoreBreakdown.productivityReason}
                    </div>
                  )}
                </div>
                <div className="bg-gray-50 rounded-xl p-4 text-center group relative">
                  <div className="text-2xl font-bold text-gray-800">{sessionData.aiAnalysis?.focusScore || 0}%</div>
                  <div className="text-sm text-gray-500">Focus</div>
                  <div className={`h-1 rounded-full mt-2 ${getScoreColor(sessionData.aiAnalysis?.focusScore || 0)}`}></div>
                  {sessionData.aiAnalysis?.scoreBreakdown?.focusReason && (
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 max-w-xs text-center">
                      {sessionData.aiAnalysis.scoreBreakdown.focusReason}
                    </div>
                  )}
                </div>
                <div className="bg-gray-50 rounded-xl p-4 text-center group relative">
                  <div className="text-2xl font-bold text-gray-800">{sessionData.aiAnalysis?.efficiencyScore || 0}%</div>
                  <div className="text-sm text-gray-500">Efficiency</div>
                  <div className={`h-1 rounded-full mt-2 ${getScoreColor(sessionData.aiAnalysis?.efficiencyScore || 0)}`}></div>
                  {sessionData.aiAnalysis?.scoreBreakdown?.efficiencyReason && (
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 max-w-xs text-center">
                      {sessionData.aiAnalysis.scoreBreakdown.efficiencyReason}
                    </div>
                  )}
                </div>
              </div>

              {/* AI Summary - key forces re-render when analysis changes */}
              <div 
                key={`ai-summary-${sessionData.aiAnalysis?.analyzedAt || 'none'}`}
                className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-4 border border-blue-200"
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                    <FaChartLine className="text-blue-600" /> AI Analysis
                    {sessionData.aiAnalysis?.analyzedAt && (
                      <span className="text-xs text-gray-400 font-normal">
                        • analyzed {new Date(sessionData.aiAnalysis.analyzedAt).toLocaleDateString()}
                      </span>
                    )}
                  </h4>
                  <div className="flex items-center gap-2">
                    {sessionData.aiAnalysis?.summary && (
                      <button
                        onClick={() => triggerAIAnalysis(true)}
                        disabled={analyzing || (!allImagesLoaded && screenshots.length > 0)}
                        className={`px-2.5 py-1.5 ${!allImagesLoaded && screenshots.length > 0 ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'} disabled:bg-gray-100 text-xs rounded-lg flex items-center gap-1.5 transition-colors`}
                        title={!allImagesLoaded && screenshots.length > 0 ? `Loading ${Object.keys(loadedScreenshots).length}/${screenshots.length} screenshots...` : "Re-analyze this session"}
                      >
                        {analyzing ? (
                          <div className="animate-spin h-3 w-3 border-2 border-gray-400 border-t-transparent rounded-full"></div>
                        ) : !allImagesLoaded && screenshots.length > 0 ? (
                          <div className="animate-spin h-3 w-3 border-2 border-gray-300 border-t-gray-500 rounded-full"></div>
                        ) : (
                          <FaSync className="text-xs" />
                        )}
                        {!allImagesLoaded && screenshots.length > 0 ? `Loading ${Object.keys(loadedScreenshots).length}/${screenshots.length}...` : 'Re-analyze'}
                      </button>
                    )}
                    {!sessionData.aiAnalysis?.summary && (
                      <button
                        onClick={() => triggerAIAnalysis(false)}
                        disabled={analyzing || (!allImagesLoaded && screenshots.length > 0)}
                        className={`px-3 py-1.5 ${!allImagesLoaded && screenshots.length > 0 ? 'bg-blue-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'} disabled:bg-blue-400 text-white text-xs rounded-lg flex items-center gap-1.5 transition-colors`}
                      >
                        {analyzing ? (
                          <>
                            <div className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full"></div>
                            Analyzing {screenshots.length} screenshots...
                          </>
                        ) : !allImagesLoaded && screenshots.length > 0 ? (
                          <>
                            <div className="animate-spin h-3 w-3 border-2 border-white/60 border-t-white rounded-full"></div>
                            Loading {Object.keys(loadedScreenshots).length}/{screenshots.length}...
                          </>
                        ) : (
                          <>
                            <FaRobot className="text-xs" />
                            Analyze with AI
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">{sessionData.aiAnalysis?.summary || (!allImagesLoaded && screenshots.length > 0 ? `Loading screenshots (${Object.keys(loadedScreenshots).length}/${screenshots.length})... Analysis will be available once all images are loaded.` : 'Click "Analyze with AI" to get a comprehensive AI-powered productivity analysis of this session. All screenshots will be analyzed individually and combined with app/website activity.')}</p>
                
                {/* Work Activities */}
                {sessionData.aiAnalysis?.workActivities?.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-blue-200">
                    <h5 className="text-xs font-semibold text-gray-600 mb-2">🎯 Work Activities Detected</h5>
                    <div className="flex flex-wrap gap-1.5">
                      {sessionData.aiAnalysis.workActivities.map((activity, idx) => (
                        <span key={idx} className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                          {activity}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Insights */}
                {sessionData.aiAnalysis?.insights?.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-blue-200">
                    <h5 className="text-xs font-semibold text-gray-600 mb-2">💡 Key Insights</h5>
                    <ul className="space-y-1">
                      {sessionData.aiAnalysis.insights.slice(0, 4).map((insight, idx) => (
                        <li key={idx} className="text-xs text-gray-600 flex items-start gap-1.5">
                          <span className="text-blue-500 mt-0.5">•</span>
                          {insight}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {/* Screenshot-by-Screenshot Analysis */}
                {sessionData.aiAnalysis?.screenshotAnalysis?.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-blue-200">
                    <h5 className="text-xs font-semibold text-gray-600 mb-2">📸 Screenshot Timeline ({sessionData.aiAnalysis.screenshotAnalysis.length} analyzed)</h5>
                    <div className="max-h-32 overflow-y-auto space-y-1.5">
                      {sessionData.aiAnalysis.screenshotAnalysis.map((ss, idx) => (
                        <div key={idx} className="text-xs text-gray-600 flex items-start gap-2 bg-white/50 rounded p-1.5">
                          <span className="text-purple-600 font-medium whitespace-nowrap">{ss.time || `#${ss.index}`}</span>
                          <span className="text-gray-700">{ss.description}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* App Usage - Enhanced display */}
              {apps.length > 0 && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <FaDesktop className="text-blue-600" /> Application Usage ({apps.length} apps)
                  </h4>
                  <div className="space-y-2">
                    {apps.slice(0, 8).map((app, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                          app.category === 'productive' ? 'bg-green-500' :
                          (app.category === 'distracting' || app.category === 'unproductive') ? 'bg-red-500' : 'bg-gray-400'
                        }`}></span>
                        <span className="flex-1 text-sm truncate font-medium">{app.appName}</span>
                        <div className="w-28 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all ${
                              app.category === 'productive' ? 'bg-green-500' :
                              (app.category === 'distracting' || app.category === 'unproductive') ? 'bg-red-500' : 'bg-blue-400'
                            }`}
                            style={{ width: `${app.percentage || 0}%` }}
                          ></div>
                        </div>
                        <span className="text-xs text-gray-600 w-16 text-right">
                          {app.percentage ? `${app.percentage}%` : formatDuration(app.totalDuration || app.duration)}
                        </span>
                      </div>
                    ))}
                  </div>
                  {apps.length > 8 && (
                    <p className="text-xs text-gray-400 mt-2 text-center">+{apps.length - 8} more applications</p>
                  )}
                </div>
              )}

              {/* Website Visits - Enhanced display */}
              {websites.length > 0 && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <FaGlobe className="text-purple-600" /> Website Visits ({websites.length} sites)
                  </h4>
                  <div className="space-y-2">
                    {websites.slice(0, 6).map((site, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                          site.category === 'productive' ? 'bg-green-500' :
                          (site.category === 'distracting' || site.category === 'unproductive') ? 'bg-red-500' : 'bg-gray-400'
                        }`}></span>
                        <span className="flex-1 text-sm truncate font-medium">{site.domain}</span>
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                          {site.visitCount || site.visits || 1} {(site.visitCount || site.visits || 1) === 1 ? 'visit' : 'visits'}
                        </span>
                        {(site.totalDuration || site.duration) && (
                          <span className="text-xs text-gray-500">
                            {formatDuration(site.totalDuration || site.duration)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                  {websites.length > 6 && (
                    <p className="text-xs text-gray-400 mt-2 text-center">+{websites.length - 6} more websites</p>
                  )}
                </div>
              )}

              {/* No Apps/Websites Warning */}
              {apps.length === 0 && websites.length === 0 && (
                <div className={`rounded-xl p-4 border ${screenshots.length > 0 ? 'bg-blue-50 border-blue-200' : 'bg-yellow-50 border-yellow-200'}`}>
                  <h4 className={`font-semibold mb-2 flex items-center gap-2 ${screenshots.length > 0 ? 'text-blue-800' : 'text-yellow-800'}`}>
                    {screenshots.length > 0 ? (
                      <>📸 Screenshot-Based Session</>
                    ) : (
                      <><FaExclamationTriangle /> No Activity Data</>
                    )}
                  </h4>
                  <p className={`text-sm ${screenshots.length > 0 ? 'text-blue-700' : 'text-yellow-700'}`}>
                    {screenshots.length > 0 ? (
                      <>
                        This session has {screenshots.length} screenshot{screenshots.length > 1 ? 's' : ''} but no detailed app/website tracking data.
                        Click <strong>"Analyze with AI"</strong> above to get an AI-powered analysis of what was done during this session.
                      </>
                    ) : (
                      <>
                        No activity data was captured for this session. This may indicate the desktop app wasn't actively tracking.
                      </>
                    )}
                  </p>
                </div>
              )}

              {/* Keystroke Stats - use keystrokeSummary or keystrokes */}
              {(sessionData.keystrokeSummary?.totalCount > 0 || sessionData.keystrokes?.total > 0) && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <h4 className="font-semibold text-gray-800 mb-2">Activity Metrics</h4>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-lg font-bold text-gray-800">
                        {sessionData.keystrokeSummary?.totalCount || sessionData.keystrokes?.total || 0}
                      </div>
                      <div className="text-xs text-gray-500">Keystrokes</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-gray-800">
                        {sessionData.keystrokeSummary?.averagePerMinute || sessionData.keystrokes?.perMinute || 0}
                      </div>
                      <div className="text-xs text-gray-500">Per Minute</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-gray-800">
                        {sessionData.mouseActivitySummary?.totalClicks || sessionData.mouseClicks || 0}
                      </div>
                      <div className="text-xs text-gray-500">Mouse Clicks</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {sessionData.aiAnalysis?.recommendations?.length > 0 && (
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                  <h4 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                    💡 Recommendations
                  </h4>
                  <ul className="space-y-1">
                    {sessionData.aiAnalysis.recommendations.slice(0, 3).map((rec, idx) => (
                      <li key={idx} className="text-sm text-blue-700">• {rec}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Areas of Improvement */}
              {sessionData.aiAnalysis?.areasOfImprovement?.length > 0 && (
                <div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
                  <h4 className="font-semibold text-orange-800 mb-2 flex items-center gap-2">
                    <FaExclamationTriangle /> Areas to Improve
                  </h4>
                  <ul className="space-y-1">
                    {sessionData.aiAnalysis.areasOfImprovement.map((area, idx) => (
                      <li key={idx} className="text-sm text-orange-700">• {area}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Top Achievements */}
              {sessionData.aiAnalysis?.topAchievements?.length > 0 && (
                <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                  <h4 className="font-semibold text-green-800 mb-2 flex items-center gap-2">
                    🏆 Achievements
                  </h4>
                  <ul className="space-y-1">
                    {sessionData.aiAnalysis.topAchievements.map((achievement, idx) => (
                      <li key={idx} className="text-sm text-green-700">• {achievement}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
        )}
      </div>

      {/* Fullscreen Screenshot Modal */}
      {fullscreenScreenshot && (
        <div 
          className="fixed inset-0 z-[70] bg-black flex items-center justify-center"
          onClick={() => setFullscreenScreenshot(false)}
        >
          <button 
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full"
            onClick={() => setFullscreenScreenshot(false)}
          >
            <FaTimes className="text-white text-2xl" />
          </button>
          <img 
            src={getScreenshotUrl(screenshots[currentScreenshot], currentScreenshot)}
            alt="Fullscreen screenshot"
            className="max-w-full max-h-full object-contain"
          />
          {screenshots.length > 1 && (
            <>
              <button 
                onClick={(e) => { e.stopPropagation(); prevScreenshot(); }}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 rounded-full"
              >
                <FaChevronLeft className="text-white text-2xl" />
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); nextScreenshot(); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 rounded-full"
              >
                <FaChevronRight className="text-white text-2xl" />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Chat History User Cards Grid Component
 * Shows a grid of user cards for MAYA chat history
 * Uses caching to reduce server queries
 * Prevents unnecessary re-fetches on tab switches
 * For self_only users with a single card, auto-selects their card
 */
export function ChatHistoryCardsGrid({ onUserSelect, selectedUserId, refreshKey, autoSelectSelf = true }) {
  const [userCards, setUserCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [accessLevel, setAccessLevel] = useState('admin');
  const lastRefreshRef = useRef(null);
  const hasFetchedRef = useRef(false);
  const autoSelectedRef = useRef(false);

  // Auto-select for self_only users with a single card
  useEffect(() => {
    if (autoSelectSelf && !autoSelectedRef.current && accessLevel === 'self_only' && userCards.length === 1 && userCards[0].isOwn) {
      autoSelectedRef.current = true;
      setTimeout(() => {
        onUserSelect(userCards[0]);
      }, 100);
    }
  }, [accessLevel, userCards, autoSelectSelf, onUserSelect]);

  useEffect(() => {
    // Check cache first
    const cached = getCachedData('chat_history_user_cards');
    if (cached?.data) {
      setUserCards(cached.data);
      setLoading(false);
      hasFetchedRef.current = true;
    }
    
    // Only fetch if refreshKey explicitly changed or no cache and haven't fetched
    const refreshKeyChanged = refreshKey !== lastRefreshRef.current && lastRefreshRef.current !== null;
    const needsInitialFetch = !cached && !hasFetchedRef.current;
    
    if (refreshKeyChanged || needsInitialFetch) {
      lastRefreshRef.current = refreshKey;
      fetchChatHistoryCards(!cached);
    } else if (!hasFetchedRef.current) {
      lastRefreshRef.current = refreshKey;
    }
  }, [refreshKey]);

  const fetchChatHistoryCards = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/productivity/chat-history/user-cards', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (data.success) {
        setUserCards(data.data || []);
        setAccessLevel(data.accessLevel || 'admin');
        setCachedData('chat_history_user_cards', data.data || []);
      } else {
        console.error('Failed to fetch chat history cards:', data.error);
      }
    } catch (error) {
      console.error('Failed to fetch chat history cards:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl shadow-md p-4 animate-pulse">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
            <div className="h-16 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  if (userCards.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-12 text-center">
        <FaUser className="text-6xl text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-600 mb-2">
          {accessLevel === 'self_only' ? 'No MAYA Conversations Yet' : 'No Chat History'}
        </h3>
        <p className="text-gray-500">
          {accessLevel === 'self_only' 
            ? 'Your MAYA conversations will appear here once you start chatting with MAYA'
            : 'MAYA conversations will appear here when employees chat with MAYA'}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {userCards.map((card) => (
        <ChatHistoryUserCard 
          key={card.id} 
          card={card} 
          onClick={() => onUserSelect(card)}
          isSelected={selectedUserId === card.userId}
        />
      ))}
    </div>
  );
}

/**
 * Individual Chat History User Card Component
 */
function ChatHistoryUserCard({ card, onClick, isSelected }) {
  return (
    <div 
      onClick={onClick}
      className={`bg-white rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer p-4 border-2 ${
        isSelected ? 'border-purple-500 ring-2 ring-purple-200' : 'border-transparent hover:border-gray-200'
      }`}
    >
      {/* Header with avatar and name */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative">
          {card.profilePicture ? (
            <img 
              src={card.profilePicture} 
              alt={card.name} 
              className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <span className="text-white font-bold text-lg">
                {card.name?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-gray-800 truncate flex items-center gap-2">
            {card.name}
            {card.isOwn && <span className="text-xs bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded">You</span>}
          </h4>
          <p className="text-sm text-gray-500 truncate">{card.employeeCode || card.designation}</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-purple-600">{card.totalConversations || 0}</div>
          <div className="text-xs text-gray-500">Chats</div>
        </div>
      </div>

      {/* Last message preview */}
      {card.lastMessage && (
        <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-gray-400">Last conversation</span>
            <span className="text-xs text-gray-400">
              {card.lastMessageTime ? formatLocalDateTime(card.lastMessageTime) : ''}
            </span>
          </div>
          <p className="text-sm text-gray-600 line-clamp-2">{card.lastMessage}</p>
        </div>
      )}

      {/* Quick stats */}
      <div className="flex items-center justify-between text-sm mt-3 pt-3 border-t border-gray-100">
        <div className="flex items-center gap-1 text-gray-500">
          <span className="text-purple-500 font-medium">{card.todayConversations || 0}</span>
          <span>today</span>
        </div>
        <div className="flex items-center gap-1 text-gray-500">
          <span className="text-purple-500 font-medium">{card.totalMessages || 0}</span>
          <span>messages</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Chat History Popup Modal Component
 * Shows detailed chat history for a user
 */
export function ChatHistoryPopup({ user, isOpen, onClose }) {
  const { theme } = useTheme();
  const primaryColor = theme?.primary?.[600] || '#2563EB';
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [selectedConversation, setSelectedConversation] = useState(null);

  useEffect(() => {
    if (isOpen && user) {
      fetchConversations(true);
    }
  }, [isOpen, user]);

  const fetchConversations = async (reset = false) => {
    if (!user) return;
    
    try {
      if (reset) {
        setLoading(true);
        setConversations([]);
        setOffset(0);
      } else {
        setLoadingMore(true);
      }

      const newOffset = reset ? 0 : offset;
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/productivity/chat-history?userId=${user.userId}&limit=4&offset=${newOffset}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();

      if (data.success) {
        const newConversations = data.data || [];
        if (reset) {
          setConversations(newConversations);
        } else {
          setConversations(prev => [...prev, ...newConversations]);
        }
        setOffset(newOffset + newConversations.length);
        setHasMore(newConversations.length === 4);
      }
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
      toast.error('Failed to load conversations');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      fetchConversations(false);
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col mx-4">
        {/* Header */}
        <div className="px-6 py-4 flex items-center gap-4" style={{ backgroundColor: primaryColor }}>
          {user?.profilePicture ? (
            <img 
              src={user.profilePicture} 
              alt={user.name} 
              className="w-14 h-14 rounded-full border-3 border-white shadow-lg object-cover"
            />
          ) : (
            <div className="w-14 h-14 rounded-full border-3 border-white shadow-lg bg-white flex items-center justify-center">
              <span className="text-2xl font-bold" style={{ color: primaryColor }}>
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
          )}
          <div className="flex-1">
            <h3 className="text-xl font-bold text-white">{user?.name || 'User'}</h3>
            <p className="text-gray-200 text-sm">{user?.designation || user?.employeeCode || 'Employee'}</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 bg-black/10 hover:bg-black/20 rounded-full transition-colors"
          >
            <FaTimes className="text-white text-xl" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FaUser className="text-5xl text-gray-300 mx-auto mb-4" />
              <p>No conversations found</p>
            </div>
          ) : (
            <>
              {conversations.map((conversation, idx) => (
                <div 
                  key={conversation._id || idx} 
                  className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setSelectedConversation(selectedConversation?._id === conversation._id ? null : conversation)}
                >
                  {/* Conversation Header */}
                  <div className="px-4 py-3 bg-white border-b border-gray-100 flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      {formatLocalDateTime(conversation.createdAt)}
                    </span>
                    <span className="text-sm bg-purple-100 text-purple-700 px-3 py-1 rounded-full">
                      {conversation.messages?.length || 0} messages
                    </span>
                  </div>

                  {/* Message Preview / Full Messages */}
                  <div className="p-4">
                    {selectedConversation?._id === conversation._id ? (
                      // Full conversation view
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {conversation.messages?.map((msg, msgIdx) => (
                          <div 
                            key={msgIdx} 
                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                          >
                            <div className={`max-w-[85%] rounded-2xl px-4 py-2 ${
                              msg.role === 'user' 
                                ? 'bg-purple-500 text-white' 
                                : 'bg-white text-gray-800 border border-gray-200 shadow-sm'
                            }`}>
                              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                              {msg.timestamp && (
                                <p className={`text-xs mt-1 ${msg.role === 'user' ? 'text-purple-200' : 'text-gray-400'}`}>
                                  {formatLocalTime(msg.timestamp)}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      // Preview mode - show first user message
                      <div className="space-y-2">
                        {conversation.messages?.slice(0, 2).map((msg, msgIdx) => (
                          <div 
                            key={msgIdx} 
                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                          >
                            <div className={`max-w-[80%] rounded-xl px-4 py-2 text-sm ${
                              msg.role === 'user' 
                                ? 'bg-purple-500 text-white' 
                                : 'bg-white text-gray-800 border'
                            }`}>
                              {msg.content?.substring(0, 100)}{msg.content?.length > 100 ? '...' : ''}
                            </div>
                          </div>
                        ))}
                        {conversation.messages?.length > 2 && (
                          <div className="text-center text-sm text-purple-500 font-medium">
                            Click to see all {conversation.messages.length} messages
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Load More Button */}
              {hasMore && (
                <div className="text-center pt-4">
                  <button
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="px-6 py-2 text-white rounded-full font-medium transition-all disabled:opacity-50 hover:opacity-90"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {loadingMore ? (
                      <span className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Loading...
                      </span>
                    ) : (
                      'Load More Conversations'
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
}


/**
 * Raw Captures User Cards Grid Component
 * Shows a grid of user cards for raw captures monitoring
 * Uses caching to reduce server queries
 * Prevents unnecessary re-fetches on tab switches
 */
export function RawCapturesUserCardsGrid({ onUserSelect, selectedUserId, refreshKey }) {
  const [userCards, setUserCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [accessLevel, setAccessLevel] = useState('admin');
  const lastRefreshRef = useRef(null);
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    // Check cache first
    const cached = getCachedData('raw_captures_user_cards');
    if (cached?.data) {
      setUserCards(cached.data);
      setLoading(false);
      hasFetchedRef.current = true;
    }
    
    // Only fetch if refreshKey explicitly changed or no cache and haven't fetched
    const refreshKeyChanged = refreshKey !== lastRefreshRef.current && lastRefreshRef.current !== null;
    const needsInitialFetch = !cached && !hasFetchedRef.current;
    
    if (refreshKeyChanged || needsInitialFetch) {
      lastRefreshRef.current = refreshKey;
      fetchUserCards(!cached);
    } else if (!hasFetchedRef.current) {
      lastRefreshRef.current = refreshKey;
    }
  }, [refreshKey]);

  const fetchUserCards = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/productivity/monitor/user-cards', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (data.success) {
        setUserCards(data.data || []);
        setAccessLevel(data.accessLevel || 'admin');
        setCachedData('raw_captures_user_cards', data.data || []);
      } else {
        console.error('Failed to fetch raw capture user cards:', data.error);
      }
    } catch (error) {
      console.error('Failed to fetch raw capture user cards:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl shadow-md p-4 animate-pulse">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
            <div className="h-16 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  if (userCards.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-12 text-center">
        <FaCamera className="text-6xl text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-600 mb-2">
          {accessLevel === 'self_only' ? 'No Raw Captures Yet' : 'No Captures Found'}
        </h3>
        <p className="text-gray-500">
          {accessLevel === 'self_only' 
            ? 'Your raw captures will appear here once you start using the desktop app'
            : 'Raw capture data will appear when employees use the desktop app'}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {userCards.map((card) => (
        <RawCaptureUserCard 
          key={card.id} 
          card={card} 
          onClick={() => onUserSelect(card)}
          isSelected={selectedUserId === card.userId}
        />
      ))}
    </div>
  );
}

/**
 * Individual Raw Capture User Card Component
 */
function RawCaptureUserCard({ card, onClick, isSelected }) {
  const getProductivityColor = (score) => {
    if (score >= 70) return { bg: 'bg-green-500', text: 'text-green-600', ring: 'ring-green-200' };
    if (score >= 40) return { bg: 'bg-yellow-500', text: 'text-yellow-600', ring: 'ring-yellow-200' };
    return { bg: 'bg-red-500', text: 'text-red-600', ring: 'ring-red-200' };
  };

  const colors = getProductivityColor(card.avgProductivity || 0);
  const isRecent = card.latestCapture && (new Date() - new Date(card.latestCapture)) < 30 * 60 * 1000;

  return (
    <div 
      onClick={onClick}
      className={`bg-white rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer p-4 border-2 ${
        isSelected ? 'border-orange-500 ring-2 ring-orange-200' : 'border-transparent hover:border-gray-200'
      }`}
    >
      {/* Header with avatar and name */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative">
          {card.profilePicture ? (
            <img 
              src={card.profilePicture} 
              alt={card.name} 
              className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
              <span className="text-white font-bold text-lg">
                {card.name?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
          )}
          {/* Recent indicator */}
          <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
            isRecent ? 'bg-green-500' : 'bg-gray-400'
          }`}></div>
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-gray-800 truncate flex items-center gap-2">
            {card.name}
            {card.isOwn && <span className="text-xs bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded">You</span>}
          </h4>
          <p className="text-sm text-gray-500 truncate">{card.designation || card.department}</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-gray-50 rounded-lg p-2 text-center">
          <div className="text-lg font-bold text-orange-600">{card.totalCaptures}</div>
          <div className="text-xs text-gray-500">Total</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-2 text-center">
          <div className="text-lg font-bold text-blue-600">{card.todayCaptures}</div>
          <div className="text-xs text-gray-500">Today</div>
        </div>
      </div>

      {/* Productivity & Active Time */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-1">
          <FaChartLine className={colors.text} />
          <span className={`font-medium ${colors.text}`}>{card.avgProductivity}%</span>
        </div>
        <div className="flex items-center gap-1 text-gray-500">
          <FaClock className="text-gray-500" />
          <span>{card.totalActiveTime} min</span>
        </div>
      </div>

      {/* View Button */}
      <button className="w-full mt-3 py-2 bg-orange-50 hover:bg-orange-100 text-orange-600 rounded-lg text-sm font-medium transition-colors">
        View Raw Captures
      </button>
    </div>
  );
}


/**
 * Raw Captures Popup Modal
 * Shows raw capture data for a selected user with pagination
 * Includes caching and admin delete functionality
 * Preserves data on tab switches - only fetches new data
 * Uses progressive loading to show captures one at a time for better UX
 */
export function RawCapturesPopup({ user, isOpen, onClose, onDataChange }) {
  const { theme } = useTheme();
  const primaryColor = theme?.primary?.[600] || '#2563EB';
  const [captures, setCaptures] = useState([]);
  const [visibleCaptures, setVisibleCaptures] = useState([]); // Progressive display
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [expandedCaptures, setExpandedCaptures] = useState(new Set());
  const [totalCount, setTotalCount] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false); // Track if we're progressively loading captures
  const [loadedScreenshots, setLoadedScreenshots] = useState({}); // Cache for loaded screenshot data
  const [loadingScreenshotIndex, setLoadingScreenshotIndex] = useState(-1); // Which screenshot is loading
  const limit = 10;
  const popupRef = useRef(null);
  const streamingIndexRef = useRef(0);
  const screenshotAbortRef = useRef(null); // To abort screenshot loading if popup closes
  const isAdmin = useMemo(() => isUserAdmin(), []);
  const cacheKey = useMemo(() => user?.userId ? `raw_captures_${user.userId}` : null, [user?.userId]);
  const lastUserIdRef = useRef(null);
  const hasFetchedRef = useRef(false);

  // Progressive loading effect - show captures one by one (metadata only)
  useEffect(() => {
    if (isStreaming && captures.length > 0 && visibleCaptures.length < captures.length) {
      const timer = setTimeout(() => {
        const nextIndex = visibleCaptures.length;
        if (nextIndex < captures.length) {
          setVisibleCaptures(prev => [...prev, captures[nextIndex]]);
        }
        if (nextIndex + 1 >= captures.length) {
          setIsStreaming(false);
        }
      }, 100); // Show each capture with 100ms delay for smooth streaming effect
      return () => clearTimeout(timer);
    }
  }, [isStreaming, captures, visibleCaptures.length]);

  // Sequential screenshot loading - load one by one after captures are visible
  useEffect(() => {
    if (!isStreaming && visibleCaptures.length > 0) {
      // Find first capture without loaded screenshot
      const nextToLoad = visibleCaptures.findIndex((_, idx) => !loadedScreenshots[idx]);
      if (nextToLoad !== -1 && loadingScreenshotIndex === -1) {
        loadScreenshotForCapture(nextToLoad);
      }
    }
  }, [isStreaming, visibleCaptures.length, loadedScreenshots, loadingScreenshotIndex]);

  // Load screenshot for a specific capture index
  const loadScreenshotForCapture = async (index) => {
    const capture = visibleCaptures[index];
    if (!capture || loadedScreenshots[index]) return;
    
    // If capture already has screenshot data, use it
    if (capture.screenshotUrl || capture.screenshot?.data) {
      const screenshotData = capture.screenshotUrl || 
        (capture.screenshot?.data?.startsWith('data:') ? capture.screenshot.data : `data:image/png;base64,${capture.screenshot?.data}`);
      setLoadedScreenshots(prev => ({ ...prev, [index]: screenshotData }));
      return;
    }

    setLoadingScreenshotIndex(index);
    
    try {
      const token = localStorage.getItem('token');
      // Fetch single capture with screenshot
      const response = await fetch(
        `/api/productivity/monitor?captureId=${capture._id}&includeScreenshot=true`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      if (screenshotAbortRef.current?.abort) return;
      
      const data = await response.json();
      
      if (data.success && data.data?.[0]) {
        const screenshotData = data.data[0].screenshotUrl || 
          (data.data[0].screenshot?.data?.startsWith('data:') ? data.data[0].screenshot.data : `data:image/png;base64,${data.data[0].screenshot?.data}`);
        if (screenshotData) {
          setLoadedScreenshots(prev => ({ ...prev, [index]: screenshotData }));
        }
      }
    } catch (error) {
      console.error(`Failed to load screenshot for capture ${index}:`, error);
    } finally {
      setLoadingScreenshotIndex(-1);
    }
  };

  useEffect(() => {
    if (isOpen && user) {
      const userChanged = lastUserIdRef.current !== user.userId;
      lastUserIdRef.current = user.userId;
      
      // Reset screenshot loading state
      screenshotAbortRef.current = { abort: false };
      
      // Check cache first
      const cached = cacheKey ? getCachedData(cacheKey) : null;
      
      if (cached?.data?.length > 0 && !userChanged) {
        // Use cached data and show immediately (no streaming for cached)
        setCaptures(cached.data);
        setVisibleCaptures(cached.data); // Show all cached immediately
        setTotalCount(user?.totalCaptures || cached.data.length);
        setHasMore(cached.data.length < (user?.totalCaptures || cached.data.length + limit));
        setLoading(false);
        hasFetchedRef.current = true;
        
        // Screenshots from cache should already be in the data
        const cachedScreenshots = {};
        cached.data.forEach((cap, idx) => {
          if (cap.screenshotUrl || cap.screenshot?.data) {
            cachedScreenshots[idx] = cap.screenshotUrl || 
              (cap.screenshot?.data?.startsWith('data:') ? cap.screenshot.data : `data:image/png;base64,${cap.screenshot?.data}`);
          }
        });
        setLoadedScreenshots(cachedScreenshots);
        
        // Fetch new captures in background (prepend new ones)
        fetchNewCaptures(cached.data);
      } else if (userChanged || !hasFetchedRef.current) {
        // User changed or first load - do progressive fetch
        setCaptures([]);
        setVisibleCaptures([]);
        setLoadedScreenshots({});
        setHasMore(true);
        setTotalCount(user?.totalCaptures || 0);
        fetchCapturesProgressively();
      }
    }
    
    // Cleanup on close
    return () => {
      if (screenshotAbortRef.current) {
        screenshotAbortRef.current.abort = true;
      }
    };
  }, [isOpen, user]);

  // Fetch captures progressively - metadata first, then screenshots sequentially
  const fetchCapturesProgressively = async () => {
    if (!user?.userId) return;
    
    setLoading(true);
    setIsStreaming(true);
    setCaptures([]);
    setVisibleCaptures([]);
    setLoadedScreenshots({});
    setLoadingScreenshotIndex(-1);
    
    try {
      const token = localStorage.getItem('token');
      
      // Fetch ALL captures metadata WITHOUT screenshots first (fast!)
      const response = await fetch(
        `/api/productivity/monitor?userId=${user.userId}&limit=${limit}&skip=0&includeScreenshot=false`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        console.error('Failed to fetch captures:', data.error || 'Unknown error');
        toast.error(data.error || 'Failed to load captures');
        setLoading(false);
        setIsStreaming(false);
        return;
      }
      
      if (data.success) {
        const allCaptures = (data.data || []).filter(item => item.status !== 'pending');
        
        if (allCaptures.length > 0) {
          // Show first capture immediately
          setCaptures(allCaptures);
          setVisibleCaptures([allCaptures[0]]);
          setLoading(false); // Stop main loading spinner
          
          // Use API's total count
          const apiTotal = data.total || 0;
          const userTotal = user?.totalCaptures || 0;
          const bestTotal = Math.max(apiTotal, userTotal, allCaptures.length);
          
          setTotalCount(bestTotal);
          setHasMore(allCaptures.length < bestTotal);
          hasFetchedRef.current = true;
          
          // Cache the results (without screenshots for now)
          if (cacheKey && allCaptures.length > 0) {
            setCachedData(cacheKey, allCaptures);
          }
        } else {
          setLoading(false);
          setIsStreaming(false);
        }
      }
    } catch (error) {
      console.error('Failed to fetch captures:', error);
      toast.error('Failed to load captures');
      setLoading(false);
      setIsStreaming(false);
    }
  };

  // Fetch only new captures (newer than latest cached)
  const fetchNewCaptures = async (existingCaptures) => {
    if (!user?.userId || existingCaptures.length === 0) return;
    
    try {
      const token = localStorage.getItem('token');
      const latestTime = new Date(existingCaptures[0].createdAt).toISOString();
      
      const response = await fetch(
        `/api/productivity/monitor?userId=${user.userId}&limit=20&after=${latestTime}&includeScreenshot=true`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      const data = await response.json();
      
      if (data.success && data.data?.length > 0) {
        const newCapturesData = (data.data || []).filter(item => item.status !== 'pending');
        if (newCapturesData.length > 0) {
          // Prepend new captures
          const updatedCaptures = [...newCapturesData, ...existingCaptures];
          setCaptures(updatedCaptures);
          setVisibleCaptures(updatedCaptures); // Show all including new ones
          setTotalCount(prev => prev + newCapturesData.length);
          
          // Update cache
          if (cacheKey) {
            setCachedData(cacheKey, updatedCaptures);
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch new captures:', error);
    }
  };

  const fetchCaptures = async (reset = false, showLoading = true) => {
    if (!user?.userId) return;
    
    try {
      if (reset && showLoading) {
        setLoading(true);
        setCaptures([]);
        setVisibleCaptures([]);
      } else if (!reset) {
        setLoadingMore(true);
      }

      const token = localStorage.getItem('token');
      const currentCount = reset ? 0 : captures.length;
      const response = await fetch(
        `/api/productivity/monitor?userId=${user.userId}&limit=${limit}&skip=${currentCount}&includeScreenshot=true`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      const data = await response.json();
      
      if (data.success) {
        const newCapturesData = (data.data || []).filter(item => item.status !== 'pending');
        
        let updatedCaptures;
        if (reset) {
          updatedCaptures = newCapturesData;
          // Start progressive loading for new fetch
          setIsStreaming(true);
        } else {
          // When loading more, append and deduplicate
          const existingIds = new Set(captures.map(c => c._id));
          const uniqueNewCaptures = newCapturesData.filter(c => !existingIds.has(c._id));
          updatedCaptures = [...captures, ...uniqueNewCaptures];
          // For load more, also show immediately
          setVisibleCaptures(updatedCaptures);
        }
        
        setCaptures(updatedCaptures);
        hasFetchedRef.current = true;
        
        // Use API's total count if available, otherwise fall back to user's totalCaptures
        const apiTotal = data.total || 0;
        const userTotal = user?.totalCaptures || 0;
        const bestTotal = Math.max(apiTotal, userTotal, updatedCaptures.length);
        
        // Use API's hasMore if available, otherwise calculate based on totals
        const stillHasMore = data.hasMore !== undefined 
          ? data.hasMore 
          : (bestTotal > 0 ? updatedCaptures.length < bestTotal : newCapturesData.length >= limit);
        
        setTotalCount(bestTotal);
        setHasMore(stillHasMore);
        
        // Cache the results
        if (cacheKey && updatedCaptures.length > 0) {
          setCachedData(cacheKey, updatedCaptures);
        }
      }
    } catch (error) {
      console.error('Failed to fetch captures:', error);
      if (showLoading) toast.error('Failed to load captures');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleDeleteAllScreenshots = async () => {
    if (!confirm(`Are you sure you want to delete ALL raw captures for ${user?.name}? This action cannot be undone.`)) return;
    
    setDeleting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/productivity/sessions?userId=${user.userId}&type=all`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (data.success) {
        toast.success(`Deleted ${data.rawDataDeleted} captures`);
        setCaptures([]);
        setVisibleCaptures([]);
        setTotalCount(0);
        if (cacheKey) clearCachedData(cacheKey);
        clearCachedData('raw_captures_user_cards');
        clearCachedData('user_cards');
        onDataChange?.();
      } else {
        toast.error(data.error || 'Failed to delete captures');
      }
    } catch (error) {
      toast.error('Failed to delete captures');
    } finally {
      setDeleting(false);
    }
  };

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      fetchCaptures(false, true);
    }
  };

  const toggleExpand = (captureId) => {
    setExpandedCaptures(prev => {
      const newSet = new Set(prev);
      if (newSet.has(captureId)) {
        newSet.delete(captureId);
      } else {
        newSet.add(captureId);
      }
      return newSet;
    });
  };

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[99999] p-4">
      {/* Animation styles for portal */}
      <style jsx global>{`
        @keyframes fadeInSlide {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeInSlide 0.3s ease-out forwards;
        }
      `}</style>
      <div 
        ref={popupRef}
        className="bg-gray-100 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="px-6 py-4 flex items-center gap-4" style={{ backgroundColor: primaryColor }}>
          {user?.profilePicture ? (
            <img 
              src={user.profilePicture} 
              alt={user.name} 
              className="w-14 h-14 rounded-full border-3 border-white shadow-lg object-cover"
            />
          ) : (
            <div className="w-14 h-14 rounded-full border-3 border-white shadow-lg bg-white flex items-center justify-center">
              <span className="text-2xl font-bold" style={{ color: primaryColor }}>
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
          )}
          <div className="flex-1">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              {user?.isOwn ? 'Your Raw Captures' : `${user?.name}'s Raw Captures`}
              {user?.isOwn && <span className="text-xs bg-white/20 px-2 py-1 rounded-full">You</span>}
            </h2>
            <p className="text-gray-200 text-sm">{user?.employeeCode || user?.designation || 'Employee'} • {user?.department}</p>
          </div>
          <div className="text-right text-white mr-4">
            <div className="text-2xl font-bold">{totalCount || visibleCaptures.length}</div>
            <div className="text-sm text-gray-200">Total Captures</div>
          </div>
          
          {/* Admin Delete All Button */}
          {isAdmin && visibleCaptures.length > 0 && (
            <button
              onClick={handleDeleteAllScreenshots}
              disabled={deleting}
              className="px-3 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              <FaTrash className="text-xs" />
              Delete All
            </button>
          )}
          
          <button 
            onClick={onClose}
            className="bg-black/10 hover:bg-black/20 rounded-full p-2 transition-colors"
          >
            <FaTimes className="text-white text-xl" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && visibleCaptures.length === 0 ? (
            <div className="space-y-4">
              {/* Show single loading skeleton initially */}
              <div className="bg-white rounded-xl p-4 animate-pulse">
                <div className="flex gap-4">
                  <div className="w-48 h-32 bg-gray-200 rounded-lg"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
                    <div className="h-20 bg-gray-200 rounded"></div>
                  </div>
                </div>
              </div>
              <div className="text-center text-gray-500 text-sm">
                Loading first capture...
              </div>
            </div>
          ) : visibleCaptures.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center">
              <FaCamera className="text-6xl text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">No Raw Captures</h3>
              <p className="text-gray-500">Raw capture data will appear here once captured</p>
            </div>
          ) : (
            <>
              {/* Loading status indicators */}
              <div className="mb-4 flex items-center justify-between bg-gray-50 rounded-lg py-2 px-4">
                <span className="text-sm text-gray-600">
                  Showing {visibleCaptures.length} of {captures.length} captures
                </span>
                <div className="flex items-center gap-3">
                  {/* Screenshot loading progress */}
                  <span className="text-sm text-gray-500">
                    Screenshots: {Object.keys(loadedScreenshots).length}/{visibleCaptures.length}
                  </span>
                  {loadingScreenshotIndex >= 0 && (
                    <div className="flex items-center gap-1 text-blue-600">
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                      <span className="text-xs">Loading #{loadingScreenshotIndex + 1}</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="space-y-4">
                {visibleCaptures.map((capture, idx) => (
                  <div 
                    key={capture._id || idx}
                    className="bg-white rounded-xl shadow-md overflow-hidden animate-fadeIn"
                    style={{ animationDelay: `${idx * 50}ms` }}
                  >
                    <div 
                      className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => toggleExpand(capture._id)}
                    >
                      <div className="flex gap-4">
                        {/* Thumbnail with sequential loading */}
                        <div className="relative w-48 h-32 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                          {loadedScreenshots[idx] ? (
                            <img 
                              src={loadedScreenshots[idx]}
                              alt="Screenshot"
                              className="w-full h-full object-cover"
                            />
                          ) : loadingScreenshotIndex === idx ? (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-gray-800">
                              <div className="w-6 h-6 border-2 border-blue-300 border-t-blue-500 rounded-full animate-spin mb-2"></div>
                              <span className="text-white/70 text-xs">Loading...</span>
                            </div>
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                              <FaCamera className="text-2xl text-gray-400 mb-1" />
                              <span className="text-xs">{idx + 1}</span>
                            </div>
                          )}
                          {/* Show checkmark for loaded */}
                          {loadedScreenshots[idx] && (
                            <div className="absolute bottom-1 right-1 bg-green-500 rounded-full p-0.5">
                              <FaCheck className="text-white text-[8px]" />
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <FaClock className="text-gray-400" />
                              <span className="text-sm text-gray-600">
                                {formatLocalDateTime(capture.createdAt)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              {expandedCaptures.has(capture._id) ? (
                                <FaChevronUp className="text-gray-400" />
                              ) : (
                                <FaChevronDown className="text-gray-400" />
                              )}
                            </div>
                          </div>

                          {/* Active App/Website */}
                          {(capture.topApps?.[0]?.appName || capture.appUsage?.[0]?.appName || capture.activeWindow) && (
                            <div className="flex items-center gap-2 mb-2">
                              <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                                <FaDesktop className="text-blue-500" />
                                {capture.topApps?.[0]?.appName || capture.appUsage?.[0]?.appName || capture.activeWindow}
                              </span>
                              {(capture.topWebsites?.[0]?.domain || capture.websiteVisits?.[0]?.domain) && (
                                <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-purple-50 text-purple-700 rounded-full text-xs font-medium">
                                  <FaGlobe className="text-purple-500" />
                                  {capture.topWebsites?.[0]?.domain || capture.websiteVisits?.[0]?.domain}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Activity Preview - show active window title if available */}
                          {(capture.appUsage?.[0]?.windowTitle || capture.aiAnalysis?.activities) && !expandedCaptures.has(capture._id) && (
                            <p className="text-sm text-gray-600 line-clamp-2">
                              {capture.appUsage?.[0]?.windowTitle || capture.aiAnalysis?.activities}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Expanded Content */}
                    {expandedCaptures.has(capture._id) && (
                      <div className="border-t bg-gray-50 p-4">
                        {/* Full Screenshot */}
                        {loadedScreenshots[idx] ? (
                          <div className="mb-4">
                            <img 
                              src={loadedScreenshots[idx]}
                              alt="Full Screenshot"
                              className="w-full max-h-96 object-contain rounded-lg border"
                            />
                          </div>
                        ) : (
                          <div className="mb-4 flex items-center justify-center h-48 bg-gray-200 rounded-lg">
                            <div className="text-center">
                              <div className="w-8 h-8 border-2 border-blue-300 border-t-blue-500 rounded-full animate-spin mx-auto mb-2"></div>
                              <span className="text-gray-500 text-sm">Loading full screenshot...</span>
                            </div>
                          </div>
                        )}

                        {/* AI Analysis */}
                        {capture.aiAnalysis && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {capture.aiAnalysis.activities && (
                              <div className="bg-white rounded-lg p-3 border">
                                <h4 className="font-semibold text-gray-700 mb-1">Activities</h4>
                                <p className="text-sm text-gray-600">{capture.aiAnalysis.activities}</p>
                              </div>
                            )}
                            {capture.aiAnalysis.summary && (
                              <div className="bg-white rounded-lg p-3 border">
                                <h4 className="font-semibold text-gray-700 mb-1">Summary</h4>
                                <p className="text-sm text-gray-600">{capture.aiAnalysis.summary}</p>
                              </div>
                            )}
                            {capture.aiAnalysis.recommendation && (
                              <div className="bg-white rounded-lg p-3 border md:col-span-2">
                                <h4 className="font-semibold text-gray-700 mb-1">Recommendation</h4>
                                <p className="text-sm text-gray-600">{capture.aiAnalysis.recommendation}</p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Apps Detected */}
                        {capture.appsDetected?.length > 0 && (
                          <div className="mt-4">
                            <h4 className="font-semibold text-gray-700 mb-2">Apps Detected</h4>
                            <div className="flex flex-wrap gap-2">
                              {capture.appsDetected.map((app, i) => (
                                <span key={i} className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                                  {app}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Load More Button - Always show if there are more captures to load */}
              {visibleCaptures.length > 0 && (
                <div className="text-center pt-6 pb-2">
                  <p className="text-sm text-gray-500 mb-3">
                    Showing {visibleCaptures.length} of {totalCount > 0 ? totalCount : (user?.totalCaptures || visibleCaptures.length)} captures
                  </p>
                  {(hasMore || visibleCaptures.length < totalCount) ? (
                    <button
                      onClick={loadMore}
                      disabled={loadingMore || isStreaming}
                      className="px-8 py-3 text-white rounded-full font-medium transition-all disabled:opacity-50 hover:opacity-90 shadow-lg"
                      style={{ backgroundColor: primaryColor }}
                    >
                      {loadingMore ? (
                        <span className="flex items-center justify-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Loading More...
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-2">
                          <FaSync className="text-white" />
                          Load More Captures ({Math.max(0, totalCount - visibleCaptures.length)} remaining)
                        </span>
                      )}
                    </button>
                  ) : (
                    <p className="text-sm text-gray-400">All captures loaded</p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
}

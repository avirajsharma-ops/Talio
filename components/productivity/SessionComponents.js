'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { FaUser, FaClock, FaCamera, FaChartLine, FaTimes, FaChevronLeft, FaChevronRight, FaExpand, FaPlay, FaPause, FaSync, FaExclamationTriangle } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { formatLocalDateTime, formatLocalDateOnly, formatLocalTime } from '@/lib/browserTimezone';

/**
 * User Cards Grid Component
 * Shows a grid of user cards with quick stats and latest session info
 */
export function UserCardsGrid({ onUserSelect, selectedUserId }) {
  const [userCards, setUserCards] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserCards();
  }, []);

  const fetchUserCards = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/productivity/user-cards', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (data.success) {
        setUserCards(data.data || []);
      } else {
        console.error('Failed to fetch user cards:', data.error);
      }
    } catch (error) {
      console.error('Failed to fetch user cards:', error);
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
        <h3 className="text-lg font-semibold text-gray-600 mb-2">No Active Users</h3>
        <p className="text-gray-500">Activity data will appear when employees use the desktop app</p>
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
    if (score >= 70) return { bg: 'bg-green-500', text: 'text-green-600', ring: 'ring-green-200' };
    if (score >= 40) return { bg: 'bg-yellow-500', text: 'text-yellow-600', ring: 'ring-yellow-200' };
    return { bg: 'bg-red-500', text: 'text-red-600', ring: 'ring-red-200' };
  };

  const colors = getProductivityColor(card.todayStats?.avgProductivity || 0);
  const lastSessionTime = card.latestSession?.sessionEnd;
  const isOnline = lastSessionTime && (new Date() - new Date(lastSessionTime)) < 30 * 60 * 1000;

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
          <h4 className="font-semibold text-gray-800 truncate">{card.name}</h4>
          <p className="text-sm text-gray-500 truncate">{card.designation || card.department}</p>
        </div>
      </div>

      {/* Productivity score bar */}
      <div className="mb-3">
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs text-gray-500">Today's Productivity</span>
          <span className={`font-bold ${colors.text}`}>{card.todayStats?.avgProductivity || 0}%</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div 
            className={`h-full ${colors.bg} transition-all`}
            style={{ width: `${card.todayStats?.avgProductivity || 0}%` }}
          ></div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-1 text-gray-500">
          <FaClock className="text-gray-400" />
          <span>{Math.round((card.todayStats?.duration || 0) / 60)} min</span>
        </div>
        <div className="flex items-center gap-1 text-gray-500">
          <FaCamera className="text-gray-400" />
          <span>{card.todayStats?.sessionsCount || 0} sessions</span>
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
 */
export function SessionPopup({ user, isOpen, onClose }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [selectedSession, setSelectedSession] = useState(null);

  useEffect(() => {
    if (isOpen && user) {
      fetchSessions(true);
    }
  }, [isOpen, user]);

  const fetchSessions = async (reset = false) => {
    if (!user) return;
    
    try {
      if (reset) {
        setLoading(true);
        setSessions([]);
        setOffset(0);
      } else {
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
        if (reset) {
          setSessions(newSessions);
        } else {
          setSessions(prev => [...prev, ...newSessions]);
        }
        setOffset(newOffset + newSessions.length);
        setHasMore(newSessions.length === 4);
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
      toast.error('Failed to load sessions');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      fetchSessions(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 flex items-center gap-4">
          {user?.profilePicture ? (
            <img 
              src={user.profilePicture} 
              alt={user.name} 
              className="w-14 h-14 rounded-full border-3 border-white shadow-lg object-cover"
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center shadow-lg">
              <span className="text-2xl font-bold text-blue-600">
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
          )}
          <div className="flex-1">
            <h2 className="text-xl font-bold text-white">{user?.name}'s Sessions</h2>
            <p className="text-blue-100">{user?.designation} • {user?.department}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <FaTimes className="text-white text-xl" />
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
                  />
                ))}
              </div>

              {/* Load More Button */}
              {hasMore && (
                <div className="mt-6 text-center">
                  <button
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 mx-auto"
                  >
                    {loadingMore ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Loading...
                      </>
                    ) : (
                      <>
                        <FaSync />
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
}

/**
 * Session Card Component
 * Shows a summary of a single session with thumbnails
 */
function SessionCard({ session, onClick }) {
  const screenshotCount = session.screenshots?.length || 0;
  const firstScreenshot = session.screenshots?.[0];
  
  const getScoreColor = (score) => {
    if (score >= 70) return 'text-green-600 bg-green-100';
    if (score >= 40) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  return (
    <div 
      onClick={onClick}
      className="bg-gray-50 rounded-xl p-4 border border-gray-200 hover:border-blue-300 hover:shadow-md cursor-pointer transition-all"
    >
      {/* Time and Score Header */}
      <div className="flex justify-between items-start mb-3">
        <div>
          <div className="font-semibold text-gray-800">
            {formatLocalTime(session.sessionStart)} - {formatLocalTime(session.sessionEnd)}
          </div>
          <div className="text-sm text-gray-500">{formatLocalDateOnly(session.sessionStart)}</div>
        </div>
        <div className={`px-3 py-1 rounded-full font-bold text-sm ${getScoreColor(session.aiAnalysis?.productivityScore || 0)}`}>
          {session.aiAnalysis?.productivityScore || 0}%
        </div>
      </div>

      {/* Screenshot Thumbnails */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        {session.screenshots?.slice(0, 4).map((screenshot, idx) => (
          <div 
            key={idx} 
            className="relative aspect-video bg-gray-200 rounded-lg overflow-hidden"
          >
            <img 
              src={screenshot.thumbnail || screenshot.fullData || screenshot.thumbnailUrl || screenshot.url}
              alt={`Screenshot ${idx + 1}`}
              className="w-full h-full object-cover"
            />
          </div>
        ))}
        {screenshotCount > 4 && (
          <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded">
            +{screenshotCount - 4} more
          </div>
        )}
      </div>

      {/* Summary */}
      <p className="text-sm text-gray-600 line-clamp-2 mb-3">
        {session.aiAnalysis?.summary || 'Activity session captured'}
      </p>

      {/* Quick Stats */}
      <div className="flex items-center gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <FaClock className="text-gray-400" />
          <span>{session.sessionDuration || session.durationMinutes} min</span>
        </div>
        <div className="flex items-center gap-1">
          <FaCamera className="text-gray-400" />
          <span>{screenshotCount} screenshots</span>
        </div>
        {(session.appUsageSummary?.length > 0 || session.appUsage?.length > 0) && (
          <div className="flex items-center gap-1">
            <FaChartLine className="text-gray-400" />
            <span>{(session.appUsageSummary || session.appUsage || []).length} apps</span>
          </div>
        )}
      </div>

      {/* Warnings */}
      {session.aiAnalysis?.areasOfImprovement?.length > 0 && (
        <div className="mt-2 flex items-center gap-1 text-xs text-orange-600">
          <FaExclamationTriangle />
          <span>{session.aiAnalysis.areasOfImprovement.length} area(s) to improve</span>
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
  const playIntervalRef = useRef(null);

  const screenshots = session.screenshots || [];

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

  // Normalize screenshot URL
  const getScreenshotUrl = (screenshot) => {
    return screenshot?.fullData || screenshot?.thumbnail || screenshot?.url || screenshot?.thumbnailUrl || '';
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gray-800 px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white">
              Session: {formatLocalTime(session.sessionStart)} - {formatLocalTime(session.sessionEnd)}
            </h3>
            <p className="text-gray-400 text-sm">{formatLocalDateOnly(session.sessionStart)} • {session.sessionDuration || session.durationMinutes} minutes</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full">
            <FaTimes className="text-white text-xl" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Screenshot Carousel */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-semibold text-gray-800">Screenshots ({screenshots.length})</h4>
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
                  <img 
                    src={getScreenshotUrl(screenshots[currentScreenshot])}
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

              {/* Thumbnail strip */}
              {screenshots.length > 1 && (
                <div className="flex gap-2 mt-3 overflow-x-auto pb-2">
                  {screenshots.map((ss, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentScreenshot(idx)}
                      className={`flex-shrink-0 w-20 h-12 rounded-lg overflow-hidden border-2 transition-colors ${
                        idx === currentScreenshot ? 'border-blue-500' : 'border-transparent hover:border-gray-300'
                      }`}
                    >
                      <img 
                        src={getScreenshotUrl(ss)}
                        alt={`Thumbnail ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Session Details */}
            <div className="space-y-4">
              {/* Scores */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-gray-800">{session.aiAnalysis?.productivityScore || 0}%</div>
                  <div className="text-sm text-gray-500">Productivity</div>
                  <div className={`h-1 rounded-full mt-2 ${getScoreColor(session.aiAnalysis?.productivityScore || 0)}`}></div>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-gray-800">{session.aiAnalysis?.focusScore || 0}%</div>
                  <div className="text-sm text-gray-500">Focus</div>
                  <div className={`h-1 rounded-full mt-2 ${getScoreColor(session.aiAnalysis?.focusScore || 0)}`}></div>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-gray-800">{session.aiAnalysis?.efficiencyScore || 0}%</div>
                  <div className="text-sm text-gray-500">Efficiency</div>
                  <div className={`h-1 rounded-full mt-2 ${getScoreColor(session.aiAnalysis?.efficiencyScore || 0)}`}></div>
                </div>
              </div>

              {/* AI Summary */}
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-4 border border-blue-200">
                <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                  <FaChartLine className="text-blue-600" /> AI Analysis
                </h4>
                <p className="text-sm text-gray-700">{session.aiAnalysis?.summary || 'Session activity captured'}</p>
              </div>

              {/* App Usage - use appUsageSummary or appUsage */}
              {(session.appUsageSummary?.length > 0 || session.appUsage?.length > 0) && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <h4 className="font-semibold text-gray-800 mb-3">Application Usage</h4>
                  <div className="space-y-2">
                    {(session.appUsageSummary || session.appUsage || []).slice(0, 6).map((app, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${
                          app.category === 'productive' ? 'bg-green-500' :
                          (app.category === 'distracting' || app.category === 'unproductive') ? 'bg-red-500' : 'bg-gray-400'
                        }`}></span>
                        <span className="flex-1 text-sm truncate">{app.appName}</span>
                        <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${
                              app.category === 'productive' ? 'bg-green-500' :
                              (app.category === 'distracting' || app.category === 'unproductive') ? 'bg-red-500' : 'bg-gray-400'
                            }`}
                            style={{ width: `${app.percentage}%` }}
                          ></div>
                        </div>
                        <span className="text-xs text-gray-500 w-10 text-right">{app.percentage}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Website Visits - use websiteVisitSummary or websiteVisits */}
              {(session.websiteVisitSummary?.length > 0 || session.websiteVisits?.length > 0) && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <h4 className="font-semibold text-gray-800 mb-3">Website Visits</h4>
                  <div className="space-y-2">
                    {(session.websiteVisitSummary || session.websiteVisits || []).slice(0, 5).map((site, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${
                          site.category === 'productive' ? 'bg-green-500' :
                          (site.category === 'distracting' || site.category === 'unproductive') ? 'bg-red-500' : 'bg-gray-400'
                        }`}></span>
                        <span className="flex-1 text-sm truncate">{site.domain}</span>
                        <span className="text-xs text-gray-500">{site.visitCount} visits</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Keystroke Stats - use keystrokeSummary or keystrokes */}
              {(session.keystrokeSummary?.totalCount > 0 || session.keystrokes?.total > 0) && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <h4 className="font-semibold text-gray-800 mb-2">Activity Metrics</h4>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-lg font-bold text-gray-800">
                        {session.keystrokeSummary?.totalCount || session.keystrokes?.total || 0}
                      </div>
                      <div className="text-xs text-gray-500">Keystrokes</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-gray-800">
                        {session.keystrokeSummary?.averagePerMinute || session.keystrokes?.perMinute || 0}
                      </div>
                      <div className="text-xs text-gray-500">Per Minute</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-gray-800">
                        {session.mouseActivitySummary?.totalClicks || session.mouseClicks || 0}
                      </div>
                      <div className="text-xs text-gray-500">Mouse Clicks</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Areas of Improvement */}
              {session.aiAnalysis?.areasOfImprovement?.length > 0 && (
                <div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
                  <h4 className="font-semibold text-orange-800 mb-2 flex items-center gap-2">
                    <FaExclamationTriangle /> Areas to Improve
                  </h4>
                  <ul className="space-y-1">
                    {session.aiAnalysis.areasOfImprovement.map((area, idx) => (
                      <li key={idx} className="text-sm text-orange-700">• {area}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
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
            src={getScreenshotUrl(screenshots[currentScreenshot])}
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

'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  FaInbox, FaPaperPlane, FaFile, FaTrash, FaStar, FaSearch,
  FaPen, FaTimes, FaSync, FaEnvelope, FaEnvelopeOpen, FaReply,
  FaReplyAll, FaForward, FaPaperclip, FaExclamationTriangle,
  FaPlug, FaCheck, FaArchive, FaChevronLeft, FaSpinner, FaGoogle
} from 'react-icons/fa';

const folders = [
  { id: 'inbox', name: 'Inbox', icon: FaInbox },
  { id: 'sent', name: 'Sent', icon: FaPaperPlane },
  { id: 'drafts', name: 'Drafts', icon: FaFile },
  { id: 'starred', name: 'Starred', icon: FaStar },
  { id: 'trash', name: 'Trash', icon: FaTrash },
];

export default function MailPage() {
  const [isConnected, setIsConnected] = useState(false);
  const [connectedEmail, setConnectedEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [connectingEmail, setConnectingEmail] = useState(false);
  const [emails, setEmails] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState('inbox');
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCompose, setShowCompose] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [pageToken, setPageToken] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingEmails, setLoadingEmails] = useState(false);

  // Compose email state
  const [composeData, setComposeData] = useState({
    to: '',
    cc: '',
    bcc: '',
    subject: '',
    body: ''
  });
  const [sending, setSending] = useState(false);

  const getToken = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token');
    }
    return null;
  };

  // Check email connection status
  const checkConnectionStatus = useCallback(async () => {
    try {
      const token = getToken();
      const res = await fetch('/api/mail', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      
      setIsConnected(data.isConnected || false);
      setConnectedEmail(data.email || '');
      setUnreadCount(data.unreadCount || 0);
    } catch (error) {
      console.error('Error checking email status:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch emails
  const fetchEmails = useCallback(async (folder = 'inbox', reset = false) => {
    if (loadingEmails || (!reset && !hasMore)) return;
    
    try {
      setLoadingEmails(true);
      const token = getToken();
      const params = new URLSearchParams({
        folder,
        maxResults: '20',
        ...(pageToken && !reset ? { pageToken } : {})
      });

      const res = await fetch(`/api/mail/messages?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!res.ok) {
        if (res.status === 401) {
          setIsConnected(false);
          return;
        }
        throw new Error('Failed to fetch emails');
      }

      const data = await res.json();
      
      if (reset) {
        setEmails(data.emails || []);
      } else {
        setEmails(prev => [...prev, ...(data.emails || [])]);
      }
      
      setPageToken(data.nextPageToken || null);
      setHasMore(!!data.nextPageToken);
      setUnreadCount(data.unreadCount || 0);
    } catch (error) {
      console.error('Error fetching emails:', error);
    } finally {
      setLoadingEmails(false);
      setSyncing(false);
    }
  }, [loadingEmails, hasMore, pageToken]);

  // Connect email (initiate OAuth)
  const connectEmail = async () => {
    try {
      setConnectingEmail(true);
      const token = getToken();
      const res = await fetch('/api/mail', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();

      if (data.authUrl) {
        // Redirect to Google OAuth
        window.location.href = data.authUrl;
      }
    } catch (error) {
      console.error('Error connecting email:', error);
      alert('Failed to initiate email connection');
    } finally {
      setConnectingEmail(false);
    }
  };

  // Disconnect email
  const disconnectEmail = async () => {
    if (!confirm('Are you sure you want to disconnect your email?')) return;

    try {
      const token = getToken();
      await fetch('/api/mail', {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      setIsConnected(false);
      setConnectedEmail('');
      setEmails([]);
      setSelectedEmail(null);
    } catch (error) {
      console.error('Error disconnecting email:', error);
    }
  };

  // Send email
  const sendEmail = async () => {
    if (!composeData.to || !composeData.subject) {
      alert('Please fill in To and Subject fields');
      return;
    }

    try {
      setSending(true);
      const token = getToken();
      const res = await fetch('/api/mail/messages', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          to: composeData.to,
          cc: composeData.cc || undefined,
          bcc: composeData.bcc || undefined,
          subject: composeData.subject,
          body: composeData.body,
          isHtml: false
        })
      });

      if (!res.ok) throw new Error('Failed to send email');

      setShowCompose(false);
      setComposeData({ to: '', cc: '', bcc: '', subject: '', body: '' });
      alert('Email sent successfully!');
      
      // Refresh sent folder if currently viewing it
      if (selectedFolder === 'sent') {
        setPageToken(null);
        setHasMore(true);
        fetchEmails('sent', true);
      }
    } catch (error) {
      console.error('Error sending email:', error);
      alert('Failed to send email');
    } finally {
      setSending(false);
    }
  };

  // Mark email as read/unread
  const toggleRead = async (email, e) => {
    e?.stopPropagation();
    try {
      const token = getToken();
      await fetch('/api/mail/messages', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messageId: email.messageId,
          action: email.isRead ? 'markUnread' : 'markRead'
        })
      });

      setEmails(prev => prev.map(e => 
        e.messageId === email.messageId ? { ...e, isRead: !e.isRead } : e
      ));
      
      if (!email.isRead) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      } else {
        setUnreadCount(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error toggling read status:', error);
    }
  };

  // Toggle star
  const toggleStar = async (email, e) => {
    e?.stopPropagation();
    try {
      const token = getToken();
      await fetch('/api/mail/messages', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messageId: email.messageId,
          action: email.isStarred ? 'unstar' : 'star'
        })
      });

      setEmails(prev => prev.map(e => 
        e.messageId === email.messageId ? { ...e, isStarred: !e.isStarred } : e
      ));
    } catch (error) {
      console.error('Error toggling star:', error);
    }
  };

  // Archive email
  const archiveEmail = async (email, e) => {
    e?.stopPropagation();
    try {
      const token = getToken();
      await fetch('/api/mail/messages', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messageId: email.messageId,
          action: 'archive'
        })
      });

      setEmails(prev => prev.filter(e => e.messageId !== email.messageId));
      if (selectedEmail?.messageId === email.messageId) {
        setSelectedEmail(null);
      }
    } catch (error) {
      console.error('Error archiving email:', error);
    }
  };

  // Delete email (move to trash)
  const deleteEmail = async (email, e) => {
    e?.stopPropagation();
    try {
      const token = getToken();
      await fetch('/api/mail/messages', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messageId: email.messageId,
          action: selectedFolder === 'trash' ? 'untrash' : 'trash'
        })
      });

      setEmails(prev => prev.filter(e => e.messageId !== email.messageId));
      if (selectedEmail?.messageId === email.messageId) {
        setSelectedEmail(null);
      }
    } catch (error) {
      console.error('Error deleting email:', error);
    }
  };

  // Sync emails
  const syncEmails = () => {
    setSyncing(true);
    setPageToken(null);
    setHasMore(true);
    fetchEmails(selectedFolder, true);
  };

  // Handle folder change
  const handleFolderChange = (folderId) => {
    setSelectedFolder(folderId);
    setSelectedEmail(null);
    setPageToken(null);
    setHasMore(true);
    setEmails([]);
    fetchEmails(folderId, true);
  };

  // Format date
  const formatDate = (date) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now - d;
    
    // Today
    if (diff < 86400000 && d.getDate() === now.getDate()) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    // This year
    if (d.getFullYear() === now.getFullYear()) {
      return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Check for connection status on mount and URL params
  useEffect(() => {
    checkConnectionStatus();
    
    // Check for OAuth callback params
    const params = new URLSearchParams(window.location.search);
    const connected = params.get('connected');
    const error = params.get('error');
    
    if (connected === 'true') {
      setIsConnected(true);
      // Clean URL
      window.history.replaceState({}, '', '/dashboard/mail');
    }
    
    if (error) {
      alert(`Failed to connect email: ${error}`);
      window.history.replaceState({}, '', '/dashboard/mail');
    }
  }, [checkConnectionStatus]);

  // Fetch emails when connected and folder changes
  useEffect(() => {
    if (isConnected && !loading) {
      fetchEmails(selectedFolder, true);
    }
  }, [isConnected, loading, selectedFolder]);

  // Filter emails by search
  const filteredEmails = emails.filter(email => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      email.subject?.toLowerCase().includes(query) ||
      email.from?.name?.toLowerCase().includes(query) ||
      email.from?.email?.toLowerCase().includes(query) ||
      email.snippet?.toLowerCase().includes(query)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-120px)]">
        <FaSpinner className="animate-spin text-4xl text-gray-400" />
      </div>
    );
  }

  // Not connected - show connect screen
  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-120px)]">
        <div className="bg-white dark:bg-dark-card rounded-2xl p-8 shadow-lg max-w-md w-full text-center">
          <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <FaEnvelope className="text-4xl text-blue-600 dark:text-blue-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Connect Your Email
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            Connect your Gmail account to view and manage your emails directly from Talio HRMS.
          </p>
          <button
            onClick={connectEmail}
            disabled={connectingEmail}
            className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 dark:bg-dark-card px-6 py-3 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            {connectingEmail ? (
              <FaSpinner className="animate-spin" />
            ) : (
              <>
                <FaGoogle className="text-xl" />
                Connect with Google
              </>
            )}
          </button>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-4">
            We only request access to read and send emails on your behalf. 
            You can disconnect at any time.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="h-[calc(100vh-100px)] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Mail</h1>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {connectedEmail}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={syncEmails}
              disabled={syncing}
              className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Sync emails"
            >
              <FaSync className={`${syncing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={disconnectEmail}
              className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              title="Disconnect email"
            >
              <FaPlug />
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex gap-4 overflow-hidden">
          {/* Sidebar */}
          <div className="w-56 flex-shrink-0 flex flex-col">
            {/* Compose Button */}
            <button
              onClick={() => setShowCompose(true)}
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-3 rounded-xl font-medium mb-4 hover:shadow-lg transition-all"
            >
              <FaPen />
              Compose
            </button>

            {/* Folders */}
            <div className="bg-white dark:bg-dark-card rounded-xl p-2 flex-1">
              {folders.map(folder => (
                <button
                  key={folder.id}
                  onClick={() => handleFolderChange(folder.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                    selectedFolder === folder.id
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <folder.icon className="text-lg" />
                  <span className="flex-1 text-left">{folder.name}</span>
                  {folder.id === 'inbox' && unreadCount > 0 && (
                    <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Email List */}
          <div className={`${selectedEmail ? 'hidden md:flex' : 'flex'} flex-col w-80 flex-shrink-0`}>
            {/* Search */}
            <div className="relative mb-3">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search emails..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-dark-card border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white"
              />
            </div>

            {/* Email List */}
            <div className="flex-1 bg-white dark:bg-dark-card rounded-xl overflow-y-auto">
              {loadingEmails && emails.length === 0 ? (
                <div className="flex items-center justify-center h-40">
                  <FaSpinner className="animate-spin text-2xl text-gray-400" />
                </div>
              ) : filteredEmails.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-gray-500">
                  <FaInbox className="text-4xl mb-2" />
                  <p>No emails found</p>
                </div>
              ) : (
                <>
                  {filteredEmails.map(email => (
                    <div
                      key={email.messageId}
                      onClick={() => {
                        setSelectedEmail(email);
                        if (!email.isRead) toggleRead(email);
                      }}
                      className={`p-3 border-b border-gray-100 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                        selectedEmail?.messageId === email.messageId
                          ? 'bg-blue-50 dark:bg-blue-900/20'
                          : !email.isRead
                          ? 'bg-blue-50/50 dark:bg-blue-900/10'
                          : ''
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <button
                          onClick={(e) => toggleStar(email, e)}
                          className={`mt-1 ${
                            email.isStarred
                              ? 'text-yellow-500'
                              : 'text-gray-300 hover:text-yellow-500'
                          }`}
                        >
                          <FaStar />
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className={`text-sm truncate ${
                              !email.isRead ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'
                            }`}>
                              {email.from?.name || email.from?.email}
                            </span>
                            <span className="text-xs text-gray-500 flex-shrink-0">
                              {formatDate(email.date)}
                            </span>
                          </div>
                          <p className={`text-sm truncate ${
                            !email.isRead ? 'font-medium text-gray-800 dark:text-gray-200' : 'text-gray-600 dark:text-gray-400'
                          }`}>
                            {email.subject}
                          </p>
                          <p className="text-xs text-gray-500 truncate mt-0.5">
                            {email.snippet}
                          </p>
                        </div>
                      </div>
                      {email.attachments?.length > 0 && (
                        <div className="flex items-center gap-1 mt-1 ml-6 text-xs text-gray-500">
                          <FaPaperclip />
                          {email.attachments.length} attachment{email.attachments.length > 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                  ))}
                  {hasMore && (
                    <button
                      onClick={() => fetchEmails(selectedFolder, false)}
                      disabled={loadingEmails}
                      className="w-full py-3 text-blue-600 dark:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      {loadingEmails ? (
                        <FaSpinner className="animate-spin mx-auto" />
                      ) : (
                        'Load more'
                      )}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Email Detail */}
          <div className={`${selectedEmail ? 'flex' : 'hidden md:flex'} flex-1 flex-col bg-white dark:bg-dark-card rounded-xl overflow-hidden`}>
            {selectedEmail ? (
              <>
                {/* Email Header */}
                <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                  <button
                    onClick={() => setSelectedEmail(null)}
                    className="md:hidden flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-3"
                  >
                    <FaChevronLeft />
                    Back
                  </button>
                  <div className="flex items-start justify-between gap-4">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                      {selectedEmail.subject}
                    </h2>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={(e) => toggleStar(selectedEmail, e)}
                        className={`p-2 rounded-lg transition-colors ${
                          selectedEmail.isStarred
                            ? 'text-yellow-500'
                            : 'text-gray-400 hover:text-yellow-500'
                        }`}
                      >
                        <FaStar />
                      </button>
                      <button
                        onClick={(e) => archiveEmail(selectedEmail, e)}
                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg transition-colors"
                        title="Archive"
                      >
                        <FaArchive />
                      </button>
                      <button
                        onClick={(e) => deleteEmail(selectedEmail, e)}
                        className="p-2 text-gray-400 hover:text-red-500 rounded-lg transition-colors"
                        title={selectedFolder === 'trash' ? 'Restore' : 'Delete'}
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-medium">
                      {(selectedEmail.from?.name || selectedEmail.from?.email || '?')[0].toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {selectedEmail.from?.name || selectedEmail.from?.email}
                        </span>
                        {selectedEmail.from?.name && (
                          <span className="text-sm text-gray-500">
                            &lt;{selectedEmail.from?.email}&gt;
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">
                        to {selectedEmail.to?.map(t => t.name || t.email).join(', ')}
                      </p>
                    </div>
                    <span className="text-sm text-gray-500">
                      {new Date(selectedEmail.date).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Email Body */}
                <div className="flex-1 overflow-y-auto p-4">
                  {selectedEmail.bodyHtml ? (
                    <div 
                      className="prose dark:prose-invert max-w-none"
                      dangerouslySetInnerHTML={{ __html: selectedEmail.bodyHtml }}
                    />
                  ) : (
                    <pre className="whitespace-pre-wrap font-sans text-gray-700 dark:text-gray-300">
                      {selectedEmail.body || selectedEmail.snippet}
                    </pre>
                  )}

                  {/* Attachments */}
                  {selectedEmail.attachments?.length > 0 && (
                    <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Attachments ({selectedEmail.attachments.length})
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedEmail.attachments.map((att, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm"
                          >
                            <FaPaperclip className="text-gray-400" />
                            <span className="text-gray-700 dark:text-gray-300">{att.filename}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Quick Reply */}
                <div className="p-4 border-t border-gray-100 dark:border-gray-700">
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setComposeData({
                          to: selectedEmail.from?.email || '',
                          cc: '',
                          bcc: '',
                          subject: `Re: ${selectedEmail.subject}`,
                          body: `\n\n-------- Original Message --------\nFrom: ${selectedEmail.from?.name || selectedEmail.from?.email}\nDate: ${new Date(selectedEmail.date).toLocaleString()}\n\n${selectedEmail.body || selectedEmail.snippet}`
                        });
                        setShowCompose(true);
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                      <FaReply />
                      Reply
                    </button>
                    <button
                      onClick={() => {
                        setComposeData({
                          to: '',
                          cc: '',
                          bcc: '',
                          subject: `Fwd: ${selectedEmail.subject}`,
                          body: `\n\n-------- Forwarded Message --------\nFrom: ${selectedEmail.from?.name || selectedEmail.from?.email}\nDate: ${new Date(selectedEmail.date).toLocaleString()}\nSubject: ${selectedEmail.subject}\n\n${selectedEmail.body || selectedEmail.snippet}`
                        });
                        setShowCompose(true);
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                      <FaForward />
                      Forward
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
                <FaEnvelope className="text-6xl mb-4 opacity-20" />
                <p>Select an email to read</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Compose Modal */}
      {showCompose && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-dark-card rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
            {/* Compose Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                New Message
              </h3>
              <button
                onClick={() => setShowCompose(false)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg transition-colors"
              >
                <FaTimes />
              </button>
            </div>

            {/* Compose Form */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <div className="flex items-center gap-2 border-b border-gray-100 dark:border-gray-700 pb-2">
                <label className="w-12 text-sm text-gray-500">To:</label>
                <input
                  type="text"
                  value={composeData.to}
                  onChange={(e) => setComposeData(prev => ({ ...prev, to: e.target.value }))}
                  placeholder="recipient@example.com"
                  className="flex-1 bg-transparent focus:outline-none dark:text-white"
                />
              </div>
              <div className="flex items-center gap-2 border-b border-gray-100 dark:border-gray-700 pb-2">
                <label className="w-12 text-sm text-gray-500">Cc:</label>
                <input
                  type="text"
                  value={composeData.cc}
                  onChange={(e) => setComposeData(prev => ({ ...prev, cc: e.target.value }))}
                  placeholder="cc@example.com"
                  className="flex-1 bg-transparent focus:outline-none dark:text-white"
                />
              </div>
              <div className="flex items-center gap-2 border-b border-gray-100 dark:border-gray-700 pb-2">
                <label className="w-12 text-sm text-gray-500">Bcc:</label>
                <input
                  type="text"
                  value={composeData.bcc}
                  onChange={(e) => setComposeData(prev => ({ ...prev, bcc: e.target.value }))}
                  placeholder="bcc@example.com"
                  className="flex-1 bg-transparent focus:outline-none dark:text-white"
                />
              </div>
              <div className="flex items-center gap-2 border-b border-gray-100 dark:border-gray-700 pb-2">
                <label className="w-12 text-sm text-gray-500">Subject:</label>
                <input
                  type="text"
                  value={composeData.subject}
                  onChange={(e) => setComposeData(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder="Subject"
                  className="flex-1 bg-transparent focus:outline-none dark:text-white"
                />
              </div>
              <textarea
                value={composeData.body}
                onChange={(e) => setComposeData(prev => ({ ...prev, body: e.target.value }))}
                placeholder="Write your message here..."
                rows={12}
                className="w-full bg-transparent focus:outline-none resize-none dark:text-white"
              />
            </div>

            {/* Compose Footer */}
            <div className="flex items-center justify-between p-4 border-t border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg transition-colors">
                  <FaPaperclip />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowCompose(false)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Discard
                </button>
                <button
                  onClick={sendEmail}
                  disabled={sending}
                  className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50"
                >
                  {sending ? (
                    <FaSpinner className="animate-spin" />
                  ) : (
                    <>
                      <FaPaperPlane />
                      Send
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
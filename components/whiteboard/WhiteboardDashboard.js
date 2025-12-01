'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FiPlus, FiSearch, FiGrid, FiList, FiMoreHorizontal, FiTrash2, FiEdit2, FiShare2, FiClock, FiUser, FiUsers, FiX, FiLink, FiCopy, FiCheck } from 'react-icons/fi';

export default function WhiteboardDashboard() {
  const router = useRouter();
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [showNewBoardModal, setShowNewBoardModal] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');
  const [creating, setCreating] = useState(false);
  const [activeMenu, setActiveMenu] = useState(null);
  const [error, setError] = useState(null);
  
  // Rename modal state
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameBoard, setRenameBoard] = useState(null);
  const [newTitle, setNewTitle] = useState('');
  const [renaming, setRenaming] = useState(false);
  
  // Share modal state
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareBoard, setShareBoard] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchBoards();
  }, []);

  const fetchBoards = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/whiteboard', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch boards');
      }
      
      const data = await response.json();
      setBoards(data.boards || []);
    } catch (err) {
      console.error('Error fetching boards:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const createBoard = async () => {
    if (!newBoardName.trim()) return;
    
    try {
      setCreating(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/whiteboard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ title: newBoardName.trim() })
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create board');
      }
      
      const data = await response.json();
      setShowNewBoardModal(false);
      setNewBoardName('');
      router.push(`/dashboard/talioboard/${data.whiteboard._id}`);
    } catch (err) {
      console.error('Error creating board:', err);
      alert('Failed to create board: ' + err.message);
    } finally {
      setCreating(false);
    }
  };

  const deleteBoard = async (boardId) => {
    if (!confirm('Are you sure you want to delete this board?')) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/whiteboard/${boardId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Failed to delete board');
      
      setBoards(boards.filter(b => b._id !== boardId));
      setActiveMenu(null);
    } catch (err) {
      console.error('Error deleting board:', err);
      alert('Failed to delete board');
    }
  };

  const handleRename = async () => {
    if (!newTitle.trim() || !renameBoard) return;
    
    try {
      setRenaming(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/whiteboard/${renameBoard._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ title: newTitle.trim() })
      });
      
      if (!response.ok) throw new Error('Failed to rename board');
      
      setBoards(boards.map(b => 
        b._id === renameBoard._id ? { ...b, title: newTitle.trim(), name: newTitle.trim() } : b
      ));
      setShowRenameModal(false);
      setRenameBoard(null);
      setNewTitle('');
    } catch (err) {
      console.error('Error renaming board:', err);
      alert('Failed to rename board');
    } finally {
      setRenaming(false);
    }
  };

  const openRenameModal = (board) => {
    setRenameBoard(board);
    setNewTitle(board.title || board.name || '');
    setShowRenameModal(true);
    setActiveMenu(null);
  };

  const openShareModal = (board) => {
    setShareBoard(board);
    setShowShareModal(true);
    setActiveMenu(null);
    setCopied(false);
  };

  const copyShareLink = () => {
    if (!shareBoard) return;
    const link = `${window.location.origin}/dashboard/talioboard/${shareBoard._id}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDate = (date) => {
    if (!date) return 'Recently';
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'Recently';
    
    const now = new Date();
    const diff = now - d;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
    
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const filteredBoards = boards.filter(board =>
    (board.title || board.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const ownedBoards = filteredBoards.filter(b => b.isOwner);
  const sharedBoards = filteredBoards.filter(b => !b.isOwner);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">TalioBoard</h1>
              <p className="text-sm text-gray-500 mt-0.5">Collaborative whiteboards for your team</p>
            </div>
            
            <button
              onClick={() => setShowNewBoardModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 text-white rounded-lg font-medium hover:bg-violet-700 transition-colors shadow-sm"
            >
              <FiPlus size={18} />
              <span>New board</span>
            </button>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search boards..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
          </div>
          
          <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <FiGrid size={18} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-colors ${viewMode === 'list' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <FiList size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 pb-12">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-gray-500">Loading boards...</p>
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">⚠️</span>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">Error loading boards</h3>
            <p className="text-gray-500 mb-4">{error}</p>
            <button
              onClick={fetchBoards}
              className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
            >
              Try again
            </button>
          </div>
        ) : filteredBoards.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-violet-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">🎨</span>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">
              {searchQuery ? 'No boards found' : 'No boards yet'}
            </h3>
            <p className="text-gray-500 mb-6">
              {searchQuery ? 'Try a different search term' : 'Create your first board to get started'}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setShowNewBoardModal(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-violet-600 text-white rounded-lg font-medium hover:bg-violet-700 transition-colors"
              >
                <FiPlus size={18} />
                Create board
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            {/* Owned Boards */}
            {ownedBoards.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <FiUser size={16} className="text-gray-400" />
                  <h2 className="text-sm font-medium text-gray-600 uppercase tracking-wide">My Boards</h2>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{ownedBoards.length}</span>
                </div>
                <BoardGrid boards={ownedBoards} viewMode={viewMode} activeMenu={activeMenu} setActiveMenu={setActiveMenu} deleteBoard={deleteBoard} formatDate={formatDate} router={router} openRenameModal={openRenameModal} openShareModal={openShareModal} />
              </section>
            )}

            {/* Shared Boards */}
            {sharedBoards.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <FiUsers size={16} className="text-gray-400" />
                  <h2 className="text-sm font-medium text-gray-600 uppercase tracking-wide">Shared with me</h2>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{sharedBoards.length}</span>
                </div>
                <BoardGrid boards={sharedBoards} viewMode={viewMode} activeMenu={activeMenu} setActiveMenu={setActiveMenu} deleteBoard={deleteBoard} formatDate={formatDate} router={router} openRenameModal={openRenameModal} openShareModal={openShareModal} />
              </section>
            )}
          </div>
        )}
      </div>

      {/* New Board Modal */}
      {showNewBoardModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div 
            className="bg-white rounded-2xl w-full max-w-md shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-1">Create new board</h2>
              <p className="text-sm text-gray-500 mb-6">Give your board a name to get started</p>
              
              <input
                type="text"
                placeholder="Board name"
                value={newBoardName}
                onChange={(e) => setNewBoardName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && createBoard()}
                autoFocus
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-lg"
              />
            </div>
            
            <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 rounded-b-2xl">
              <button
                onClick={() => {
                  setShowNewBoardModal(false);
                  setNewBoardName('');
                }}
                className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createBoard}
                disabled={!newBoardName.trim() || creating}
                className="px-5 py-2 bg-violet-600 text-white rounded-lg font-medium hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? 'Creating...' : 'Create board'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename Modal */}
      {showRenameModal && renameBoard && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowRenameModal(false)}>
          <div 
            className="bg-white rounded-2xl w-full max-w-md shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Rename board</h2>
                <button onClick={() => setShowRenameModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <FiX size={18} />
                </button>
              </div>
              
              <input
                type="text"
                placeholder="Board name"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                autoFocus
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-lg"
              />
            </div>
            
            <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 rounded-b-2xl">
              <button
                onClick={() => setShowRenameModal(false)}
                className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRename}
                disabled={!newTitle.trim() || renaming}
                className="px-5 py-2 bg-violet-600 text-white rounded-lg font-medium hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {renaming ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && shareBoard && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowShareModal(false)}>
          <div 
            className="bg-white rounded-2xl w-full max-w-md shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Share board</h2>
                <button onClick={() => setShowShareModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <FiX size={18} />
                </button>
              </div>
              
              <p className="text-gray-600 mb-4">Share "{shareBoard.title || shareBoard.name}" with others</p>
              
              <div className="flex gap-2">
                <div className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-600 text-sm truncate">
                  {typeof window !== 'undefined' ? `${window.location.origin}/dashboard/talioboard/${shareBoard._id}` : ''}
                </div>
                <button
                  onClick={copyShareLink}
                  className={`px-4 py-3 rounded-xl font-medium transition-colors flex items-center gap-2 ${
                    copied 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-violet-600 text-white hover:bg-violet-700'
                  }`}
                >
                  {copied ? <FiCheck size={18} /> : <FiCopy size={18} />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BoardGrid({ boards, viewMode, activeMenu, setActiveMenu, deleteBoard, formatDate, router, openRenameModal, openShareModal }) {
  const getBoardName = (board) => board.title || board.name || 'Untitled';
  const getOwnerName = (board) => board.owner?.name || board.owner?.email || 'Unknown';
  const getBoardDate = (board) => board.lastModified || board.updatedAt || board.createdAt;
  
  if (viewMode === 'list') {
    return (
      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
        {boards.map((board) => (
          <div
            key={board._id}
            className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors cursor-pointer group"
            onClick={() => router.push(`/dashboard/talioboard/${board._id}`)}
          >
            {board.thumbnail ? (
              <div className="w-16 h-12 rounded-lg overflow-hidden shadow-sm flex-shrink-0">
                <img src={board.thumbnail} alt={getBoardName(board)} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-12 h-12 bg-gradient-to-br from-violet-400 to-purple-500 rounded-lg flex items-center justify-center text-white font-semibold text-lg shadow-sm flex-shrink-0">
                {getBoardName(board).charAt(0).toUpperCase()}
              </div>
            )}
            
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-gray-900 truncate">{getBoardName(board)}</h3>
              <div className="flex items-center gap-3 text-sm text-gray-500 mt-0.5">
                <span className="flex items-center gap-1">
                  <FiClock size={14} />
                  {formatDate(getBoardDate(board))}
                </span>
                {!board.isOwner && board.owner && (
                  <span className="flex items-center gap-1">
                    <FiUser size={14} />
                    {getOwnerName(board)}
                  </span>
                )}
                {board.sharedWith?.length > 0 && (
                  <span className="flex items-center gap-1">
                    <FiUsers size={14} />
                    {board.sharedWith.length} collaborator{board.sharedWith.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
            
            {board.isOwner && (
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveMenu(activeMenu === board._id ? null : board._id);
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                >
                  <FiMoreHorizontal size={18} />
                </button>
                
                {activeMenu === board._id && (
                  <BoardMenu board={board} deleteBoard={deleteBoard} setActiveMenu={setActiveMenu} openRenameModal={openRenameModal} openShareModal={openShareModal} />
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {boards.map((board) => (
        <div
          key={board._id}
          className="group bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg hover:border-violet-300 transition-all cursor-pointer"
          onClick={() => router.push(`/dashboard/talioboard/${board._id}`)}
        >
          {/* Preview */}
          <div className="aspect-[4/3] bg-gradient-to-br from-gray-50 to-gray-100 relative overflow-hidden">
            {board.thumbnail ? (
              <img 
                src={board.thumbnail} 
                alt={getBoardName(board)} 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 bg-gradient-to-br from-violet-400 to-purple-500 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                  {getBoardName(board).charAt(0).toUpperCase()}
                </div>
              </div>
            )}
            
            {board.isOwner && (
              <div className="absolute top-2 right-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveMenu(activeMenu === board._id ? null : board._id);
                  }}
                  className="p-2 bg-white/80 backdrop-blur-sm text-gray-600 hover:text-gray-900 hover:bg-white rounded-lg shadow-sm opacity-0 group-hover:opacity-100 transition-all"
                >
                  <FiMoreHorizontal size={16} />
                </button>
                
                {activeMenu === board._id && (
                  <BoardMenu board={board} deleteBoard={deleteBoard} setActiveMenu={setActiveMenu} openRenameModal={openRenameModal} openShareModal={openShareModal} />
                )}
              </div>
            )}
            
            {!board.isOwner && (
              <div className="absolute top-2 left-2">
                <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-md">
                  Shared
                </span>
              </div>
            )}
          </div>
          
          {/* Info */}
          <div className="p-4">
            <h3 className="font-medium text-gray-900 truncate mb-1">{getBoardName(board)}</h3>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <FiClock size={12} />
                {formatDate(getBoardDate(board))}
              </span>
              {!board.isOwner && board.owner && (
                <span className="flex items-center gap-1">
                  <FiUser size={12} />
                  {getOwnerName(board)}
                </span>
              )}
              {board.sharedWith?.length > 0 && (
                <span className="flex items-center gap-1">
                  <FiUsers size={12} />
                  {board.sharedWith.length}
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function BoardMenu({ board, deleteBoard, setActiveMenu, openRenameModal, openShareModal }) {
  return (
    <>
      <div 
        className="fixed inset-0 z-10" 
        onClick={(e) => {
          e.stopPropagation();
          setActiveMenu(null);
        }}
      />
      <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
        <button
          onClick={(e) => {
            e.stopPropagation();
            openRenameModal(board);
          }}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-gray-50 text-sm"
        >
          <FiEdit2 size={15} />
          Rename
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            openShareModal(board);
          }}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-gray-50 text-sm"
        >
          <FiShare2 size={15} />
          Share
        </button>
        <hr className="my-1 border-gray-100" />
        <button
          onClick={(e) => {
            e.stopPropagation();
            deleteBoard(board._id);
          }}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-red-600 hover:bg-red-50 text-sm"
        >
          <FiTrash2 size={15} />
          Delete
        </button>
      </div>
    </>
  );
}

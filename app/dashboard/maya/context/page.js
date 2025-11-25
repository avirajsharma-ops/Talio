'use client';

import { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash, FaSave, FaTimes, FaRobot } from 'react-icons/fa';

export default function MayaCustomContextPage() {
  const [contexts, setContexts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingContext, setEditingContext] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    contextType: 'system_prompt',
    category: 'general',
    title: '',
    description: '',
    content: '',
    priority: 50,
    isActive: true,
    appliesTo: {
      roles: [],
    },
  });

  useEffect(() => {
    fetchContexts();
  }, []);

  const fetchContexts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/maya/custom-context');
      const data = await response.json();
      if (data.success) {
        setContexts(data.contexts);
      }
    } catch (error) {
      console.error('Error fetching contexts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editingContext 
        ? '/api/maya/custom-context' 
        : '/api/maya/custom-context';
      
      const method = editingContext ? 'PUT' : 'POST';
      const body = editingContext 
        ? { ...formData, contextId: editingContext._id }
        : formData;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      if (data.success) {
        alert(editingContext ? 'Context updated successfully!' : 'Context created successfully!');
        setShowForm(false);
        setEditingContext(null);
        resetForm();
        fetchContexts();
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      console.error('Error saving context:', error);
      alert('Failed to save context');
    }
  };

  const handleDelete = async (contextId) => {
    if (!confirm('Are you sure you want to delete this context?')) return;

    try {
      const response = await fetch(`/api/maya/custom-context?contextId=${contextId}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (data.success) {
        alert('Context deleted successfully!');
        fetchContexts();
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      console.error('Error deleting context:', error);
      alert('Failed to delete context');
    }
  };

  const handleEdit = (context) => {
    setEditingContext(context);
    setFormData({
      contextType: context.contextType,
      category: context.category,
      title: context.title,
      description: context.description || '',
      content: context.content,
      priority: context.priority,
      isActive: context.isActive,
      appliesTo: context.appliesTo || { roles: [] },
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      contextType: 'system_prompt',
      category: 'general',
      title: '',
      description: '',
      content: '',
      priority: 50,
      isActive: true,
      appliesTo: { roles: [] },
    });
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingContext(null);
    resetForm();
  };

  const handleRoleToggle = (role) => {
    const currentRoles = formData.appliesTo.roles || [];
    const newRoles = currentRoles.includes(role)
      ? currentRoles.filter(r => r !== role)
      : [...currentRoles, role];
    
    setFormData({
      ...formData,
      appliesTo: { ...formData.appliesTo, roles: newRoles }
    });
  };

  const roles = ['all', 'employee', 'manager', 'department_head', 'hr', 'admin', 'god_admin'];
  const contextTypes = ['system_prompt', 'personality_trait', 'knowledge_base', 'behavior_rule', 'response_template', 'custom_function'];
  const categories = ['general', 'employee_interaction', 'department_specific', 'role_specific', 'task_management', 'communication', 'data_access', 'custom'];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FaRobot className="text-purple-600" />
            MAYA Custom Context
          </h1>
          <p className="text-gray-600 mt-1">Customize MAYA's behavior, personality, and knowledge</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center gap-2"
        >
          {showForm ? <FaTimes /> : <FaPlus />}
          {showForm ? 'Cancel' : 'Add Context'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">
            {editingContext ? 'Edit Context' : 'Create New Context'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Context Type</label>
                <select
                  value={formData.contextType}
                  onChange={(e) => setFormData({ ...formData, contextType: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                  required
                >
                  {contextTypes.map(type => (
                    <option key={type} value={type}>{type.replace(/_/g, ' ').toUpperCase()}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                  required
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat.replace(/_/g, ' ').toUpperCase()}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Content</label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 h-32"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Priority (0-100)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div className="flex items-center">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium">Active</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Applies To Roles</label>
              <div className="flex flex-wrap gap-2">
                {roles.map(role => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => handleRoleToggle(role)}
                    className={`px-3 py-1 rounded-full text-sm ${
                      (formData.appliesTo.roles || []).includes(role)
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    {role.replace(/_/g, ' ').toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
              >
                <FaSave />
                {editingContext ? 'Update' : 'Create'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 flex items-center gap-2"
              >
                <FaTimes />
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8">Loading contexts...</div>
      ) : (
        <div className="grid gap-4">
          {contexts.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center text-gray-500">
              No custom contexts yet. Click "Add Context" to create one.
            </div>
          ) : (
            contexts.map(context => (
              <div key={context._id} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-xl font-bold">{context.title}</h3>
                      <span className={`px-2 py-1 rounded text-xs ${context.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {context.isActive ? 'Active' : 'Inactive'}
                      </span>
                      <span className="px-2 py-1 rounded text-xs bg-purple-100 text-purple-800">
                        Priority: {context.priority}
                      </span>
                    </div>
                    {context.description && (
                      <p className="text-gray-600 text-sm mb-2">{context.description}</p>
                    )}
                    <div className="flex gap-2 text-xs text-gray-500 mb-2">
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        {context.contextType.replace(/_/g, ' ')}
                      </span>
                      <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded">
                        {context.category.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(context)}
                      className="text-blue-600 hover:text-blue-800 p-2"
                    >
                      <FaEdit />
                    </button>
                    <button
                      onClick={() => handleDelete(context._id)}
                      className="text-red-600 hover:text-red-800 p-2"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </div>
                <div className="bg-gray-50 rounded p-3 mb-3">
                  <p className="text-sm whitespace-pre-wrap">{context.content}</p>
                </div>
                {context.appliesTo?.roles && context.appliesTo.roles.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    <span className="text-xs text-gray-600">Applies to:</span>
                    {context.appliesTo.roles.map(role => (
                      <span key={role} className="text-xs bg-gray-200 px-2 py-1 rounded">
                        {role.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}


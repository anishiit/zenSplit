"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function GroupsPage() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroup, setNewGroup] = useState({
    name: '',
    description: '',
    members: []
  });
  const [userEmail, setUserEmail] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const email = localStorage.getItem('userEmail');
    if (!email) {
      router.push('/login');
      return;
    }
    setUserEmail(email);
    fetchGroups(email);
  }, [router]);

  const fetchGroups = async (email) => {
    try {
      const response = await fetch(`/api/groups?userEmail=${encodeURIComponent(email)}`);
      const result = await response.json();
      
      if (result.success) {
        setGroups(result.data);
      } else {
        setError(result.error || 'Failed to fetch groups');
      }
    } catch (error) {
      console.error('Error fetching groups:', error);
      setError('Failed to fetch groups');
    } finally {
      setLoading(false);
    }
  };

  const createGroup = async (e) => {
    e.preventDefault();
    
    if (!newGroup.name.trim()) {
      setError('Group name is required');
      return;
    }

    try {
      const response = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userEmail: userEmail,
          groupName: newGroup.name.trim(),
          description: newGroup.description.trim(),
          members: newGroup.members
        })
      });

      const result = await response.json();
      
      if (result.success) {
        setNewGroup({ name: '', description: '', members: [] });
        setShowCreateGroup(false);
        await fetchGroups(userEmail);
      } else {
        setError(result.error || 'Failed to create group');
      }
    } catch (error) {
      console.error('Error creating group:', error);
      setError('Failed to create group');
    }
  };

  const openGroup = (groupId) => {
    router.push(`/?group=${groupId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500"></div>
          <p className="text-slate-600 font-medium">Loading your groups...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 bg-clip-text text-transparent mb-4">
            Your Groups
          </h1>
          <p className="text-xl text-slate-600 mb-8">
            Manage your expense groups and contexts
          </p>
          
          <button
            onClick={() => setShowCreateGroup(true)}
            className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-8 py-4 rounded-xl hover:from-blue-600 hover:to-purple-700 transform hover:scale-105 transition-all duration-200 shadow-lg font-semibold"
          >
            + Create New Group
          </button>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6 max-w-md mx-auto">
            {error}
          </div>
        )}

        {/* Groups Grid */}
        {groups.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full mx-auto mb-6 flex items-center justify-center">
              <span className="text-4xl">👥</span>
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">No groups yet</h3>
            <p className="text-slate-600 mb-6">Create your first group to start managing expenses with friends</p>
            <button
              onClick={() => setShowCreateGroup(true)}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Create your first group →
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {groups.map((group) => (
              <div
                key={group.groupId}
                onClick={() => openGroup(group.groupId)}
                className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 hover:shadow-xl transform hover:scale-105 transition-all duration-200 cursor-pointer"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-lg">
                      {group.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="text-sm text-slate-500">
                    {group.stats.memberCount} members
                  </span>
                </div>
                
                <h3 className="text-lg font-semibold text-slate-900 mb-2">{group.name}</h3>
                {group.description && (
                  <p className="text-sm text-slate-600 mb-4">{group.description}</p>
                )}
                
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <p className="text-lg font-bold text-slate-900">₹{group.stats.totalAmount.toFixed(2)}</p>
                    <p className="text-xs text-slate-500">Total Spent</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-slate-900">{group.stats.totalExpenses}</p>
                    <p className="text-xs text-slate-500">Expenses</p>
                  </div>
                </div>
                
                <div className="mt-4 flex -space-x-2">
                  {group.members.slice(0, 4).map((member, index) => (
                    <div
                      key={member.userId}
                      className="w-8 h-8 bg-gradient-to-br from-green-400 to-blue-500 rounded-full border-2 border-white flex items-center justify-center"
                    >
                      <span className="text-white text-xs font-semibold">
                        {member.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  ))}
                  {group.members.length > 4 && (
                    <div className="w-8 h-8 bg-slate-300 rounded-full border-2 border-white flex items-center justify-center">
                      <span className="text-slate-600 text-xs">+{group.members.length - 4}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Group Modal */}
        {showCreateGroup && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
              <div className="p-6 border-b border-slate-200">
                <h3 className="text-xl font-bold text-slate-900">Create New Group</h3>
                <p className="text-slate-600 text-sm mt-1">Start managing expenses with your friends</p>
              </div>
              
              <form onSubmit={createGroup} className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Group Name</label>
                  <input
                    type="text"
                    value={newGroup.name}
                    onChange={(e) => setNewGroup(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 bg-white placeholder-slate-400"
                    placeholder="e.g., Roommates, Vacation Trip, Work Team"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Description (Optional)</label>
                  <textarea
                    value={newGroup.description}
                    onChange={(e) => setNewGroup(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 bg-white placeholder-slate-400"
                    placeholder="What's this group for?"
                    rows={3}
                  />
                </div>
                
                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateGroup(false)}
                    className="flex-1 px-4 py-3 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-3 rounded-xl hover:from-blue-600 hover:to-purple-700 font-medium"
                  >
                    Create Group
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

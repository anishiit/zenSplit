'use client'
import { useState, useEffect } from "react";

export default function Dashboard() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [friends, setFriends] = useState([]);
  const [newFriend, setNewFriend] = useState("");
  const [searchEmail, setSearchEmail] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [addMode, setAddMode] = useState('name'); // 'name' or 'email'
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [newExpense, setNewExpense] = useState({
    description: '',
    amount: '',
    payer: '',
    participants: [],
    splitType: 'equal', // 'equal' or 'percentage'
    percentages: {} // participant -> percentage mapping
  });
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    const email = localStorage.getItem('userEmail');
    if (!email) {
      window.location.href = '/login';
      return;
    }
    setUserEmail(email);
    fetchExpenses();
    fetchFriends();
  }, []);

  const fetchExpenses = async () => {
    try {
      const email = localStorage.getItem('userEmail');
      if (!email) return;
      
      const response = await fetch(`/api/expenses?email=${encodeURIComponent(email)}`);
      const result = await response.json();
      setExpenses(result.data || []);
    } catch (error) {
      console.error('Error fetching expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFriends = async () => {
    try {
      const email = localStorage.getItem('userEmail');
      if (!email) return;
      
      const response = await fetch(`/api/friends?email=${encodeURIComponent(email)}`);
      const result = await response.json();
      setFriends(result.data || []);
    } catch (error) {
      console.error('Error fetching friends:', error);
    }
  };

  const addExpense = async (e) => {
    e.preventDefault();
    if (!newExpense.description || !newExpense.amount || !newExpense.payer || newExpense.participants.length === 0) {
      alert('Please fill all fields and select participants');
      return;
    }
    
    // Validate percentage split if using percentage mode
    if (newExpense.splitType === 'percentage') {
      const totalPercentage = getTotalPercentage();
      if (totalPercentage !== 100) {
        alert('Percentage split must total exactly 100%');
        return;
      }
    }

    try {
      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newExpense,
          userEmail: userEmail,
          amount: parseFloat(newExpense.amount),
          splitType: newExpense.splitType,
          percentages: newExpense.splitType === 'percentage' ? newExpense.percentages : {}
        }),
      });
      
      if (response.ok) {
        await fetchExpenses();
        setNewExpense({ 
          description: '', 
          amount: '', 
          payer: '', 
          participants: [],
          splitType: 'equal',
          percentages: {}
        });
        setShowAddExpense(false);
      }
    } catch (error) {
      console.error('Error adding expense:', error);
    }
  };

  const searchUsers = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    try {
      const response = await fetch(`/api/friends?email=${encodeURIComponent(userEmail)}&search=${encodeURIComponent(query)}`);
      const result = await response.json();
      setSearchResults(result.data || []);
    } catch (error) {
      console.error('Error searching users:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const addFriend = async (e) => {
    e.preventDefault();
    
    if (addMode === 'name' && !newFriend.trim()) return;
    if (addMode === 'email' && !searchEmail.trim()) return;
    
    try {
      const response = await fetch('/api/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userEmail: userEmail,
          ...(addMode === 'email' ? { friendEmail: searchEmail.trim() } : { friendName: newFriend.trim() })
        })
      });
      
      if (response.ok) {
        setNewFriend("");
        setSearchEmail("");
        setSearchResults([]);
        await fetchFriends();
        setShowAddFriend(false);
      }
    } catch (error) {
      console.error('Error adding friend:', error);
    }
  };

  const addFriendFromSearch = async (user) => {
    try {
      const response = await fetch('/api/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userEmail: userEmail,
          friendEmail: user.email
        })
      });
      
      if (response.ok) {
        setSearchEmail("");
        setSearchResults([]);
        await fetchFriends();
        setShowAddFriend(false);
      }
    } catch (error) {
      console.error('Error adding friend:', error);
    }
  };

  const calculateTotalExpenses = () => {
    return expenses.reduce((total, expense) => total + parseFloat(expense.amount || 0), 0);
  };

  const calculateBalances = () => {
    const balances = {};
    
    // Initialize balances for all friends and current user
    friends.forEach(friend => {
      const friendKey = typeof friend === 'string' ? friend : (friend.email || friend.name);
      balances[friendKey] = 0;
    });
    
    // Initialize balance for current user
    if (userEmail) {
      balances[userEmail] = 0;
    }
    
    expenses.forEach(expense => {
      // Payer gets positive balance (what they paid)
      if (!balances[expense.payer]) balances[expense.payer] = 0;
      balances[expense.payer] += expense.amount;
      
      // Calculate how much each participant owes
      expense.participants.forEach(participant => {
        if (!balances[participant]) balances[participant] = 0;
        
        let owedAmount;
        if (expense.splitType === 'percentage' && expense.percentages) {
          // Calculate based on percentage
          const percentage = expense.percentages[participant] || 0;
          owedAmount = (expense.amount * percentage) / 100;
        } else {
          // Equal split (default)
          owedAmount = expense.amount / expense.participants.length;
        }
        
        balances[participant] -= owedAmount;
      });
    });
    
    return balances;
  };

  const getFriendDisplayName = (friend) => {
    if (typeof friend === 'string') return friend;
    return friend.name || friend.email?.split('@')[0] || 'Unknown';
  };

  const getFriendKey = (friend) => {
    if (typeof friend === 'string') return friend;
    return friend.email || friend.name;
  };

  const toggleParticipant = (friend) => {
    const friendKey = typeof friend === 'string' ? friend : getFriendKey(friend);
    
    setNewExpense(prev => {
      const isCurrentlySelected = prev.participants.includes(friendKey);
      let newParticipants;
      
      if (isCurrentlySelected) {
        newParticipants = prev.participants.filter(p => p !== friendKey);
      } else {
        newParticipants = [...prev.participants, friendKey];
      }
      
      // If switching to percentage mode, initialize percentages
      let newPercentages = { ...prev.percentages };
      if (prev.splitType === 'percentage') {
        if (!isCurrentlySelected) {
          // Adding participant - set equal percentage
          const equalPercentage = Math.floor(100 / (newParticipants.length));
          newParticipants.forEach(p => {
            newPercentages[p] = equalPercentage;
          });
        } else {
          // Removing participant - redistribute percentages
          delete newPercentages[friendKey];
          const remainingParticipants = Object.keys(newPercentages);
          if (remainingParticipants.length > 0) {
            const equalPercentage = Math.floor(100 / remainingParticipants.length);
            remainingParticipants.forEach(p => {
              newPercentages[p] = equalPercentage;
            });
          }
        }
      }
      
      return {
        ...prev,
        participants: newParticipants,
        percentages: newPercentages
      };
    });
  };

  const updatePercentage = (participant, percentage) => {
    setNewExpense(prev => ({
      ...prev,
      percentages: {
        ...prev.percentages,
        [participant]: parseInt(percentage) || 0
      }
    }));
  };

  const getTotalPercentage = () => {
    return Object.values(newExpense.percentages).reduce((sum, p) => sum + (parseInt(p) || 0), 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-500"></div>
          <p className="text-gray-600 font-medium">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const balances = calculateBalances();

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-black bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 bg-clip-text text-transparent mb-6 tracking-tight">
            Welcome to ZenSplit
          </h1>
          <p className="text-xl text-slate-600 mb-8 font-medium leading-relaxed">
            Split expenses effortlessly with friends and family
          </p>
          
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
              <div className="flex items-center justify-center mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl flex items-center justify-center">
                  <span className="text-white text-xl">💰</span>
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900">₹{calculateTotalExpenses().toFixed(2)}</p>
              <p className="text-slate-600 font-medium">Total Expenses</p>
            </div>
            
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
              <div className="flex items-center justify-center mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-xl flex items-center justify-center">
                  <span className="text-white text-xl">👥</span>
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900">{friends.length}</p>
              <p className="text-slate-600 font-medium">Friends</p>
            </div>
            
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
              <div className="flex items-center justify-center mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-500 rounded-xl flex items-center justify-center">
                  <span className="text-white text-xl">📊</span>
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900">{expenses.length}</p>
              <p className="text-slate-600 font-medium">Transactions</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
          <button
            onClick={() => setShowAddExpense(true)}
            className="flex items-center justify-center space-x-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-8 py-4 rounded-2xl hover:from-indigo-600 hover:to-purple-700 transition-all duration-200 shadow-lg transform hover:scale-105 font-semibold"
          >
            <span className="text-xl">➕</span>
            <span>Add Expense</span>
          </button>
          
          <button
            onClick={() => setShowAddFriend(true)}
            className="flex items-center justify-center space-x-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-8 py-4 rounded-2xl hover:from-emerald-600 hover:to-teal-700 transition-all duration-200 shadow-lg transform hover:scale-105 font-semibold"
          >
            <span className="text-xl">👥</span>
            <span>Add Friend</span>
          </button>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Recent Expenses */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 overflow-hidden">
            <div className="p-6 border-b border-gray-200/50">
              <h2 className="text-2xl font-bold text-gray-800 flex items-center space-x-2">
                <span className="text-2xl">💳</span>
                <span>Recent Expenses</span>
              </h2>
            </div>
            
            <div className="max-h-96 overflow-y-auto">
              {expenses.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl">📝</span>
                  </div>
                  <p className="text-gray-600 mb-4">No expenses yet</p>
                  <button
                    onClick={() => setShowAddExpense(true)}
                    className="text-indigo-600 hover:text-indigo-700 font-medium"
                  >
                    Add your first expense
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-gray-200/50">
                  {expenses.slice(0, 5).map(expense => (
                    <div key={expense._id} className="p-6 hover:bg-gray-50/50 transition-colors">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 mb-1">{expense.description}</h3>
                          <p className="text-sm text-gray-600 mb-2">
                            Paid by <span className="font-medium text-indigo-600">{expense.payer}</span>
                          </p>
                          <div className="flex items-center space-x-2 flex-wrap">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 font-medium">
                              ₹{parseFloat(expense.amount).toFixed(2)}
                            </span>
                            <span className="text-sm text-gray-500">
                              Split between {expense.participants?.length || 0} people
                            </span>
                            {expense.splitType === 'percentage' && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800 font-medium">
                                % Split
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Friends & Balances */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 overflow-hidden">
            <div className="p-6 border-b border-gray-200/50">
              <h2 className="text-2xl font-bold text-gray-800 flex items-center space-x-2">
                <span className="text-2xl">👥</span>
                <span>Friends & Balances</span>
              </h2>
            </div>
            
            <div className="max-h-96 overflow-y-auto">
              {friends.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl">👥</span>
                  </div>
                  <p className="text-gray-600 mb-4">No friends added yet</p>
                  <button
                    onClick={() => setShowAddFriend(true)}
                    className="text-indigo-600 hover:text-indigo-700 font-medium"
                  >
                    Add your first friend
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-slate-200/50">
                  {/* Current User Balance */}
                  {userEmail && balances[userEmail] !== undefined && (
                    <div className="p-6 hover:bg-slate-50/50 transition-colors bg-blue-50/30">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                            <span className="text-white font-semibold text-sm">
                              {userEmail.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <p className="font-medium text-slate-900">You ({userEmail.split('@')[0]})</p>
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                Me
                              </span>
                            </div>
                            <p className="text-sm text-slate-500">{userEmail}</p>
                            <p className="text-sm text-slate-500">
                              {balances[userEmail] > 0 && "Others owe you"}
                              {balances[userEmail] < 0 && "You owe others"}
                              {balances[userEmail] === 0 && "All settled up"}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-lg font-bold ${
                            balances[userEmail] > 0 ? 'text-green-600' : 
                            balances[userEmail] < 0 ? 'text-red-600' : 'text-slate-500'
                          }`}>
                            {balances[userEmail] > 0 ? '+' : ''}₹{Math.abs(balances[userEmail]).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Friends Balances */}
                  {friends.map(friend => {
                    const friendKey = getFriendKey(friend);
                    const friendName = getFriendDisplayName(friend);
                    const balance = balances[friendKey] || 0;
                    const isOwed = balance > 0;
                    const isOwing = balance < 0;
                    const isRegistered = typeof friend === 'object' ? friend.isRegistered : false;
                    
                    return (
                      <div key={friendKey} className="p-6 hover:bg-slate-50/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                              <span className="text-white font-semibold text-sm">
                                {friendName.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <div className="flex items-center space-x-2">
                                <p className="font-medium text-slate-900">{friendName}</p>
                                {isRegistered && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    ✓ Registered
                                  </span>
                                )}
                              </div>
                              {typeof friend === 'object' && friend.email && (
                                <p className="text-sm text-slate-500">{friend.email}</p>
                              )}
                              <p className="text-sm text-slate-500">
                                {isOwed && "Owes you"}
                                {isOwing && "You owe"}
                                {balance === 0 && "Settled up"}
                              </p>
                            </div>
                          </div>
                          
                          {balance !== 0 && (
                            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                              isOwed 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              ₹{Math.abs(balance).toFixed(2)}
                            </div>
                          )}
                          
                          {balance === 0 && (
                            <div className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-600">
                              Settled
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add Expense Modal */}
      {showAddExpense && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">Add New Expense</h3>
            </div>
            
            <form onSubmit={addExpense} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <input
                  type="text"
                  value={newExpense.description}
                  onChange={(e) => setNewExpense(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 bg-white placeholder-slate-400"
                  placeholder="e.g., Dinner at restaurant"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  value={newExpense.amount}
                  onChange={(e) => setNewExpense(prev => ({ ...prev, amount: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 bg-white placeholder-slate-400"
                  placeholder="0.00"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Paid by</label>
                <select
                  value={newExpense.payer}
                  onChange={(e) => setNewExpense(prev => ({ ...prev, payer: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                >
                  <option value="">Select payer</option>
                  <option value={userEmail}>You ({userEmail?.split('@')[0]})</option>
                  {friends.map(friend => {
                    const friendKey = getFriendKey(friend);
                    const friendName = getFriendDisplayName(friend);
                    return (
                      <option key={friendKey} value={friendKey}>{friendName}</option>
                    );
                  })}
                </select>
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-700">Split between</label>
                  <div className="flex bg-gray-100 rounded-lg p-1">
                    <button
                      type="button"
                      onClick={() => setNewExpense(prev => ({ ...prev, splitType: 'equal', percentages: {} }))}
                      className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                        newExpense.splitType === 'equal' 
                          ? 'bg-white text-gray-900 shadow-sm' 
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Equal
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNewExpense(prev => {
                          const equalPercentage = Math.floor(100 / (prev.participants.length || 1));
                          const newPercentages = {};
                          prev.participants.forEach(p => {
                            newPercentages[p] = equalPercentage;
                          });
                          return { ...prev, splitType: 'percentage', percentages: newPercentages };
                        });
                      }}
                      className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                        newExpense.splitType === 'percentage' 
                          ? 'bg-white text-gray-900 shadow-sm' 
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      % Split
                    </button>
                  </div>
                </div>
                
                <div className="space-y-2 max-h-60 overflow-y-auto border rounded-xl p-3 bg-gray-50">
                  {/* Current User */}
                  <label className="flex items-center space-x-3 p-2 hover:bg-white rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newExpense.participants.includes(userEmail)}
                      onChange={() => toggleParticipant(userEmail)}
                      className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                    />
                    <div className="flex-1 flex items-center space-x-2">
                      <span className="text-gray-700 font-medium">You ({userEmail?.split('@')[0]})</span>
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Me
                      </span>
                    </div>
                    {newExpense.splitType === 'percentage' && newExpense.participants.includes(userEmail) && (
                      <div className="flex items-center space-x-1">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={newExpense.percentages[userEmail] || 0}
                          onChange={(e) => updatePercentage(userEmail, e.target.value)}
                          className="w-16 p-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 text-slate-900 bg-white"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <span className="text-sm text-gray-500">%</span>
                      </div>
                    )}
                  </label>
                  
                  {/* Friends */}
                  {friends.map(friend => {
                    const friendKey = getFriendKey(friend);
                    const friendName = getFriendDisplayName(friend);
                    const isRegistered = typeof friend === 'object' ? friend.isRegistered : false;
                    return (
                      <label key={friendKey} className="flex items-center space-x-3 p-2 hover:bg-white rounded-lg cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newExpense.participants.includes(friendKey)}
                          onChange={() => toggleParticipant(friend)}
                          className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                        />
                        <div className="flex-1 flex items-center space-x-2">
                          <span className="text-gray-700">{friendName}</span>
                          {isRegistered && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              ✓
                            </span>
                          )}
                        </div>
                        {newExpense.splitType === 'percentage' && newExpense.participants.includes(friendKey) && (
                          <div className="flex items-center space-x-1">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={newExpense.percentages[friendKey] || 0}
                              onChange={(e) => updatePercentage(friendKey, e.target.value)}
                              className="w-16 p-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 text-slate-900 bg-white"
                              onClick={(e) => e.stopPropagation()}
                            />
                            <span className="text-sm text-gray-500">%</span>
                          </div>
                        )}
                      </label>
                    );
                  })}
                </div>
                
                {newExpense.splitType === 'percentage' && newExpense.participants.length > 0 && (
                  <div className="mt-2 text-sm">
                    <div className={`flex items-center justify-between p-2 rounded ${
                      getTotalPercentage() === 100 ? 'bg-green-50 text-green-800' : 'bg-orange-50 text-orange-800'
                    }`}>
                      <span>Total: {getTotalPercentage()}%</span>
                      {getTotalPercentage() !== 100 && (
                        <span className="text-xs">Must equal 100%</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddExpense(false)}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-4 py-3 rounded-xl hover:from-indigo-600 hover:to-purple-700 font-medium"
                >
                  Add Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Friend Modal */}
      {showAddFriend && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-xl font-bold text-slate-900">Add New Friend</h3>
              <p className="text-slate-600 text-sm mt-1">Add friends by name or search by email</p>
            </div>
            
            <div className="p-6">
              {/* Mode Toggle */}
              <div className="flex bg-slate-100 rounded-xl p-1 mb-6">
                <button
                  type="button"
                  onClick={() => {
                    setAddMode('name');
                    setSearchEmail('');
                    setSearchResults([]);
                  }}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                    addMode === 'name' 
                      ? 'bg-white text-slate-900 shadow-sm' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Add by Name
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAddMode('email');
                    setNewFriend('');
                  }}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                    addMode === 'email' 
                      ? 'bg-white text-slate-900 shadow-sm' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Search by Email
                </button>
              </div>

              {addMode === 'name' ? (
                // Add by Name Form
                <form onSubmit={addFriend} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Friend&apos;s Name</label>
                    <input
                      type="text"
                      value={newFriend}
                      onChange={(e) => setNewFriend(e.target.value)}
                      className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 bg-white placeholder-slate-400"
                      placeholder="Enter friend's name"
                      required
                    />
                    <p className="text-xs text-slate-500 mt-1">For friends who don&apos;t have an account yet</p>
                  </div>
                  
                  <div className="flex space-x-3">
                    <button
                      type="button"
                      onClick={() => setShowAddFriend(false)}
                      className="flex-1 px-4 py-3 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-4 py-3 rounded-xl hover:from-emerald-600 hover:to-teal-700 font-medium"
                    >
                      Add Friend
                    </button>
                  </div>
                </form>
              ) : (
                // Search by Email
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Search by Email</label>
                    <input
                      type="email"
                      value={searchEmail}
                      onChange={(e) => {
                        setSearchEmail(e.target.value);
                        searchUsers(e.target.value);
                      }}
                      className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 bg-white placeholder-slate-400"
                      placeholder="Enter email address"
                    />
                    <p className="text-xs text-slate-500 mt-1">Search for existing ZenSplit users</p>
                  </div>

                  {/* Search Results */}
                  {isSearching && (
                    <div className="text-center py-4">
                      <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                      <p className="text-sm text-slate-600 mt-2">Searching...</p>
                    </div>
                  )}

                  {searchResults.length > 0 && (
                    <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-xl">
                      {searchResults.map((user, index) => (
                        <div
                          key={user.email}
                          className={`p-3 hover:bg-slate-50 cursor-pointer ${
                            index !== searchResults.length - 1 ? 'border-b border-slate-100' : ''
                          }`}
                          onClick={() => addFriendFromSearch(user)}
                        >
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                              <span className="text-white font-semibold text-sm">
                                {user.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-slate-900">{user.name}</p>
                              <p className="text-sm text-slate-600">{user.email}</p>
                            </div>
                            <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                              <span className="text-white text-xs">✓</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {searchEmail && !isSearching && searchResults.length === 0 && (
                    <div className="text-center py-4">
                      <p className="text-slate-600">No users found</p>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          addFriend(e);
                        }}
                        className="mt-2 text-blue-500 hover:text-blue-600 font-medium text-sm"
                      >
                        Add &quot;{searchEmail}&quot; anyway
                      </button>
                    </div>
                  )}

                  <div className="flex space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowAddFriend(false)}
                      className="flex-1 px-4 py-3 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

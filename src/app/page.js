'use client'
import { useState, useEffect } from "react";

export default function Dashboard() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [friends, setFriends] = useState([]);
  const [newFriend, setNewFriend] = useState("");
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [newExpense, setNewExpense] = useState({
    description: '',
    amount: '',
    payer: '',
    participants: []
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

    try {
      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newExpense,
          userEmail: userEmail,
          amount: parseFloat(newExpense.amount)
        }),
      });
      
      if (response.ok) {
        await fetchExpenses();
        setNewExpense({ description: '', amount: '', payer: '', participants: [] });
        setShowAddExpense(false);
      }
    } catch (error) {
      console.error('Error adding expense:', error);
    }
  };

  const addFriend = async (e) => {
    e.preventDefault();
    if (!newFriend.trim()) return;
    
    try {
      const response = await fetch('/api/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userEmail: userEmail,
          friendName: newFriend.trim() 
        })
      });
      
      if (response.ok) {
        setNewFriend("");
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
    
    // Initialize balances
    friends.forEach(friend => {
      balances[friend] = 0;
    });
    
    expenses.forEach(expense => {
      const splitAmount = expense.amount / expense.participants.length;
      
      // Payer gets positive balance
      if (!balances[expense.payer]) balances[expense.payer] = 0;
      balances[expense.payer] += expense.amount;
      
      // Participants owe money
      expense.participants.forEach(participant => {
        if (!balances[participant]) balances[participant] = 0;
        balances[participant] -= splitAmount;
      });
    });
    
    return balances;
  };

  const toggleParticipant = (friend) => {
    setNewExpense(prev => ({
      ...prev,
      participants: prev.participants.includes(friend)
        ? prev.participants.filter(p => p !== friend)
        : [...prev.participants, friend]
    }));
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
                          <div className="flex items-center space-x-2">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 font-medium">
                              ₹{parseFloat(expense.amount).toFixed(2)}
                            </span>
                            <span className="text-sm text-gray-500">
                              Split between {expense.participants?.length || 0} people
                            </span>
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
                <div className="divide-y divide-gray-200/50">
                  {friends.map(friend => {
                    const balance = balances[friend] || 0;
                    const isOwed = balance > 0;
                    const isOwing = balance < 0;
                    
                    return (
                      <div key={friend} className="p-6 hover:bg-gray-50/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                              <span className="text-white font-semibold text-sm">
                                {friend.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{friend}</p>
                              <p className="text-sm text-gray-500">
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
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                  {friends.map(friend => (
                    <option key={friend} value={friend}>{friend}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Split between</label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {friends.map(friend => (
                    <label key={friend} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newExpense.participants.includes(friend)}
                        onChange={() => toggleParticipant(friend)}
                        className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                      />
                      <span className="text-gray-700">{friend}</span>
                    </label>
                  ))}
                </div>
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
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">Add New Friend</h3>
            </div>
            
            <form onSubmit={addFriend} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Friend&apos;s Name</label>
                <input
                  type="text"
                  value={newFriend}
                  onChange={(e) => setNewFriend(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Enter friend's name"
                  required
                />
              </div>
              
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddFriend(false)}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-medium"
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
          </div>
        </div>
      )}
    </div>
  );
}

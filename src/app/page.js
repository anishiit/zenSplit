'use client'
import { useState, useEffect } from "react";
import { FaDollarSign, FaUsers, FaPercentage, FaPlus, FaMoneyBillWave, FaCheckCircle, FaTimes, FaUserCircle } from "react-icons/fa";
import Link from "next/link";

export default function TripExpenseManager() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [friends, setFriends] = useState([]);
  const [newFriend, setNewFriend] = useState("");
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [newExpense, setNewExpense] = useState({
    description: '',
    amount: '',
    payer: '',
    participants: []
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState(null);
  const [showFriendDeleteConfirm, setShowFriendDeleteConfirm] = useState(false);
  const [friendToDelete, setFriendToDelete] = useState(null);

  // Add helper to validate timestamp
  const getValidatedTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return isNaN(date.getTime()) ? 'N/A' : date.toLocaleString();
  };

  // Fetch expenses and friends on mount
  useEffect(() => {
    fetchExpenses();
    fetchFriends();
  }, []);

  const fetchExpenses = async () => {
    try {
      const userEmail = localStorage.getItem('userEmail');
      if (!userEmail) {
        setExpenses([]);
        setLoading(false);
        return;
      }
      const response = await fetch(`/api/expenses?email=${encodeURIComponent(userEmail)}`);
      const { data } = await response.json();
      setExpenses(data || []);
    } catch (error) {
      console.error('Error fetching expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFriends = async () => {
    try {
      const response = await fetch('/api/friends');
      const { data } = await response.json();
      setFriends(data || []);
    } catch (error) {
      console.error('Error fetching friends:', error);
    }
  };

  // Calculate net balances
  const netBalances = () => {
    const balances = {};
    
    // Initialize all friends with zero balance
    friends.forEach(friend => {
      balances[friend] = 0;
    });

    expenses.forEach(expense => {
      const share = expense.amount / expense.participants.length;
      
      // Payer gets positive balance (they paid)
      if (!balances[expense.payer]) balances[expense.payer] = 0;
      balances[expense.payer] += parseFloat(expense.amount);
      
      // Participants get negative balance (they owe)
      expense.participants.forEach(participant => {
        if (!balances[participant]) balances[participant] = 0;
        balances[participant] -= share;
      });
    });

    return balances;
  };

  const addExpense = async () => {
    if (newExpense.description && newExpense.amount && newExpense.payer && newExpense.participants.length > 0) {
      try {
        const response = await fetch('/api/expenses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...newExpense,
            email: localStorage.getItem('userEmail')
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
    }
  };

  const deleteExpense = async (id) => {
    try {
      const response = await fetch('/api/expenses', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      if (response.ok) {
        await fetchExpenses();
        setShowDeleteConfirm(false);
        setExpenseToDelete(null);
      }
    } catch (error) {
      console.error('Error deleting expense:', error);
    }
  };

  const addFriend = async (e) => {
    e.preventDefault();
    if (!newFriend.trim()) return;
    try {
      const res = await fetch('/api/friends', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ friendName: newFriend.trim() })
      });
      if (res.ok) {
        setNewFriend("");
        await fetchFriends();
      }
    } catch (error) {
      console.error('Error adding friend:', error);
    }
  };

  const removeFriend = async (friendName) => {
    try {
      const response = await fetch('/api/friends', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendName }),
      });

      if (response.ok) {
        await fetchFriends();
        await fetchExpenses();
        setShowFriendDeleteConfirm(false);
        setFriendToDelete(null);
      }
    } catch (error) {
      console.error('Error deleting friend:', error);
    }
  };

  const calculateTotalExpenses = () => {
    return expenses.reduce((total, expense) => total + parseFloat(expense.amount || 0), 0);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      {/* Navbar */}
      <nav className="bg-white shadow-md p-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <FaMoneyBillWave className="text-purple-600 text-2xl" />
            <h1 className="text-2xl font-bold text-purple-700">Trip Splitter</h1>
          </div>
          <div className="flex items-center gap-4">
            <Link 
              href="/profile" 
              className="flex items-center gap-2 bg-purple-100 hover:bg-purple-200 px-4 py-2 rounded-lg transition-colors"
            >
              <FaUserCircle className="text-purple-600" size={20} />
              <span className="text-purple-700 font-medium">Profile</span>
            </Link>
          </div>
        </div>
      </nav>

      <div className="p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <p className="text-gray-600 mb-4">Track shared expenses in real-time ⚡</p>
            <div className="bg-purple-50 p-3 rounded-lg inline-block">
              <p className="text-lg font-semibold text-purple-700">
                Total Expenses: ₹{calculateTotalExpenses().toFixed(2)}
              </p>
            </div>
          </div>

          {/* Add Expense Button */}
          <div className="flex justify-end mb-6">
            <button
              onClick={() => setShowAddExpense(true)}
              className="flex items-center gap-2 bg-purple-700 text-white px-6 py-3 rounded-lg hover:bg-purple-800 transition-colors shadow-md"
            >
              <FaPlus className="h-5 w-5" />
              Add Expense
            </button>
          </div>

          {/* Main Content */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Expenses Column */}
            <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <FaMoneyBillWave className="text-purple-600" />
                  Expense History
                </h2>
              </div>
              <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
                {expenses.map(expense => (
                  <div key={expense._id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-gray-900">{expense.description}</h3>
                        <p className="text-sm text-gray-700 mt-1">
                          Paid by <span className="font-semibold text-purple-700">{expense.payer}</span>
                        </p>
                        <div className="mt-2 flex items-center gap-2 text-sm">
                          <span className="px-2 py-1 bg-gray-200 text-gray-900 rounded-md font-semibold">
                            ₹{parseFloat(expense.amount).toFixed(2)}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setExpenseToDelete(expense);
                          setShowDeleteConfirm(true);
                        }}
                        className="text-gray-400 hover:text-red-500 p-2"
                      >
                        <FaTimes />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Balances Card */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
                  <FaUsers className="text-purple-600" />
                  Balances
                </h2>
                <div className="space-y-3">
                  {Object.entries(netBalances()).map(([friend, balance]) => (
                    <div 
                      key={friend} 
                      className="flex items-center justify-between p-3 rounded-lg bg-gray-50"
                    >
                      <span className="font-semibold text-gray-900">{friend}</span>
                      <span className={`font-bold ${balance >= 0 ? 'text-green-800' : 'text-red-800'}`}>
                        {balance >= 0 ? 'Gets back' : 'Owes'} ₹{Math.abs(balance).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add Friend Form */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-semibold mb-4">Add Friend</h2>
                <form onSubmit={addFriend} className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Enter friend's name" 
                    value={newFriend}
                    onChange={(e) => setNewFriend(e.target.value)}
                    className="flex-1 p-2 border rounded focus:border-purple-500 text-gray-900 placeholder-gray-500" 
                  />
                  <button type="submit" className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700">
                    Add
                  </button>
                </form>
              </div>

              {/* Friends List */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-semibold mb-4">Friends</h2>
                <div className="space-y-2">
                  {friends.map(friend => (
                    <div key={friend} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-gray-800">{friend}</span>
                      <button 
                        onClick={() => { setFriendToDelete(friend); setShowFriendDeleteConfirm(true); }} 
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Expense Modal */}
      {showAddExpense && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-md p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-600">New Expense</h2>
              <button
                onClick={() => setShowAddExpense(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Description</label>
                <input
                  type="text"
                  placeholder="Dinner at Beach Cafe"
                  className="w-full p-3 rounded-lg border-2 border-gray-300 focus:border-purple-600 text-gray-900"
                  value={newExpense.description}
                  onChange={(e) => setNewExpense({...newExpense, description: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Amount (₹)</label>
                  <input
                    type="number"
                    placeholder="0.00"
                    className="w-full p-3 rounded-lg border-2 border-gray-300 focus:border-purple-600 text-gray-900"
                    value={newExpense.amount}
                    onChange={(e) => setNewExpense({...newExpense, amount: e.target.value})}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Paid By</label>
                  <select
                    className="w-full p-3 rounded-lg border-2 border-gray-300 focus:border-purple-600 text-gray-900"
                    value={newExpense.payer}
                    onChange={(e) => setNewExpense({...newExpense, payer: e.target.value})}
                  >
                    <option value="">Select payer</option>
                    {friends.map(friend => (
                      <option key={friend} value={friend}>{friend}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Split With</label>
                <div className="grid grid-cols-2 gap-3">
                  {friends.map(friend => (
                    <label 
                      key={friend} 
                      className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors
                        ${newExpense.participants.includes(friend) 
                          ? 'border-purple-500 bg-purple-50' 
                          : 'border-gray-200 hover:border-purple-300'}`}
                    >
                      <input
                        type="checkbox"
                        className="form-checkbox h-4 w-4 text-purple-600"
                        checked={newExpense.participants.includes(friend)}
                        onChange={(e) => {
                          const participants = e.target.checked
                            ? [...newExpense.participants, friend]
                            : newExpense.participants.filter(p => p !== friend);
                          setNewExpense({...newExpense, participants});
                        }}
                      />
                      <span className="ml-3 text-sm text-gray-900">{friend}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={() => setShowAddExpense(false)}
                className="flex-1 px-4 py-2.5 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={addExpense}
                className="flex-1 px-4 py-2.5 bg-purple-700 text-white rounded-lg hover:bg-purple-800 transition-colors"
              >
                Add Expense
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Delete Expense</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete {expenseToDelete?.description}?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setExpenseToDelete(null);
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteExpense(expenseToDelete._id)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Friend Delete Confirmation Modal */}
      {showFriendDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Delete Friend</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete {friendToDelete}?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowFriendDeleteConfirm(false);
                  setFriendToDelete(null);
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => removeFriend(friendToDelete)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

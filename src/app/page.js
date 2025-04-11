'use client'
import { useState, useEffect } from "react";
import { FaDollarSign, FaUsers, FaPercentage, FaPlus, FaMoneyBillWave, FaCheckCircle, FaTimes } from "react-icons/fa";

export default function TripExpenseManager() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [friends, setFriends] = useState([]);
  const [newFriend, setNewFriend] = useState("");
  const [settlements, setSettlements] = useState([]);
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
      const response = await fetch('/api/expenses');
      const { data } = await response.json();
      setExpenses(data);
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
      setFriends(data);
    } catch (error) {
      console.error('Error fetching friends:', error);
    }
  };

  // Calculate balances
  const calculateBalances = () => {
    const balances = {};

    // Initialize all friends with default balances
    friends.forEach(friend => {
      balances[friend] = { paid: 0, owed: 0 };
    });

    expenses.forEach(expense => {
      const share = expense.amount / expense.participants.length;
      
      // Ensure payer exists in balances
      if (!balances[expense.payer]) {
        balances[expense.payer] = { paid: 0, owed: 0 };
      }
      
      balances[expense.payer].paid += parseFloat(expense.amount);
      
      expense.participants.forEach(participant => {
        // Ensure participant exists in balances
        if (!balances[participant]) {
          balances[participant] = { paid: 0, owed: 0 };
        }
        balances[participant].owed += share;
      });
    });

    return balances;
  };

  // Calculate net balances
  const netBalances = () => {
    const balances = calculateBalances();
    const net = {};
    
    Object.keys(balances).forEach(friend => {
      net[friend] = balances[friend].paid - balances[friend].owed;
    });
    
    return net;
  };

  // Updated addExpense function
  const addExpense = async () => {
    if (newExpense.description && newExpense.amount && newExpense.payer && newExpense.participants.length > 0) {
      try {
        const response = await fetch('/api/expenses', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(newExpense),
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

  // Updated delete function
  const deleteExpense = async (id) => {
    try {
      const response = await fetch('/api/expenses', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete expense');
      }
    } catch (error) {
      console.error('Error deleting expense:', error);
      throw error; // Re-throw to handle in the modal
    }
  };

  // Calculate settlements
  const calculateSettlements = () => {
    const balances = netBalances();
    const creditors = [];
    const debtors = [];

    Object.keys(balances).forEach(friend => {
      if (balances[friend] > 0) creditors.push({ friend, amount: balances[friend] });
      if (balances[friend] < 0) debtors.push({ friend, amount: -balances[friend] });
    });

    const settlements = [];
    
    creditors.forEach(creditor => {
      debtors.forEach(debtor => {
        if (creditor.amount > 0 && debtor.amount > 0) {
          const settleAmount = Math.min(creditor.amount, debtor.amount);
          settlements.push({
            from: debtor.friend,
            to: creditor.friend,
            amount: settleAmount.toFixed(2)
          });
          creditor.amount -= settleAmount;
          debtor.amount -= settleAmount;
        }
      });
    });

    return settlements;
  };

  // New friend addition functionality
  const addFriend = async (e) => {
    e.preventDefault();
    if (!newFriend.trim()) return;
    try {
      const res = await fetch('/api/friends', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ friendName: newFriend.trim() })
      });
      if (!res.ok) throw new Error('Failed to add friend');
      setNewFriend("");
      await fetchFriends(); // Refresh friend list from API
      await fetchExpenses(); // Refresh expenses if needed
    } catch (error) {
      console.error('Error adding friend:', error);
      alert('Failed to add friend');
    }
  };

  const removeFriend = async (friendName) => {
    try {
      const deleteResponse = await fetch('/api/friends', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ friendName }),
      });

      if (!deleteResponse.ok) throw new Error('Deletion failed');
      
      await fetchFriends(); // Refresh friend list from API
      await fetchExpenses(); // Refresh expenses list
      
    } catch (error) {
      console.error('Error deleting friend:', error);
      alert('Failed to delete friend and transactions');
    }
  };

  // Add this function to calculate total expenses
  const calculateTotalExpenses = () => {
    return expenses.reduce((total, expense) => total + parseFloat(expense.amount), 0);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-purple-700 mb-2 flex items-center justify-center gap-2">
            <FaMoneyBillWave className="h-8 w-8" />
            <span className="bg-gradient-to-r from-purple-700 to-blue-600 bg-clip-text text-transparent">
              Trip Splitter
            </span>
          </h1>
          <p className="text-gray-700 text-sm md:text-base mb-2">
            Track shared expenses in real-time ⚡
          </p>
          <div className="bg-purple-50 p-3 rounded-lg inline-block">
            <p className="text-lg font-semibold text-purple-700">
              Total Expenses: ₹{calculateTotalExpenses().toFixed(2)}
            </p>
          </div>
        </div>

       

        {/* Add Expense Button for Desktop */}
        <div className="hidden md:flex justify-end mb-6">
          <button
            onClick={() => setShowAddExpense(true)}
            className="flex items-center gap-2 bg-purple-700 text-white px-6 py-3 rounded-lg hover:bg-purple-800 transition-colors shadow-md"
          >
            <FaPlus className="h-5 w-5" />
            Add Expense
          </button>
        </div>

        {/* Floating Add Button */}
        <div className="fixed bottom-6 right-6 z-10 md:hidden">
          <button
            onClick={() => setShowAddExpense(true)}
            className="p-4 bg-purple-700 text-white rounded-full shadow-lg hover:bg-purple-800 transition-transform transform hover:scale-110"
          >
            <FaPlus className="h-6 w-6" />
          </button>
        </div>

        {/* Add Expense Modal - Improved Layout */}
        {showAddExpense && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
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
                    className="w-full p-3 rounded-lg border-2 border-gray-300 focus:border-purple-600 focus:ring-2 focus:ring-purple-200 text-gray-900 placeholder-gray-500"
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
                      className="w-full p-3 rounded-lg border-2 border-gray-300 focus:border-purple-600 focus:ring-2 focus:ring-purple-200 text-gray-900 placeholder-gray-500"
                      value={newExpense.amount}
                      onChange={(e) => setNewExpense({...newExpense, amount: e.target.value})}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Paid By</label>
                    <select
                      className="w-full p-3 rounded-lg border-2 border-gray-300 focus:border-purple-600 focus:ring-2 focus:ring-purple-200 text-gray-900"
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
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Delete Expense
              </h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete {expenseToDelete?.description}?<br />
                This action cannot be undone.
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
                  onClick={async () => {
                    try {
                      await deleteExpense(expenseToDelete._id);
                      setShowDeleteConfirm(false);
                      setExpenseToDelete(null);
                      await fetchExpenses(); // Refresh the list
                    } catch (error) {
                      console.error('Deletion failed:', error);
                    }
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Friend Deletion Confirmation Modal */}
        {showFriendDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md">
              <h3 className="text-2xl font-bold text-blue-800 mb-4">
                Delete Friend
              </h3>
              <p className="text-gray-700 mb-6">
                Are you sure you want to permanently delete {friendToDelete}?<br />
                This will remove all their transactions.
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
                  onClick={async () => {
                    await removeFriend(friendToDelete);
                    setShowFriendDeleteConfirm(false);
                    setFriendToDelete(null);
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Expenses Column */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <FaMoneyBillWave className="text-purple-600" />
                Expense History
              </h2>
            </div>
            <div className="divide-y divide-gray-100 max-h-100 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
              {expenses.map(expense => (
                <div key={expense._id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-gray-900">{expense.description}</h3>
                      <p className="text-sm text-gray-700 mt-1">
                        Paid by <span className="font-semibold text-purple-700">{expense.payer}</span>
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Payment Time: {getValidatedTimestamp(expense.timestamp)}
                      </p>
                      <div className="mt-2 flex items-center gap-2 text-sm">
                        <span className="px-2 py-1 bg-gray-200 text-gray-900 rounded-md font-semibold">
                          ₹{parseFloat(expense.amount).toFixed(2)}
                        </span>
                        <span className="text-gray-600">•</span>
                        <span className="text-gray-700 font-semibold">
                          Split with {expense.participants.length} people
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setExpenseToDelete(expense);
                        setShowDeleteConfirm(true);
                      }}
                      className="text-gray-400 hover:text-red-500 p-2 -m-2"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Balances & Settlements Column */}
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

            {/* Settlements Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
                <FaCheckCircle className="text-purple-600" />
                Settlements
              </h2>
              <div className="space-y-3">
                {calculateSettlements().map((settlement, index) => (
                  <div 
                    key={index} 
                    className="flex items-center justify-between p-3 bg-purple-100 rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-purple-900">{settlement.from}</span>
                      <span className="text-purple-700">→</span>
                      <span className="font-semibold text-purple-900">{settlement.to}</span>
                    </div>
                    <span className="font-bold text-purple-800">
                      ₹{settlement.amount}
                    </span>
                  </div>
                ))}
              </div>
            </div>
             {/* Add Friend Form */}
        <div className="my-4">
          <form onSubmit={addFriend} className="flex gap-2">
          <input 
  type="text" 
  placeholder="Enter friend's name" 
  value={newFriend}
  onChange={(e) => setNewFriend(e.target.value)}
  className="border border-blue-300 p-2 rounded focus:border-blue-500 
  text-gray-900 placeholder-gray-500" 
/>
            <button type="submit" className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700">
              Add Friend
            </button>
          </form>
        </div>

        {/* Friends List */}
        <div className="my-4 mb-18">
          <h2 className="text-xl font-bold text-blue-800">Friends</h2>
          <ul>
            {friends.map(friend => (
              <li key={friend} className="flex items-center justify-between p-2 text-gray-800 bg-blue-50 rounded mb-2">
                <span>{friend}</span>
                <button 
                  onClick={() => { setFriendToDelete(friend); setShowFriendDeleteConfirm(true); }} 
                  className="text-red-500 font-semibold"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </div>
          </div>
        </div>
      </div>
    </div>
  );
}

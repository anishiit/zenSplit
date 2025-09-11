'use client'
import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from 'next/navigation';
import UPIPaymentButton from '../components/UPIPaymentButton';

function Dashboard() {
  const [userEmail, setUserEmail] = useState('');
  const [friends, setFriends] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [groups, setGroups] = useState([]);
  const [currentGroup, setCurrentGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Form states
  const [newFriend, setNewFriend] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedFriends, setSelectedFriends] = useState([]);
  const [expenseDescription, setExpenseDescription] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [splitType, setSplitType] = useState('equal');
  const [customSplits, setCustomSplits] = useState({});
  const [includeCurrentUser, setIncludeCurrentUser] = useState(false);
  
  // UI states
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [userProfiles, setUserProfiles] = useState({}); // Store user profiles for UPI payments
  
  // Delete confirmation states
  const [showDeleteExpenseConfirm, setShowDeleteExpenseConfirm] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState(null);
  const [showDeleteFriendConfirm, setShowDeleteFriendConfirm] = useState(false);
  const [friendToDelete, setFriendToDelete] = useState(null);
  
  // Get groupId from URL parameters
  const searchParams = useSearchParams();
  const groupId = searchParams.get('groupId');

  // Helper function to format timestamps
  const getValidatedTimestamp = (expense) => {
    const timestamp = expense.createdAt || expense.timestamp;
    if (!timestamp) return 'Unknown time';
    
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return 'Invalid date';
      
      return date.toLocaleString('en-IN', {
        day: '2-digit',
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      return 'Invalid date';
    }
  };

  useEffect(() => {
    const email = localStorage.getItem('userEmail');
    if (!email) {
      window.location.href = '/login';
      return;
    }
    setUserEmail(email);

    // Define functions inside useEffect to avoid dependency issues
    const fetchGroupsInternal = async (email) => {
      try {
        const response = await fetch(`/api/groups?userEmail=${encodeURIComponent(email)}`);
        const result = await response.json();
        
        if (result.success) {
          setGroups(result.data);
        }
      } catch (error) {
        console.error('Error fetching groups:', error);
      }
    };

    const fetchGroupDataInternal = async (email, groupId) => {
      try {
        // Fetch group-specific data
        setLoading(true);
        // Add your group data fetching logic here
      } catch (error) {
        console.error('Error fetching group data:', error);
      } finally {
        setLoading(false);
      }
    };

    const fetchExpensesInternal = async (email) => {
      try {
        const response = await fetch(`/api/expenses?email=${encodeURIComponent(email)}`);
        const result = await response.json();
        
        if (result.success) {
          setExpenses(result.data);
        }
      } catch (error) {
        console.error('Error fetching expenses:', error);
      }
    };

    const fetchFriendsInternal = async (email) => {
      try {
        const response = await fetch(`/api/friends?email=${encodeURIComponent(email)}`);
        const result = await response.json();
        
        if (result.success) {
          setFriends(result.data);
        }
      } catch (error) {
        console.error('Error fetching friends:', error);
      }
    };

    fetchGroupsInternal(email);
    
    // If groupId is provided in URL, fetch that group's data
    if (groupId) {
      fetchGroupDataInternal(email, groupId);
    } else {
      fetchExpensesInternal(email);
      fetchFriendsInternal(email);
    }
  }, [groupId]);

  // Load user profiles when expenses change (for UPI payments)
  useEffect(() => {
    const loadUserProfiles = async () => {
      if (expenses.length > 0) {
        // Calculate balances to get emails
        const balances = {};
        expenses.forEach(expense => {
          const participants = currentGroup ? 
            [userEmail, ...expense.participants] : 
            expense.participants;
          
          participants.forEach(email => {
            if (!balances[email]) balances[email] = 0;
            const amount = parseFloat(expense.amount) / participants.length;
            if (expense.payer === email) {
              balances[email] += expense.amount - amount;
            } else {
              balances[email] -= amount;
            }
          });
        });

        const emails = Object.keys(balances).filter(email => email !== userEmail);
        const profiles = {};
        
        for (const email of emails) {
          const profile = await fetchUserProfile(email);
          if (profile) {
            profiles[email] = profile;
          }
        }
        
        setUserProfiles(profiles);
      }
    };

    loadUserProfiles();
  }, [expenses, userEmail, currentGroup]);

  // Wrapper functions for external calls
  const fetchGroups = async (email) => {
    try {
      const response = await fetch(`/api/groups?userEmail=${encodeURIComponent(email)}`);
      const result = await response.json();
      
      if (result.success) {
        setGroups(result.data);
        
        // If groupId is provided, set current group
        if (groupId) {
          const group = result.data.find(g => g.groupId === groupId);
          setCurrentGroup(group);
        }
      }
    } catch (error) {
      console.error('Error fetching groups:', error);
    }
  };

  const fetchGroupData = async (email, groupId) => {
    try {
      // Fetch group-specific expenses
      const expensesResponse = await fetch(`/api/expenses?email=${encodeURIComponent(email)}&groupId=${encodeURIComponent(groupId)}`);
      const expensesResult = await expensesResponse.json();
      
      if (expensesResult.success) {
        setExpenses(expensesResult.data);
      }

      // Get group info and set friends as group members
      const group = groups.find(g => g.groupId === groupId) || currentGroup;
      if (group) {
        // Set friends as group members (excluding current user)
        const groupFriends = group.members.filter(member => member.email !== email).map(member => ({
          email: member.email,
          name: member.name,
          isRegistered: true,
          userId: member.userId
        }));
        setFriends(groupFriends);
      }
    } catch (error) {
      console.error('Error fetching group data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchExpenses = async (email) => {
    try {
      const response = await fetch(`/api/expenses?email=${encodeURIComponent(email)}`);
      const result = await response.json();
      
      if (result.success) {
        setExpenses(result.data);
      }
    } catch (error) {
      console.error('Error fetching expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFriends = async (email) => {
    try {
      const response = await fetch(`/api/friends?email=${encodeURIComponent(email)}`);
      const result = await response.json();
      
      if (result.success) {
        setFriends(result.data);
      }
    } catch (error) {
      console.error('Error fetching friends:', error);
    }
  };

  const searchUsers = async (searchTerm) => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await fetch(`/api/friends?search=${encodeURIComponent(searchTerm)}`);
      const result = await response.json();
      
      if (result.success) {
        setSearchResults(result.data);
      }
    } catch (error) {
      console.error('Error searching users:', error);
    }
  };

  const addFriend = async (friendToAdd) => {
    try {
      const response = await fetch('/api/friends', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userEmail,
          friend: friendToAdd,
          groupId // Include group context if adding within a group
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        if (groupId) {
          // If in group context, refresh group data
          fetchGroupData(userEmail, groupId);
        } else {
          // Otherwise refresh general friends list
          fetchFriends(userEmail);
        }
        setNewFriend('');
        setSearchTerm('');
        setSearchResults([]);
        setShowAddFriend(false);
      } else {
        alert(result.message);
      }
    } catch (error) {
      console.error('Error adding friend:', error);
      alert('Error adding friend');
    }
  };

  const addExpense = async () => {
    if (!expenseDescription || !expenseAmount || selectedFriends.length === 0) {
      alert('Please fill all fields and select participants');
      return;
    }

    // Calculate splits based on type
    let splits = {};
    const participants = includeCurrentUser ? 
      [userEmail, ...selectedFriends.map(f => f.email)] : 
      selectedFriends.map(f => f.email);
    
    if (splitType === 'equal') {
      const share = parseFloat(expenseAmount) / participants.length;
      participants.forEach(email => {
        splits[email] = share;
      });
    } else if (splitType === 'percentage') {
      // Validate percentages sum to 100
      const totalPercentage = participants.reduce((sum, email) => {
        return sum + (parseFloat(customSplits[email]) || 0);
      }, 0);
      
      if (Math.abs(totalPercentage - 100) > 0.01) {
        alert('Percentages must sum to 100%');
        return;
      }
      
      participants.forEach(email => {
        const percentage = parseFloat(customSplits[email]) || 0;
        splits[email] = (parseFloat(expenseAmount) * percentage) / 100;
      });
    }

    try {
      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description: expenseDescription,
          amount: parseFloat(expenseAmount),
          payer: userEmail,
          participants: participants,
          splits: splits,
          groupId: groupId // Include group context
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        if (groupId) {
          fetchGroupData(userEmail, groupId);
        } else {
          fetchExpenses(userEmail);
        }
        
        // Reset form
        setExpenseDescription('');
        setExpenseAmount('');
        setSelectedFriends([]);
        setSplitType('equal');
        setCustomSplits({});
        setIncludeCurrentUser(false);
        setShowAddExpense(false);
      } else {
        alert(result.message);
      }
    } catch (error) {
      console.error('Error adding expense:', error);
      alert('Error adding expense');
    }
  };

  const calculateBalances = () => {
    const balances = {};
    
    expenses.forEach(expense => {
      Object.entries(expense.splits).forEach(([email, amount]) => {
        if (!balances[email]) balances[email] = 0;
        
        if (email === expense.payer) {
          balances[email] += expense.amount - amount;
        } else {
          balances[email] -= amount;
        }
      });
    });
    
    return balances;
  };

  const handleSplitChange = (email, value) => {
    setCustomSplits(prev => ({
      ...prev,
      [email]: value
    }));
  };

  const deleteExpense = async (expenseId) => {
    try {
      const response = await fetch('/api/expenses', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          id: expenseId,
          userEmail: userEmail 
        }),
      });

      const result = await response.json();
      if (result.success) {
        // Refresh the appropriate data
        if (groupId) {
          fetchGroupData(userEmail, groupId);
        } else {
          fetchExpenses(userEmail);
        }
      } else {
        alert(result.error || 'Failed to delete expense');
      }
    } catch (error) {
      console.error('Error deleting expense:', error);
      alert('Error deleting expense');
    }
  };

  const deleteFriend = async (friendEmail) => {
    try {
      const response = await fetch('/api/friends', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          userEmail: userEmail,
          friendEmail: friendEmail 
        }),
      });

      const result = await response.json();
      if (result.success) {
        // Refresh friends list
        fetchFriends(userEmail);
        // Also refresh expenses and group data if needed
        if (groupId) {
          fetchGroupData(userEmail, groupId);
        } else {
          fetchExpenses(userEmail);
        }
      } else {
        alert(result.error || 'Failed to delete friend');
      }
    } catch (error) {
      console.error('Error deleting friend:', error);
      alert('Error deleting friend');
    }
  };

  // Function to fetch user profile for UPI payments
  const fetchUserProfile = async (email) => {
    try {
      const response = await fetch(`/api/profile?email=${encodeURIComponent(email)}`);
      const result = await response.json();
      
      if (result.success) {
        return result.profile;
      }
      return null;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  };

  const toggleFriendSelection = (friend) => {
    setSelectedFriends(prev => {
      const isSelected = prev.some(f => f.email === friend.email);
      if (isSelected) {
        return prev.filter(f => f.email !== friend.email);
      } else {
        return [...prev, friend];
      }
    });
  };

  if (loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-gray-600">Loading...</div>
    </div>;
  }

  const balances = calculateBalances();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header with Group Context */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {currentGroup ? `${currentGroup.name} - Dashboard` : 'Personal Dashboard'}
              </h1>
              {currentGroup && (
                <p className="text-gray-600 mt-1">
                  {currentGroup.members.length} members • {expenses.length} expenses
                </p>
              )}
            </div>
            <div className="flex gap-3">
              {currentGroup && (
                <button
                  onClick={() => window.location.href = '/groups'}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  Back to Groups
                </button>
              )}
              <button
                onClick={() => setShowAddFriend(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Add {currentGroup ? 'Member' : 'Friend'}
              </button>
              <button
                onClick={() => setShowAddExpense(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Add Expense
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Friends/Members List */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              {currentGroup ? 'Group Members' : 'Friends'}
            </h2>
            {friends.length === 0 ? (
              <p className="text-gray-500">No {currentGroup ? 'members' : 'friends'} yet</p>
            ) : (
              <div className="max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                <div className="space-y-3 pr-2">
                  {friends.map((friend, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{friend.name || friend.email}</p>
                        <p className="text-sm text-gray-500">{friend.email}</p>
                        {friend.isRegistered && (
                          <span className="inline-block px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                            Registered
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          setFriendToDelete(friend);
                          setShowDeleteFriendConfirm(true);
                        }}
                        className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remove friend"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Balances */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Balances</h2>
            {Object.keys(balances).length === 0 ? (
              <p className="text-gray-500">No balances yet</p>
            ) : (
              <div className="max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                <div className="space-y-3 pr-2">
                  {Object.entries(balances).map(([email, balance]) => (
                    <div key={email} className="flex flex-col gap-2 p-3 bg-gray-50 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-gray-900">
                          {email === userEmail ? 'You' : email}
                        </span>
                        <span className={`font-semibold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ₹{Math.abs(balance).toFixed(2)} {balance >= 0 ? 'owed to you' : 'you owe'}
                        </span>
                      </div>
                      {/* Settlement button - only show if current user owes money */}
                      {balance < 0 && email !== userEmail && (
                        <div className="flex justify-end mt-2">
                          <UPIPaymentButton
                            upiId={userProfiles[email]?.upi}
                            name={userProfiles[email]?.name}
                            amount={Math.abs(balance)}
                            note={`Settlement from zenSplit - ${userEmail}`}
                            className="text-sm px-3 py-1"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Recent Expenses */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Expenses</h2>
            {expenses.length === 0 ? (
              <p className="text-gray-500">No expenses yet</p>
            ) : (
              <div className="max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                <div className="space-y-3 pr-2">
                  {expenses.map((expense, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-gray-900">{expense.description}</p>
                          <p className="text-sm text-gray-500">
                            Paid by {expense.payer === userEmail ? 'You' : expense.payer}
                          </p>
                          <p className="text-xs text-gray-400">
                            {getValidatedTimestamp(expense)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900">₹{expense.amount}</span>
                          {(expense.userEmail === userEmail || expense.createdBy === userEmail) && (
                            <button
                              onClick={() => {
                                setExpenseToDelete(expense);
                                setShowDeleteExpenseConfirm(true);
                              }}
                              className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded transition-colors"
                              title="Delete expense"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Add Friend Modal */}
        {showAddFriend && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Add {currentGroup ? 'Group Member' : 'Friend'}
              </h3>
              
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Search by email or enter name"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    searchUsers(e.target.value);
                  }}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                />

                {/* Search Results */}
                {searchResults.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-700">Found users:</p>
                    {searchResults.map((user, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">{user.name || user.email}</p>
                          <p className="text-sm text-gray-500">{user.email}</p>
                          {user.isRegistered && (
                            <span className="inline-block px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                              Registered User
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => addFriend(user)}
                          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          Add
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add by name option */}
                {searchTerm && searchResults.length === 0 && (
                  <div className="p-3 bg-yellow-50 rounded-lg">
                    <p className="text-sm text-gray-700 mb-2">No registered users found. Add as contact?</p>
                    <button
                      onClick={() => addFriend({ email: searchTerm, name: searchTerm, isRegistered: false })}
                      className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      Add &quot;{searchTerm}&quot; as contact
                    </button>
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowAddFriend(false);
                    setSearchTerm('');
                    setSearchResults([]);
                  }}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Expense Modal */}
        {showAddExpense && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Expense</h3>
              
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Expense description"
                  value={expenseDescription}
                  onChange={(e) => setExpenseDescription(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                />

                <input
                  type="number"
                  step="0.01"
                  placeholder="Amount (₹)"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                />

                {/* Include current user option */}
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={includeCurrentUser}
                    onChange={(e) => setIncludeCurrentUser(e.target.checked)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-gray-700">Include yourself in the split</span>
                </label>

                {/* Split type selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Split Type</label>
                  <select
                    value={splitType}
                    onChange={(e) => setSplitType(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  >
                    <option value="equal">Split Equally</option>
                    <option value="percentage">Custom Percentages</option>
                  </select>
                </div>

                {/* Participants selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Participants ({selectedFriends.length} selected)
                  </label>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {friends.map((friend, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={selectedFriends.some(f => f.email === friend.email)}
                            onChange={() => toggleFriendSelection(friend)}
                            className="w-4 h-4 text-blue-600"
                          />
                          <span className="text-gray-900">{friend.name || friend.email}</span>
                        </div>
                        
                        {/* Percentage input for custom split */}
                        {splitType === 'percentage' && selectedFriends.some(f => f.email === friend.email) && (
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            placeholder="%"
                            value={customSplits[friend.email] || ''}
                            onChange={(e) => handleSplitChange(friend.email, e.target.value)}
                            className="w-16 p-1 border border-gray-300 rounded text-gray-900"
                          />
                        )}
                      </div>
                    ))}
                    
                    {/* Current user percentage input */}
                    {splitType === 'percentage' && includeCurrentUser && (
                      <div className="flex items-center justify-between p-2 bg-blue-50 rounded">
                        <span className="text-gray-900">You</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          placeholder="%"
                          value={customSplits[userEmail] || ''}
                          onChange={(e) => handleSplitChange(userEmail, e.target.value)}
                          className="w-16 p-1 border border-gray-300 rounded text-gray-900"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowAddExpense(false);
                    setExpenseDescription('');
                    setExpenseAmount('');
                    setSelectedFriends([]);
                    setSplitType('equal');
                    setCustomSplits({});
                    setIncludeCurrentUser(false);
                  }}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  onClick={addExpense}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Add Expense
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Expense Confirmation Modal */}
        {showDeleteExpenseConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Delete Expense
              </h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete &quot;{expenseToDelete?.description}&quot;?<br />
                This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowDeleteExpenseConfirm(false);
                    setExpenseToDelete(null);
                  }}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    try {
                      await deleteExpense(expenseToDelete._id || expenseToDelete.expenseId);
                      setShowDeleteExpenseConfirm(false);
                      setExpenseToDelete(null);
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

        {/* Delete Friend Confirmation Modal */}
        {showDeleteFriendConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Remove Friend
              </h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to remove &quot;{friendToDelete?.name || friendToDelete?.email}&quot; from your friends list?<br />
                This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowDeleteFriendConfirm(false);
                    setFriendToDelete(null);
                  }}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    try {
                      await deleteFriend(friendToDelete.email);
                      setShowDeleteFriendConfirm(false);
                      setFriendToDelete(null);
                    } catch (error) {
                      console.error('Deletion failed:', error);
                    }
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center space-y-4">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500"></div>
        <p className="text-slate-600 font-medium">Loading...</p>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <Dashboard />
    </Suspense>
  );
}

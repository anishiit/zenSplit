'use client'
import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from 'next/navigation';
import UPIPaymentButton from '../components/UPIPaymentButton';
import { calculateBalances, validateExpense, createEqualSplit, createPercentageSplit } from '../lib/calculationEngine';

function Dashboard() {
  const [userEmail, setUserEmail] = useState('');
  const [friends, setFriends] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [groups, setGroups] = useState([]);
  const [currentGroup, setCurrentGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Form states
  const [newFriend, setNewFriend] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedFriends, setSelectedFriends] = useState([]);
  const [expenseDescription, setExpenseDescription] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expensePayer, setExpensePayer] = useState(''); // Who paid the expense
  const [splitType, setSplitType] = useState('equal');
  const [customSplits, setCustomSplits] = useState({});
  const [includeCurrentUser, setIncludeCurrentUser] = useState(false);
  
  // UI states
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [userProfiles, setUserProfiles] = useState({}); // Store user profiles for UPI payments
  const [isAddingExpense, setIsAddingExpense] = useState(false); // Loading state for expense submission
  const [showCalculation, setShowCalculation] = useState(false); // Show calculation popup
  const [selectedCalculationEmail, setSelectedCalculationEmail] = useState(''); // Email for calculation details
  
  // Delete confirmation states
  const [showDeleteExpenseConfirm, setShowDeleteExpenseConfirm] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState(null);
  const [showDeleteFriendConfirm, setShowDeleteFriendConfirm] = useState(false);
  const [friendToDelete, setFriendToDelete] = useState(null);
  
  // Get groupId from URL parameters
  const searchParams = useSearchParams();
  const groupId = searchParams.get('group'); // Changed from 'groupId' to 'group'

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
    setExpensePayer(email); // Set current user as default payer
    
    // Define functions inside useEffect to avoid dependency issues
    const fetchGroupsInternal = async () => {
      try {
        const response = await fetch(`/api/groups?userEmail=${encodeURIComponent(email)}`);
        const result = await response.json();
        
        if (result.success) {
          setGroups(result.data);
          return result.data;
        }
      } catch (error) {
        console.error('Error fetching groups:', error);
      }
      return [];
    };

    const fetchGroupDataInternal = async (groupId, groupsData = null) => {
      try {
        // Fetch group-specific expenses
        const expensesResponse = await fetch(`/api/expenses?email=${encodeURIComponent(email)}&groupId=${encodeURIComponent(groupId)}`);
        const expensesResult = await expensesResponse.json();
        
        if (expensesResult.success) {
          setExpenses(expensesResult.data);
        }

        // Get group info and set friends as group members
        const group = groupsData?.find(g => g.groupId === groupId);
        if (group) {
          setCurrentGroup(group);
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

    const fetchExpensesInternal = async () => {
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

    const fetchFriendsInternal = async () => {
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
    
    const loadData = async () => {
      if (groupId) {
        // If groupId is provided, fetch groups first then group data
        const groupsData = await fetchGroupsInternal();
        await fetchGroupDataInternal(groupId, groupsData);
      } else {
        // Otherwise fetch general data
        await fetchGroupsInternal();
        fetchExpensesInternal();
        fetchFriendsInternal();
      }
    };
    
    // Initial load
    loadData();
    
    // Auto-refresh disabled - only refresh on window focus
    // const autoRefreshInterval = setInterval(() => {
    //   console.log('Auto-refreshing data...');
    //   loadData();
    // }, 10000);
    
    // Refresh when window gets focus (user switches back to tab)
    const handleFocus = () => {
      console.log('Window focused, refreshing data...');
      loadData();
    };
    
    window.addEventListener('focus', handleFocus);
    
    // Cleanup
    return () => {
      // clearInterval(autoRefreshInterval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [groupId]); // Only depend on groupId

  // Load user profiles when expenses change (for UPI payments)
  useEffect(() => {
    const loadUserProfiles = async () => {
      if (expenses.length > 0) {
        // Calculate balances using the same logic as calculateBalances function
        const balances = {};
        expenses.forEach(expense => {
          // Check if expense.splits exists and is an object
          if (expense.splits && typeof expense.splits === 'object') {
            Object.entries(expense.splits).forEach(([email, amount]) => {
              if (!balances[email]) balances[email] = 0;
              
              if (email === expense.payer) {
                balances[email] += expense.amount - amount;
              } else {
                balances[email] -= amount;
              }
            });
          }
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

  // Functions needed by other parts of the component
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

  const fetchExpenses = async (email) => {
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

  const fetchGroupData = async (email, groupId) => {
    try {
      // Fetch group-specific expenses
      const expensesResponse = await fetch(`/api/expenses?email=${encodeURIComponent(email)}&groupId=${encodeURIComponent(groupId)}`);
      const expensesResult = await expensesResponse.json();
      
      if (expensesResult.success) {
        setExpenses(expensesResult.data);
      }

      // Get group info and set friends as group members
      const groupsResponse = await fetch(`/api/groups?userEmail=${encodeURIComponent(email)}`);
      const groupsResult = await groupsResponse.json();
      
      if (groupsResult.success) {
        const group = groupsResult.data.find(g => g.groupId === groupId);
        if (group) {
          setCurrentGroup(group);
          // Set friends as group members (excluding current user)
          const groupFriends = group.members.filter(member => member.email !== email).map(member => ({
            email: member.email,
            name: member.name,
            isRegistered: true,
            userId: member.userId
          }));
          setFriends(groupFriends);
        }
      }
    } catch (error) {
      console.error('Error fetching group data:', error);
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

  // Manual refresh function
  const refreshData = async () => {
    console.log('Manual refresh triggered...');
    setRefreshing(true);
    
    try {
      if (groupId) {
        await fetchGroupData(userEmail, groupId);
      } else {
        await fetchExpenses(userEmail);
        await fetchFriends(userEmail);
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const searchUsers = async (searchTerm) => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await fetch(`/api/friends?email=${encodeURIComponent(userEmail)}&search=${encodeURIComponent(searchTerm)}`);
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
      let response;
      
      if (groupId) {
        // If in group context, add as group member
        response = await fetch('/api/groups', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'add_member',
            groupId: groupId,
            userEmail: userEmail,
            data: {
              newMemberEmail: friendToAdd.email
            }
          }),
        });
      } else {
        // Otherwise add as personal friend
        response = await fetch('/api/friends', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userEmail,
            friendEmail: friendToAdd.email,
            friendName: friendToAdd.name
          }),
        });
      }

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
        alert(result.message || result.error || 'Error adding member');
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

    // Ensure payer is set (default to current user if not set)
    const finalPayer = expensePayer || userEmail;

    // Prevent multiple submissions
    if (isAddingExpense) {
      return;
    }

    setIsAddingExpense(true);

    try {
      let splits = {};
      let participants = [];
      
      if (!includeCurrentUser && finalPayer === userEmail) {
        // Special case: Current user pays but is not included in split
        // This means current user is paying FOR the selected friends, not WITH them
        const beneficiaries = selectedFriends.map(f => f.email);
        participants = beneficiaries; // Set participants for API call
        
        if (beneficiaries.length === 0) {
          // No one selected - this is just a personal expense
          splits = { [finalPayer]: parseFloat(expenseAmount) };
          participants = [finalPayer]; // Just the payer for personal expense
        } else {
          // Current user pays for others - split the amount among beneficiaries only
          // The payer (current user) is NOT included in splits
          if (splitType === 'equal') {
            splits = createEqualSplit(beneficiaries, parseFloat(expenseAmount));
          } else if (splitType === 'percentage') {
            splits = createPercentageSplit(customSplits, parseFloat(expenseAmount));
          }
        }
      } else {
        // Normal case: include all participants in the split
        if (includeCurrentUser) {
          participants = [userEmail, ...selectedFriends.map(f => f.email)];
        } else {
          participants = selectedFriends.map(f => f.email);
          // Add the payer if they're not the current user
          if (finalPayer !== userEmail && !participants.includes(finalPayer)) {
            participants.push(finalPayer);
          }
        }
        
        if (splitType === 'equal') {
          splits = createEqualSplit(participants, parseFloat(expenseAmount));
        } else if (splitType === 'percentage') {
          splits = createPercentageSplit(customSplits, parseFloat(expenseAmount));
        }
      }

      // Validate the expense before sending
      const expenseData = {
        description: expenseDescription,
        amount: parseFloat(expenseAmount),
        payer: finalPayer,
        splits: splits
      };

      const validation = validateExpense(expenseData);
      if (!validation.isValid) {
        alert('Expense validation failed: ' + validation.errors.join(', '));
        return;
      }

      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userEmail: userEmail,  // User who is creating the expense
          description: expenseDescription,
          amount: parseFloat(expenseAmount),
          payer: expensePayer,  // Who actually paid the expense
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
        setExpensePayer(userEmail || ''); // Reset to current user
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
    } finally {
      setIsAddingExpense(false);
    }
  };

  // Use the new calculation engine with group member information
  const groupMemberEmails = currentGroup ? 
    [userEmail, ...currentGroup.members.map(m => m.email)] : 
    [userEmail, ...friends.map(f => f.email)];
  
  const calculationResult = calculateBalances(expenses, userEmail, groupMemberEmails);
  const balances = calculationResult.balances;
  const calculationSummary = calculationResult.summary;

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
    return (
      <div className="min-h-screen flex items-center justify-center" style={{background: 'var(--bg-texture), linear-gradient(135deg, #fafaf9 0%, #f5f5f4 100%)'}}>
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-orange-400 to-orange-600 flex items-center justify-center loading-shimmer">
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-lg font-medium" style={{color: 'var(--warm-gray-600)'}}>Getting your splits ready...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{background: 'var(--bg-texture), linear-gradient(135deg, #fafaf9 0%, #f5f5f4 100%)'}}>
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header with Group Context */}
        <div className="card mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="heading-primary">
                {currentGroup ? `${currentGroup.name}` : 'Your Splits'}
              </h1>
              {currentGroup ? (
                <p className="text-lg mt-2" style={{color: 'var(--warm-gray-600)'}}>
                  <span className="inline-flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                    {currentGroup.members.length} members
                  </span>
                  <span className="mx-3">•</span>
                  <span className="inline-flex items-center gap-2">
                    <span className="w-2 h-2 bg-orange-400 rounded-full"></span>
                    {expenses.length} expenses
                  </span>
                </p>
              ) : (
                <p className="text-lg mt-2" style={{color: 'var(--warm-gray-600)'}}>
                  Manage your personal expenses and settle up with friends
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-3 w-full sm:w-auto">
              <button
                onClick={refreshData}
                disabled={refreshing}
                className={`btn-secondary flex items-center gap-2 ${refreshing ? 'opacity-50 cursor-not-allowed' : ''}`}
                title="Refresh data"
              >
                <svg className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="hidden sm:inline">{refreshing ? 'Refreshing...' : 'Refresh'}</span>
              </button>
              {currentGroup && (
                <button
                  onClick={() => window.location.href = '/groups'}
                  className="btn-secondary"
                >
                  <span className="sm:hidden">Groups</span>
                  <span className="hidden sm:inline">← Back to Groups</span>
                </button>
              )}
              <button
                onClick={() => setShowAddFriend(true)}
                className="btn-secondary flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add {currentGroup ? 'Member' : 'Friend'}
              </button>
              <button
                onClick={() => setShowAddExpense(true)}
                className="btn-primary flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Expense
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Friends/Members List */}
          <div className="card">
            <h2 className="heading-secondary mb-6 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-teal-400 to-teal-600 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              {currentGroup ? 'Group Members' : 'Your Squad'}
            </h2>
            {friends.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-gray-100 to-gray-200 flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <p className="text-lg font-medium" style={{color: 'var(--warm-gray-500)'}}>No {currentGroup ? 'members' : 'friends'} yet</p>
                <p className="text-sm mt-1" style={{color: 'var(--warm-gray-400)'}}>Add some friends to start splitting!</p>
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto scrollbar-custom">
                <div className="space-y-3 pr-2">
                  {friends.map((friend, index) => (
                    <div key={index} className="friend-item flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-lg" style={{color: 'var(--warm-gray-800)'}}>{friend.name || friend.email}</p>
                        <p className="text-sm truncate" style={{color: 'var(--warm-gray-500)'}}>{friend.email}</p>
                        {friend.isRegistered && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 text-xs rounded-full mt-2 border border-green-200">
                            <span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span>
                            Active
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          setFriendToDelete(friend);
                          setShowDeleteFriendConfirm(true);
                        }}
                        className="ml-3 p-2 rounded-full bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-600 transition-all duration-200 hover:scale-105"
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
          <div className="card">
            <h2 className="heading-secondary mb-6 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              Money Matters
            </h2>
            {Object.entries(balances).filter(([email, balance]) => email !== userEmail && Math.abs(balance) > 0.01).length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-gray-100 to-gray-200 flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <p className="text-lg font-medium" style={{color: 'var(--warm-gray-500)'}}>All settled up!</p>
                <p className="text-sm mt-1" style={{color: 'var(--warm-gray-400)'}}>No outstanding balances</p>
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto scrollbar-custom">
                <div className="space-y-4 pr-2">
                  {Object.entries(balances)
                    .filter(([email, balance]) => email !== userEmail && Math.abs(balance) > 0.01) // Only show other people's balances
                    .map(([email, balance]) => (
                    <div key={email} className={`flex flex-col gap-3 p-4 rounded-xl border-l-4 ${balance > 0 ? 'balance-negative' : 'balance-positive'}`}>
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                        <div className="flex-1">
                          <span className="font-semibold text-lg" style={{color: 'var(--warm-gray-800)'}}>
                            {email}
                          </span>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`font-bold text-xl ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                              ₹{Math.abs(balance).toFixed(2)}
                            </span>
                            <span className={`text-sm px-2 py-1 rounded-full ${balance > 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                              {balance > 0 ? 'you owe' : 'owes you'}
                            </span>
                          </div>
                        </div>
                      </div>
                      {/* Show calculation button for all users, pay button only when user owes money */}
                      <div className="flex justify-end mt-2 gap-2">
                        <button
                          onClick={() => {
                            setSelectedCalculationEmail(email);
                            setShowCalculation(true);
                          }}
                          className="text-xs px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                        >
                          Show Calculation
                        </button>
                        {/* Settlement button - only show if current user owes money (balance > 0) */}
                        {balance > 0 && (
                          <UPIPaymentButton
                            upiId={userProfiles[email]?.upi}
                            name={userProfiles[email]?.name}
                            amount={Math.abs(balance)}
                            note={`Settlement from zenSplit - ${userEmail}`}
                            className="text-xs px-3 py-1"
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Recent Expenses */}
          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">Recent Expenses</h2>
            {expenses.length === 0 ? (
              <p className="text-gray-500 text-sm sm:text-base">No expenses yet</p>
            ) : (
              <div className="max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                <div className="space-y-3 pr-2">
                  {expenses.map((expense, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-gray-900 text-sm sm:text-base">{expense.description}</p>
                          <p className="text-xs sm:text-sm text-gray-500">
                            Paid by {expense.payer === userEmail ? 'You' : expense.payer}
                          </p>
                          <p className="text-xs text-gray-400">
                            {getValidatedTimestamp(expense)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900 text-sm sm:text-base">₹{expense.amount}</span>
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
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white placeholder-gray-500"
                  style={{ color: '#1f2937', backgroundColor: '#ffffff' }}
                />

                <input
                  type="number"
                  step="0.01"
                  placeholder="Amount (₹)"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white placeholder-gray-500"
                  style={{ color: '#1f2937', backgroundColor: '#ffffff' }}
                />

                {/* Who paid selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Who paid this expense?</label>
                  <select
                    value={expensePayer}
                    onChange={(e) => setExpensePayer(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                    style={{ color: '#1f2937', backgroundColor: '#ffffff' }}
                  >
                    <option value={userEmail}>You ({userEmail})</option>
                    {currentGroup && currentGroup.members && currentGroup.members
                      .filter(member => member.email !== userEmail)
                      .map(member => (
                        <option key={member.email} value={member.email}>
                          {member.email}
                        </option>
                      ))}
                  </select>
                </div>

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
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                    style={{ color: '#1f2937', backgroundColor: '#ffffff' }}
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
                          className="w-16 p-1 border border-gray-300 rounded text-gray-900 bg-white"
                          style={{ color: '#1f2937', backgroundColor: '#ffffff' }}
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
                          className="w-16 p-1 border border-gray-300 rounded text-gray-900 bg-white"
                          style={{ color: '#1f2937', backgroundColor: '#ffffff' }}
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
                  disabled={isAddingExpense}
                  className={`flex-1 px-4 py-2 text-white rounded-lg transition-colors ${
                    isAddingExpense 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  {isAddingExpense ? 'Adding...' : 'Add Expense'}
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

        {/* Calculation Details Popup */}
        {showCalculation && selectedCalculationEmail && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Calculation Details - {selectedCalculationEmail}
                </h3>
                <button
                  onClick={() => {
                    setShowCalculation(false);
                    setSelectedCalculationEmail('');
                  }}
                  className="text-gray-500 hover:text-gray-700 text-xl"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-4">
                {/* Total Balance */}
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-700 font-medium">Total Balance</div>
                  <div className={`text-xl font-bold ${balances[selectedCalculationEmail] > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    ₹{Math.abs(balances[selectedCalculationEmail] || 0).toFixed(2)}
                    <span className="text-sm ml-2 text-gray-700">
                      {balances[selectedCalculationEmail] > 0 ? 'you owe' : 'owes you'}
                    </span>
                  </div>
                </div>

                {/* Expense Breakdown */}
                <div>
                  <h4 className="font-medium mb-2 text-gray-900">Expense Breakdown:</h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {expenses.filter(expense => {
                      // Show expenses where either user is payer or participant
                      const isParticipant = expense.splits && selectedCalculationEmail in expense.splits;
                      const isPayer = expense.payer === selectedCalculationEmail;
                      const userIsPayer = expense.payer === userEmail;
                      const userIsParticipant = expense.splits && userEmail in expense.splits;
                      
                      return (isParticipant || isPayer) && (userIsPayer || userIsParticipant);
                    }).map((expense, index) => {
                      const userSplit = expense.splits?.[userEmail] || 0;
                      const otherSplit = expense.splits?.[selectedCalculationEmail] || 0;
                      const userIsPayer = expense.payer === userEmail;
                      const otherIsPayer = expense.payer === selectedCalculationEmail;
                      
                      let impact = 0;
                      let description = '';
                      
                      if (userIsPayer && otherSplit > 0) {
                        // User paid, other person owes their split
                        impact = otherSplit;
                        description = `${selectedCalculationEmail} owes you ₹${otherSplit.toFixed(2)}`;
                      } else if (otherIsPayer && userSplit > 0) {
                        // Other person paid, user owes their split
                        impact = -userSplit;
                        description = `You owe ₹${userSplit.toFixed(2)} to ${selectedCalculationEmail}`;
                      }
                      
                      return (
                        <div key={index} className="p-2 border rounded text-sm">
                          <div className="font-medium text-gray-900">{expense.description}</div>
                          <div className="text-gray-700">
                            Amount: ₹{expense.amount.toFixed(2)} | Paid by: {expense.payer}
                          </div>
                          <div className={`font-medium ${impact > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {description}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Calculation Summary */}
                {calculationSummary && (
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <h4 className="font-medium mb-2 text-gray-900">Summary:</h4>
                    <div className="text-sm space-y-1 text-gray-700">
                      <div>Total Expenses: {calculationSummary.totalExpenses}</div>
                      <div>Total Amount: ₹{calculationSummary.totalAmount?.toFixed(2)}</div>
                      {calculationSummary.autoFixApplied && (
                        <div className="text-orange-600">Auto-fix applied to corrupted data</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => {
                    setShowCalculation(false);
                    setSelectedCalculationEmail('');
                  }}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Close
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

/**
 * ZenSplit Calculation Engine
 * A comprehensive and accurate expense calculation system
 */

export class ExpenseCalculationEngine {
  constructor() {
    this.PRECISION = 2; // Decimal places for currency
    this.EPSILON = 0.01; // Tolerance for floating point comparisons
  }

  /**
   * Attempt to auto-fix expenses with missing splits data
   * @param {Array} expenses - Array of expenses
   * @param {Array} groupMembers - Array of group member emails
   * @returns {Array} - Fixed expenses
   */
  autoFixExpenses(expenses, groupMembers = []) {
    return expenses.map(expense => {
      // If expense has valid splits, return as-is
      if (expense.splits && typeof expense.splits === 'object' && Object.keys(expense.splits).length > 0) {
        return expense;
      }

      // Create default equal split between all group members
      const participants = groupMembers.length > 0 ? groupMembers : [expense.payer];
      const splitAmount = this.roundCurrency(expense.amount / participants.length);
      
      const autoSplits = {};
      let totalAssigned = 0;
      
      // Assign equal amounts to all but last participant
      for (let i = 0; i < participants.length - 1; i++) {
        const email = participants[i].trim().toLowerCase();
        autoSplits[email] = splitAmount;
        totalAssigned += splitAmount;
      }
      
      // Assign remainder to last participant
      if (participants.length > 0) {
        const lastEmail = participants[participants.length - 1].trim().toLowerCase();
        autoSplits[lastEmail] = this.roundCurrency(expense.amount - totalAssigned);
      }

      return {
        ...expense,
        splits: autoSplits,
        _autoFixed: true // Mark as auto-fixed for debugging
      };
    });
  }

  /**
   * Main function to calculate balances from expenses
   * @param {Array} expenses - Array of expense objects
   * @param {string} currentUserEmail - Email of the current user
   * @param {Array} groupMembers - Optional array of group member emails for auto-fixing
   * @param {Array} verifiedPayments - Optional array of verified payment records
   * @returns {Object} - Calculated balances and summary
   */
  calculateBalances(expenses, currentUserEmail, groupMembers = [], verifiedPayments = []) {
    try {
      // Input validation
      if (!Array.isArray(expenses)) {
        throw new Error('Expenses must be an array');
      }
      
      if (!currentUserEmail) {
        throw new Error('Current user email is required');
      }

      // Auto-fix expenses with missing splits data
      const fixedExpenses = this.autoFixExpenses(expenses, groupMembers);

      // Initialize tracking objects
      const balances = {};
      const userTotals = {};
      const expenseDetails = [];
      let totalExpenseAmount = 0;

      // Process each expense
      fixedExpenses.forEach((expense, index) => {
        const processedExpense = this.processExpense(expense, index);
        expenseDetails.push(processedExpense);
        
        if (processedExpense.isValid) {
          totalExpenseAmount += processedExpense.amount;
          this.updateBalances(balances, userTotals, processedExpense);
        }
      });

      // Apply verified payments to adjust balances
      this.applyVerifiedPayments(balances, verifiedPayments, currentUserEmail);

      // Calculate final balances
      const finalBalances = this.finalizeBalances(balances, currentUserEmail);
      
      // Generate summary
      const summary = this.generateSummary(
        finalBalances, 
        userTotals, 
        totalExpenseAmount, 
        currentUserEmail,
        verifiedPayments
      );

      return {
        balances: finalBalances,
        summary,
        details: expenseDetails,
        totalExpenseAmount: this.roundCurrency(totalExpenseAmount),
        verifiedPayments: verifiedPayments || []
      };
    } catch (error) {
      console.error('Calculation engine error:', error);
      return {
        balances: {},
        summary: { error: error.message },
        details: [],
        totalExpenseAmount: 0,
        verifiedPayments: []
      };
    }
  }

  /**
   * Process and validate a single expense
   * @param {Object} expense - Expense object
   * @param {number} index - Expense index for debugging
   * @returns {Object} - Processed expense with validation
   */
  processExpense(expense, index) {
    const processed = {
      index,
      originalExpense: expense,
      isValid: false,
      errors: [],
      amount: 0,
      payer: null,
      splits: {},
      participants: []
    };

    try {
      // Validate basic expense structure
      if (!expense || typeof expense !== 'object') {
        processed.errors.push('Invalid expense object');
        return processed;
      }

      // Validate amount
      const amount = this.parseAmount(expense.amount);
      if (amount <= 0) {
        processed.errors.push(`Invalid amount: ${expense.amount}`);
        return processed;
      }
      processed.amount = amount;

      // Validate payer
      if (!expense.payer || typeof expense.payer !== 'string') {
        processed.errors.push('Invalid payer');
        return processed;
      }
      processed.payer = expense.payer.trim().toLowerCase();

      // Validate and process splits
      const splitsResult = this.processSplits(expense.splits, amount, processed.payer);
      if (!splitsResult.isValid) {
        processed.errors.push(...splitsResult.errors);
        return processed;
      }

      processed.splits = splitsResult.splits;
      processed.participants = splitsResult.participants;
      processed.isValid = true;

    } catch (error) {
      processed.errors.push(`Processing error: ${error.message}`);
    }

    return processed;
  }

  /**
   * Parse and validate amount
   * @param {any} amount - Amount to parse
   * @returns {number} - Parsed amount
   */
  parseAmount(amount) {
    if (typeof amount === 'number') {
      return Math.max(0, amount);
    }
    
    if (typeof amount === 'string') {
      const parsed = parseFloat(amount.replace(/[^\d.-]/g, ''));
      return isNaN(parsed) ? 0 : Math.max(0, parsed);
    }
    
    return 0;
  }

  /**
   * Process and validate expense splits
   * @param {Object} splits - Raw splits object
   * @param {number} totalAmount - Total expense amount
   * @param {string} payer - Payer email
   * @returns {Object} - Processed splits with validation
   */
  processSplits(splits, totalAmount, payer) {
    const result = {
      isValid: false,
      errors: [],
      splits: {},
      participants: []
    };

    try {
      // Check if splits data exists
      if (!splits || typeof splits !== 'object' || Object.keys(splits).length === 0) {
        // If no splits data, mark as invalid
        result.errors.push('No splits data available - expense may need to be recreated');
        return result;
      }

      const processedSplits = {};
      let totalSplitAmount = 0;
      const participants = [];

      // Process each split
      for (const [email, splitAmount] of Object.entries(splits)) {
        if (!email || typeof email !== 'string') {
          result.errors.push(`Invalid participant email: ${email}`);
          continue;
        }

        const normalizedEmail = email.trim().toLowerCase();
        const amount = this.parseAmount(splitAmount);

        if (amount <= 0) {
          result.errors.push(`Invalid split amount for ${email}: ${splitAmount}`);
          continue;
        }

        processedSplits[normalizedEmail] = this.roundCurrency(amount);
        totalSplitAmount += amount;
        participants.push(normalizedEmail);
      }

      // Validate total split amount matches expense amount
      if (Math.abs(totalSplitAmount - totalAmount) > this.EPSILON) {
        result.errors.push(
          `Split total (₹${totalSplitAmount}) doesn't match expense amount (₹${totalAmount})`
        );
        return result;
      }

      // Note: Payer doesn't need to be in splits if they're paying for others
      // This is valid when someone pays for others without participating in the split

      result.splits = processedSplits;
      result.participants = participants;
      result.isValid = true;

    } catch (error) {
      result.errors.push(`Split processing error: ${error.message}`);
    }

    return result;
  }

  /**
   * Update balances based on processed expense
   * @param {Object} balances - Current balances object
   * @param {Object} userTotals - User totals tracking
   * @param {Object} processedExpense - Processed expense
   */
  updateBalances(balances, userTotals, processedExpense) {
    const { amount, payer, splits } = processedExpense;
    const normalizedPayer = payer.trim().toLowerCase();

    // Initialize tracking for the payer (even if not in splits)
    if (!balances[normalizedPayer]) balances[normalizedPayer] = 0;
    if (!userTotals[normalizedPayer]) {
      userTotals[normalizedPayer] = { paid: 0, owes: 0, splitTotal: 0 };
    }
    
    // Payer always gets credit for the full amount paid
    userTotals[normalizedPayer].paid += amount;

    // Initialize tracking for all participants in splits
    Object.keys(splits).forEach(email => {
      if (!balances[email]) balances[email] = 0;
      if (!userTotals[email]) {
        userTotals[email] = { paid: 0, owes: 0, splitTotal: 0 };
      }
    });

    // Process each participant's split
    Object.entries(splits).forEach(([email, splitAmount]) => {
      userTotals[email].owes += splitAmount;
      userTotals[email].splitTotal += splitAmount;

      if (email === normalizedPayer) {
        // Payer: Add amount paid minus their share
        const netContribution = amount - splitAmount;
        balances[email] += netContribution;
      } else {
        // Non-payer: Subtract their share (they owe this amount)
        balances[email] -= splitAmount;
      }
    });

    // Special case: if payer is not in splits, they paid for others
    if (!splits[normalizedPayer]) {
      // Payer gets credit for the full amount (no deduction for their share)
      balances[normalizedPayer] += amount;
    }
  }

  /**
   * Apply verified payments to adjust balances
   * @param {Object} balances - Current balances object
   * @param {Array} verifiedPayments - Array of verified payment records
   * @param {string} currentUserEmail - Current user email
   */
  applyVerifiedPayments(balances, verifiedPayments, currentUserEmail) {
    if (!Array.isArray(verifiedPayments)) return;

    verifiedPayments.forEach(payment => {
      // Only process verified payments
      if (payment.status !== 'verified') return;

      const payer = payment.payer.trim().toLowerCase();
      const payee = payment.payee.trim().toLowerCase();
      const amount = this.parseAmount(payment.amount);

      if (amount <= 0) return;

      // Initialize users in balances if they don't exist
      if (!balances[payer]) balances[payer] = 0;
      if (!balances[payee]) balances[payee] = 0;

      // Adjust balances: payer owes less, payee is owed less
      balances[payer] += amount;  // Reduce what payer owes
      balances[payee] -= amount;  // Reduce what payee is owed
    });
  }

  /**
   * Finalize balances with proper rounding and filtering
   * @param {Object} balances - Raw balances
   * @param {string} currentUserEmail - Current user email
   * @returns {Object} - Finalized balances
   */
  finalizeBalances(balances, currentUserEmail) {
    const finalBalances = {};
    const normalizedCurrentUser = currentUserEmail.trim().toLowerCase();

    Object.entries(balances).forEach(([email, balance]) => {
      const roundedBalance = this.roundCurrency(balance);
      
      // Only include non-zero balances for other users (not current user)
      if (Math.abs(roundedBalance) > this.EPSILON && email !== normalizedCurrentUser) {
        finalBalances[email] = roundedBalance;
      }
    });

    return finalBalances;
  }

  /**
   * Generate calculation summary
   * @param {Object} balances - Final balances
   * @param {Object} userTotals - User totals
   * @param {number} totalAmount - Total expense amount
   * @param {string} currentUserEmail - Current user email
   * @param {Array} verifiedPayments - Array of verified payments
   * @returns {Object} - Summary object
   */
  generateSummary(balances, userTotals, totalAmount, currentUserEmail, verifiedPayments = []) {
    const normalizedCurrentUser = currentUserEmail.trim().toLowerCase();
    const currentUserTotals = userTotals[normalizedCurrentUser] || { paid: 0, owes: 0 };
    
    const youOwe = Object.values(balances).reduce((sum, balance) => {
      return sum + (balance > 0 ? balance : 0);
    }, 0);

    const youAreOwed = Object.values(balances).reduce((sum, balance) => {
      return sum + (balance < 0 ? Math.abs(balance) : 0);
    }, 0);

    // Calculate payment statistics
    const totalVerifiedPayments = verifiedPayments.reduce((sum, payment) => {
      if (payment.status === 'verified') {
        return sum + this.parseAmount(payment.amount);
      }
      return sum;
    }, 0);

    const userPaymentsSent = verifiedPayments.reduce((sum, payment) => {
      if (payment.status === 'verified' && payment.payer === currentUserEmail) {
        return sum + this.parseAmount(payment.amount);
      }
      return sum;
    }, 0);

    const userPaymentsReceived = verifiedPayments.reduce((sum, payment) => {
      if (payment.status === 'verified' && payment.payee === currentUserEmail) {
        return sum + this.parseAmount(payment.amount);
      }
      return sum;
    }, 0);

    return {
      totalExpenses: totalAmount,
      yourTotalPaid: this.roundCurrency(currentUserTotals.paid),
      yourTotalShare: this.roundCurrency(currentUserTotals.owes),
      youOwe: this.roundCurrency(youOwe),
      youAreOwed: this.roundCurrency(youAreOwed),
      netBalance: this.roundCurrency(youAreOwed - youOwe),
      participantCount: Object.keys(userTotals).length,
      isSettled: Math.abs(youOwe - youAreOwed) < this.EPSILON,
      totalVerifiedPayments: this.roundCurrency(totalVerifiedPayments),
      yourPaymentsSent: this.roundCurrency(userPaymentsSent),
      yourPaymentsReceived: this.roundCurrency(userPaymentsReceived)
    };
  }

  /**
   * Round currency to specified precision
   * @param {number} amount - Amount to round
   * @returns {number} - Rounded amount
   */
  roundCurrency(amount) {
    return Math.round((amount + Number.EPSILON) * Math.pow(10, this.PRECISION)) / Math.pow(10, this.PRECISION);
  }

  /**
   * Validate expense before adding
   * @param {Object} expenseData - Expense data to validate
   * @returns {Object} - Validation result
   */
  validateExpenseBeforeAdd(expenseData) {
    const validation = {
      isValid: false,
      errors: [],
      warnings: []
    };

    try {
      // Validate required fields
      if (!expenseData.description || expenseData.description.trim().length === 0) {
        validation.errors.push('Description is required');
      }

      if (!expenseData.amount || this.parseAmount(expenseData.amount) <= 0) {
        validation.errors.push('Valid amount is required');
      }

      if (!expenseData.payer) {
        validation.errors.push('Payer is required');
      }

      if (!expenseData.splits || Object.keys(expenseData.splits).length === 0) {
        validation.errors.push('At least one participant is required');
      }

      // Validate splits if present
      if (expenseData.splits && expenseData.amount) {
        const splitsResult = this.processSplits(
          expenseData.splits, 
          this.parseAmount(expenseData.amount),
          expenseData.payer
        );
        
        if (!splitsResult.isValid) {
          validation.errors.push(...splitsResult.errors);
        }
      }

      validation.isValid = validation.errors.length === 0;

    } catch (error) {
      validation.errors.push(`Validation error: ${error.message}`);
    }

    return validation;
  }

  /**
   * Create equal split for participants
   * @param {Array} participants - Array of participant emails
   * @param {number} amount - Total amount to split
   * @returns {Object} - Equal split object
   */
  createEqualSplit(participants, amount) {
    if (!Array.isArray(participants) || participants.length === 0) {
      throw new Error('Participants array is required');
    }

    const totalAmount = this.parseAmount(amount);
    if (totalAmount <= 0) {
      throw new Error('Valid amount is required');
    }

    const splitAmount = totalAmount / participants.length;
    const roundedSplitAmount = this.roundCurrency(splitAmount);
    
    const splits = {};
    let totalAssigned = 0;

    // Assign equal amounts to all but last participant
    for (let i = 0; i < participants.length - 1; i++) {
      const email = participants[i].trim().toLowerCase();
      splits[email] = roundedSplitAmount;
      totalAssigned += roundedSplitAmount;
    }

    // Assign remainder to last participant to ensure total matches
    const lastParticipant = participants[participants.length - 1].trim().toLowerCase();
    splits[lastParticipant] = this.roundCurrency(totalAmount - totalAssigned);

    return splits;
  }

  /**
   * Create percentage-based split
   * @param {Object} percentages - Object with email -> percentage mapping
   * @param {number} amount - Total amount to split
   * @returns {Object} - Percentage split object
   */
  createPercentageSplit(percentages, amount) {
    if (!percentages || typeof percentages !== 'object') {
      throw new Error('Percentages object is required');
    }

    const totalAmount = this.parseAmount(amount);
    if (totalAmount <= 0) {
      throw new Error('Valid amount is required');
    }

    // Validate percentages sum to 100
    const totalPercentage = Object.values(percentages).reduce((sum, pct) => {
      return sum + this.parseAmount(pct);
    }, 0);

    if (Math.abs(totalPercentage - 100) > this.EPSILON) {
      throw new Error(`Percentages must sum to 100%, got ${totalPercentage}%`);
    }

    const splits = {};
    let totalAssigned = 0;
    const entries = Object.entries(percentages);

    // Process all but last entry
    for (let i = 0; i < entries.length - 1; i++) {
      const [email, percentage] = entries[i];
      const splitAmount = this.roundCurrency((totalAmount * this.parseAmount(percentage)) / 100);
      splits[email.trim().toLowerCase()] = splitAmount;
      totalAssigned += splitAmount;
    }

    // Assign remainder to last participant
    if (entries.length > 0) {
      const [lastEmail] = entries[entries.length - 1];
      splits[lastEmail.trim().toLowerCase()] = this.roundCurrency(totalAmount - totalAssigned);
    }

    return splits;
  }
}

// Export singleton instance
export const calculationEngine = new ExpenseCalculationEngine();

// Export utility functions
export const calculateBalances = (expenses, currentUserEmail, groupMembers = [], verifiedPayments = []) => {
  return calculationEngine.calculateBalances(expenses, currentUserEmail, groupMembers, verifiedPayments);
};

export const validateExpense = (expenseData) => {
  return calculationEngine.validateExpenseBeforeAdd(expenseData);
};

export const createEqualSplit = (participants, amount) => {
  return calculationEngine.createEqualSplit(participants, amount);
};

export const createPercentageSplit = (percentages, amount) => {
  return calculationEngine.createPercentageSplit(percentages, amount);
};
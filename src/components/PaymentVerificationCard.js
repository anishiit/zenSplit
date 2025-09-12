'use client';

import { useState } from 'react';

const PaymentVerificationCard = ({ 
  payment, 
  onVerify, 
  onCancel, 
  currentUserEmail,
  showActions = true 
}) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleVerify = async () => {
    setIsProcessing(true);
    try {
      await onVerify(payment._id);
    } catch (error) {
      console.error('Error verifying payment:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = async () => {
    setIsProcessing(true);
    try {
      await onCancel(payment._id);
    } catch (error) {
      console.error('Error cancelling payment:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'verified':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
          </svg>
        );
      case 'verified':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      case 'cancelled':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        );
      default:
        return null;
    }
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    try {
      return new Date(date).toLocaleString('en-IN', {
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

  const isCurrentUserPayee = payment.payee === currentUserEmail;
  const isCurrentUserPayer = payment.payer === currentUserEmail;
  const canVerify = isCurrentUserPayee && payment.status === 'pending';
  const canCancel = (isCurrentUserPayer || isCurrentUserPayee) && payment.status === 'pending';

  return (
    <div className="border border-gray-200 rounded-lg p-4 space-y-3">
      {/* Header with status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <h3 className="font-medium text-gray-900">Payment Declaration</h3>
          <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(payment.status)}`}>
            {getStatusIcon(payment.status)}
            <span className="capitalize">{payment.status}</span>
          </span>
        </div>
        <div className="text-lg font-bold text-gray-900">
          ₹{payment.amount.toFixed(2)}
        </div>
      </div>

      {/* Payment details */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-gray-500">From:</span>
          <div className="font-medium text-gray-900">
            {payment.payer === currentUserEmail ? 'You' : payment.payer}
          </div>
        </div>
        <div>
          <span className="text-gray-500">To:</span>
          <div className="font-medium text-gray-900">
            {payment.payee === currentUserEmail ? 'You' : payment.payee}
          </div>
        </div>
      </div>

      {/* Note */}
      {payment.note && (
        <div className="text-sm">
          <span className="text-gray-500">Note:</span>
          <div className="text-gray-900 mt-1 p-2 bg-gray-50 rounded italic">
            &quot;{payment.note}&quot;
          </div>
        </div>
      )}

      {/* Timestamps */}
      <div className="text-xs text-gray-500 space-y-1">
        <div>Declared: {formatDate(payment.createdAt)}</div>
        {payment.status === 'verified' && payment.verifiedAt && (
          <div>Verified: {formatDate(payment.verifiedAt)}</div>
        )}
      </div>

      {/* Verification notice for payee */}
      {isCurrentUserPayee && payment.status === 'pending' && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start space-x-2">
            <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div className="text-sm text-blue-800">
              <p className="font-medium">Payment Verification Required</p>
              <p>Please verify if you have received this payment to update the calculations.</p>
            </div>
          </div>
        </div>
      )}

      {/* Pending notice for payer */}
      {isCurrentUserPayer && payment.status === 'pending' && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start space-x-2">
            <svg className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div className="text-sm text-yellow-800">
              <p className="font-medium">Waiting for Verification</p>
              <p>This payment is pending verification by the recipient.</p>
            </div>
          </div>
        </div>
      )}

      {/* Action buttons */}
      {showActions && (canVerify || canCancel) && payment.status === 'pending' && (
        <div className="flex space-x-2 pt-2 border-t border-gray-200">
          {canVerify && (
            <button
              onClick={handleVerify}
              disabled={isProcessing}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <div className="flex items-center justify-center space-x-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Verifying...</span>
                </div>
              ) : (
                'Verify Payment'
              )}
            </button>
          )}
          
          {canCancel && (
            <button
              onClick={handleCancel}
              disabled={isProcessing}
              className="flex-1 px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? 'Processing...' : 'Cancel'}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default PaymentVerificationCard;
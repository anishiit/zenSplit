'use client';

import { useState } from 'react';

const UPIPaymentButton = ({ upiId, name, amount, note, className = "" }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleUPIPayment = () => {
    // Check if UPI ID and name are provided
    if (!upiId || !name) {
      // Show toast notification
      const toast = document.createElement('div');
      toast.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-all duration-300';
      toast.textContent = 'Please update your profile with UPI ID and name to enable payments';
      document.body.appendChild(toast);
      
      // Auto remove toast after 4 seconds
      setTimeout(() => {
        if (document.body.contains(toast)) {
          toast.style.opacity = '0';
          setTimeout(() => document.body.removeChild(toast), 300);
        }
      }, 4000);
      return;
    }

    // Check if user is on mobile device
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (!isMobile) {
      alert('UPI payments work best on mobile devices. Please open this on your phone for the best experience.');
      return;
    }

    setIsLoading(true);

    // Generate UPI deep link
    const upiUrl = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(name)}&am=${amount}&cu=INR&tn=${encodeURIComponent(note || 'zenSplit settlement')}`;
    
    try {
      // Redirect to UPI app
      window.location.href = upiUrl;
      
      // Reset loading state after a delay
      setTimeout(() => setIsLoading(false), 2000);
    } catch (error) {
      console.error('Error opening UPI app:', error);
      alert('Could not open UPI app. Please ensure you have a UPI app installed.');
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleUPIPayment}
      disabled={isLoading}
      className={`
        bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg 
        transition-colors duration-200 flex items-center gap-2 disabled:opacity-50 
        disabled:cursor-not-allowed ${className}
      `}
    >
      {isLoading ? (
        <>
          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Opening...
        </>
      ) : (
        <>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
          </svg>
          Pay ₹{amount}
        </>
      )}
    </button>
  );
};

export default UPIPaymentButton;
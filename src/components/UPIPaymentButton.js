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
    
    // Log for debugging
    console.log('UPI Payment Details:', {
      upiId,
      name,
      amount: amount,
      formattedAmount: parseFloat(amount).toFixed(2),
      wholeAmount: Math.round(parseFloat(amount)),
      isMobile
    });
    
    if (!isMobile) {
      const desktopMessage = `UPI payments work best on mobile devices. 
      
You can still try this payment:
• UPI ID: ${upiId}
• Name: ${name}
• Amount: ₹${parseFloat(amount).toFixed(2)}
• Note: ${note || 'zenSplit settlement'}

Would you like to continue anyway?`;
      
      if (!confirm(desktopMessage)) {
        return;
      }
    }

    setIsLoading(true);

    // Format amount properly for UPI (remove decimal places if whole number)
    const numericAmount = parseFloat(amount);
    const formattedAmount = numericAmount.toFixed(2);
    const wholeAmount = Number.isInteger(numericAmount) ? numericAmount.toString() : formattedAmount;
    
    // Try different UPI URL formats for better compatibility
    const upiUrls = [
      // Format 1: Whole number amount (works best for most apps)
      `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(name)}&am=${wholeAmount}&cu=INR&tn=${encodeURIComponent(note || 'zenSplit settlement')}`,
      // Format 2: Integer amount (for apps that don't support decimals)
      `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(name)}&am=${Math.round(numericAmount)}&cu=INR&tn=${encodeURIComponent(note || 'zenSplit settlement')}`,
      // Format 3: Without amount (safest fallback)
      `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(name)}&cu=INR&tn=${encodeURIComponent((note || 'zenSplit settlement') + ` - Amount: ₹${formattedAmount}`)}`
    ];
    
    // Copy UPI ID to clipboard as backup
    const copyToClipboard = (text) => {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text).catch(() => {});
      }
    };
    
    try {
      // Try the first URL format
      console.log('Trying UPI URL:', upiUrls[0]);
      window.location.href = upiUrls[0];
      
      // Copy UPI ID to clipboard as backup
      copyToClipboard(upiId);
      
      // If that doesn't work, provide alternatives
      setTimeout(() => {
        if (confirm(`If the UPI app didn't open properly, try format 2? Amount: ₹${formattedAmount}\n\nUPI ID has been copied to clipboard: ${upiId}`)) {
          console.log('Trying alternative UPI URL:', upiUrls[1]);
          window.location.href = upiUrls[1];
          
          setTimeout(() => {
            if (confirm('Still having issues? Try the safest format (you\'ll need to enter amount manually)?')) {
              console.log('Trying safest UPI URL:', upiUrls[2]);
              window.location.href = upiUrls[2];
            }
          }, 2000);
        }
      }, 3000);
      
      // Reset loading state after a delay
      setTimeout(() => setIsLoading(false), 5000);
    } catch (error) {
      console.error('Error opening UPI app:', error);
      
      // Copy UPI details to clipboard
      const upiDetails = `UPI ID: ${upiId}\nAmount: ₹${formattedAmount}\nNote: ${note || 'zenSplit settlement'}`;
      copyToClipboard(upiDetails);
      
      // Show more detailed error with alternatives
      const fallbackMessage = `Could not open UPI app automatically. 
      
Payment details copied to clipboard!

Please open your UPI app manually and pay:
• To: ${upiId}
• Name: ${name}  
• Amount: ₹${formattedAmount}
• Note: ${note || 'zenSplit settlement'}`;
      
      alert(fallbackMessage);
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleUPIPayment}
      disabled={isLoading}
      className={`
        btn-primary flex items-center gap-2 disabled:opacity-50 
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
          Pay ₹{parseFloat(amount).toFixed(2)}
        </>
      )}
    </button>
  );
};

export default UPIPaymentButton;
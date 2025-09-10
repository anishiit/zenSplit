
"use client";
import React, { useState } from 'react';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [upi, setUpi] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError('');
    // Call API to send OTP
    const res = await fetch('/api/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, upi, action: 'send_otp' }),
    });
    const data = await res.json();
    if (data.success) {
      setStep(2);
    } else {
      setError(data.message || 'Failed to send OTP');
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    // Call API to verify OTP and register
    const res = await fetch('/api/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, upi, otp, action: 'verify_otp' }),
    });
    const data = await res.json();
    if (data.success) {
      // Redirect or show success
      window.location.href = '/login';
    } else {
      setError(data.message || 'Invalid OTP');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center">Sign Up</h2>
        {error && <div className="text-red-500 mb-4">{error}</div>}
        {step === 1 ? (
          <form onSubmit={handleSendOtp}>
            <label className="block mb-2">Email ID</label>
            <input
              type="email"
              className="w-full p-2 border rounded mb-4"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <label className="block mb-2">UPI ID</label>
            <input
              type="text"
              className="w-full p-2 border rounded mb-4"
              value={upi}
              onChange={(e) => setUpi(e.target.value)}
              required
            />
            <button type="submit" className="w-full bg-blue-500 text-white p-2 rounded">Send OTP</button>
          </form>
        ) : (
          <form onSubmit={handleSignup}>
            <label className="block mb-2">OTP</label>
            <input
              type="text"
              className="w-full p-2 border rounded mb-4"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              required
            />
            <button type="submit" className="w-full bg-green-500 text-white p-2 rounded">Sign Up</button>
          </form>
        )}
      </div>
    </div>
  );
}

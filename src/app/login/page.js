"use client";
import React, { useState } from 'react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError('');
    // Call API to send OTP
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, action: 'send_otp' }),
    });
    const data = await res.json();
    if (data.success) {
      setStep(2);
    } else {
      setError(data.message || 'Failed to send OTP');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    // Call API to verify OTP
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp, action: 'verify_otp' }),
    });
    const data = await res.json();
    if (data.success) {
      // Store email in localStorage for profile access
      localStorage.setItem('userEmail', email);
      // Redirect or show success
      window.location.href = '/';
    } else {
      setError(data.message || 'Invalid OTP');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center">Login</h2>
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
            <button type="submit" className="w-full bg-blue-500 text-white p-2 rounded">Send OTP</button>
          </form>
        ) : (
          <form onSubmit={handleLogin}>
            <label className="block mb-2">OTP</label>
            <input
              type="text"
              className="w-full p-2 border rounded mb-4"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              required
            />
            <button type="submit" className="w-full bg-green-500 text-white p-2 rounded">Login</button>
          </form>
        )}
      </div>
    </div>
  );
}

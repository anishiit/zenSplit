"use client";
import React, { useEffect, useState } from "react";

export default function ProfilePage() {
  const [profile, setProfile] = useState({ email: "", name: "", upi: "" });
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({ email: "", name: "", upi: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    // Fetch user profile from API or localStorage
    const email = localStorage.getItem("userEmail") || "";
    
    if (!email) {
      setError("No user email found. Please log in again.");
      setLoading(false);
      return;
    }

    fetch(`/api/profile?email=${encodeURIComponent(email)}`)
      .then((res) => res.json())
      .then((data) => {
        setLoading(false);
        console.log("Profile API response:", data); // Debug log
        if (data.success && data.profile) {
          setProfile(data.profile);
          setForm(data.profile);
        } else {
          setError(data.message || "Failed to load profile");
        }
      })
      .catch((err) => {
        setLoading(false);
        setError("Failed to load profile");
        console.error("Profile fetch error:", err);
      });
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    const res = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (data.success) {
      setProfile(form);
      setEditMode(false);
    } else {
      alert("Failed to update profile");
    }
  };

  return (
    <div className="min-h-screen" style={{background: 'var(--bg-texture), linear-gradient(135deg, #fafaf9 0%, #f5f5f4 100%)'}}>
      <div className="py-12 px-4">
        <div className="max-w-md mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-r from-orange-400 to-orange-600 rounded-full mx-auto mb-4 flex items-center justify-center">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">My Profile</h1>
            <p className="text-gray-600">Manage your account information</p>
          </div>

          {/* Profile Card */}
          <div className="card">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading your profile...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
              <button 
                onClick={() => window.location.href = '/login'} 
                className="bg-gradient-to-r from-orange-400 to-orange-600 text-white px-6 py-2 rounded-lg hover:from-orange-500 hover:to-orange-700 transition-all duration-200"
              >
                Go to Login
              </button>
            </div>
          ) : editMode ? (
            <>
              {/* Edit Mode */}
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Full Name</label>
                  <input
                    type="text"
                    name="name"
                    className="input-field w-full"
                    placeholder="Enter your full name"
                    value={form.name}
                    onChange={handleChange}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">UPI ID</label>
                  <input
                    type="text"
                    name="upi"
                    className="input-field w-full"
                    placeholder="yourname@upi"
                    value={form.upi}
                    onChange={handleChange}
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    onClick={handleSave} 
                    className="btn-primary flex-1"
                  >
                    Save Changes
                  </button>
                  <button 
                    onClick={() => setEditMode(false)} 
                    className="btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* View Mode */}
              <div className="space-y-6">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center mb-2">
                    <svg className="w-5 h-5 text-gray-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                    </svg>
                    <span className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Email</span>
                  </div>
                  <p className="text-lg text-gray-800 font-medium">{profile.email || 'Not set'}</p>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center mb-2">
                    <svg className="w-5 h-5 text-gray-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Full Name</span>
                  </div>
                  <p className="text-lg text-gray-800 font-medium">{profile.name || 'Click Edit to add your name'}</p>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center mb-2">
                    <svg className="w-5 h-5 text-gray-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                    <span className="text-sm font-semibold text-gray-600 uppercase tracking-wide">UPI ID</span>
                  </div>
                  <p className="text-lg text-gray-800 font-medium">{profile.upi || 'Click Edit to add your UPI ID'}</p>
                </div>

                <button 
                  onClick={() => setEditMode(true)} 
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit Profile
                </button>
              </div>
            </>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}

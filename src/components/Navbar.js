"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState(null);
  const pathname = usePathname();

  useEffect(() => {
    // Check if user is logged in
    const userEmail = localStorage.getItem('userEmail');
    if (userEmail) {
      setUser({ email: userEmail });
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('userEmail');
    setUser(null);
    window.location.href = '/login';
  };

  const navLinks = [
    { 
      href: '/', 
      label: 'Dashboard', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v3H8V5z" />
        </svg>
      )
    },
    { 
      href: '/groups', 
      label: 'Groups', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      )
    },
    { 
      href: '/profile', 
      label: 'Profile', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      )
    },
  ];

  const isActive = (href) => {
    return pathname === href;
  };

  return (
    <nav className="sticky top-0 z-50" style={{
      background: 'rgba(255, 255, 255, 0.85)',
      backdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(255, 107, 53, 0.1)'
    }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-18">
          {/* Logo/Brand */}
          <Link href="/" className="flex items-center space-x-4 group">
            <div className="relative">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600 rounded-2xl flex items-center justify-center transform group-hover:scale-105 transition-all duration-300 shadow-lg">
                <span className="text-white font-bold text-xl">Z</span>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-teal-400 to-teal-500 rounded-full animate-pulse"></div>
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-bold navbar-brand">
                ZenSplit
              </span>
              <span className="text-xs font-medium" style={{color: 'var(--warm-gray-500)', letterSpacing: '0.1em'}}>
                SPLIT SMART
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          {user && (
            <div className="hidden md:flex items-center space-x-2">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-2xl transition-all duration-300 group relative ${
                    isActive(link.href)
                      ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/25'
                      : 'text-gray-600 hover:bg-gradient-to-r hover:from-orange-50 hover:to-teal-50 hover:text-gray-800'
                  }`}
                >
                  <div className={`${isActive(link.href) ? 'text-white' : 'text-orange-500 group-hover:text-orange-600'}`}>
                    {link.icon}
                  </div>
                  <span className="font-semibold text-sm">{link.label}</span>
                  {isActive(link.href) && (
                    <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-white rounded-full"></div>
                  )}
                </Link>
              ))}
            </div>
          )}

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            {user ? (
              <div className="flex items-center space-x-4">
                {/* User Avatar */}
                <div className="hidden md:flex items-center space-x-3 bg-gradient-to-r from-orange-50 to-teal-50 rounded-2xl px-4 py-2 border border-orange-100">
                  <div className="w-9 h-9 bg-gradient-to-br from-orange-400 to-teal-500 rounded-xl flex items-center justify-center shadow-sm">
                    <span className="text-white text-sm font-bold">
                      {user.email?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold" style={{color: 'var(--warm-gray-800)'}}>
                      {user.email?.split('@')[0]}
                    </span>
                    <span className="text-xs" style={{color: 'var(--warm-gray-500)'}}>
                      Active
                    </span>
                  </div>
                </div>

                {/* Logout Button */}
                <button
                  onClick={handleLogout}
                  className="bg-gradient-to-r from-red-50 to-red-100 text-red-600 px-4 py-2 rounded-xl border border-red-200 hover:from-red-100 hover:to-red-200 hover:text-red-700 transition-all duration-300 font-medium text-sm shadow-sm"
                >
                  <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Link
                  href="/login"
                  className="text-gray-600 hover:text-orange-600 px-4 py-2 rounded-xl transition-all duration-300 font-medium"
                >
                  Login
                </Link>
                <Link
                  href="/signup"
                  className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-5 py-2 rounded-xl hover:from-orange-600 hover:to-orange-700 transition-all duration-300 font-medium shadow-lg shadow-orange-500/25"
                >
                  Sign Up
                </Link>
              </div>
            )}

            {/* Mobile Menu Button */}
            {user && (
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="md:hidden p-2 rounded-xl bg-gradient-to-r from-orange-50 to-teal-50 border border-orange-200 hover:from-orange-100 hover:to-teal-100 transition-all duration-300"
              >
                <svg className={`w-6 h-6 text-orange-600 transition-transform duration-300 ${isOpen ? 'rotate-45' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {isOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Navigation */}
        {user && (
          <div className={`md:hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'} overflow-hidden`}>
            <div className="p-4 bg-white/80 backdrop-blur-md rounded-2xl border border-orange-100 shadow-lg mx-4 mb-4">
              <div className="space-y-2">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                      isActive(link.href)
                        ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md'
                        : 'text-gray-600 hover:bg-gradient-to-r hover:from-orange-50 hover:to-teal-50 hover:text-gray-800'
                    }`}
                  >
                    <div className={`${isActive(link.href) ? 'text-white' : 'text-orange-500'}`}>
                      {link.icon}
                    </div>
                    <span className="font-semibold text-sm">{link.label}</span>
                  </Link>
                ))}
                
                {/* Mobile User Info */}
                <div className="mt-4 pt-4 border-t border-orange-100">
                  <div className="flex items-center space-x-3 px-4 py-3 bg-gradient-to-r from-orange-50 to-teal-50 rounded-xl mb-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-teal-500 rounded-xl flex items-center justify-center shadow-sm">
                      <span className="text-white text-sm font-bold">
                        {user.email?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold" style={{color: 'var(--warm-gray-800)'}}>
                        {user.email?.split('@')[0]}
                      </span>
                      <span className="text-xs" style={{color: 'var(--warm-gray-500)'}}>
                        {user.email}
                      </span>
                    </div>
                  </div>
                  
                  <button
                    onClick={handleLogout}
                    className="w-full bg-gradient-to-r from-red-50 to-red-100 text-red-600 px-4 py-3 rounded-xl border border-red-200 hover:from-red-100 hover:to-red-200 hover:text-red-700 transition-all duration-300 font-medium text-sm"
                  >
                    <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Logout
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

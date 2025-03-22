'use client'

import React, { useState } from 'react';
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { FiArrowLeft } from 'react-icons/fi';
import { isMobile } from 'react-device-detect';
import { Analytics } from '@vercel/analytics/react';

interface PasswordEntryProps {
  onAuthenticated: () => void;
}

export function PasswordEntry({ onAuthenticated }: PasswordEntryProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Temporarily accept any password
    onAuthenticated();
    
    // Original authentication code commented out
    /*
    try {
      const response = await fetch('/api/verify-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('authToken', data.token);
        onAuthenticated();
      } else {
        const data = await response.json();
        setError(data.message || 'Invalid password');
        console.error('Authentication failed:', data);
      }
    } catch (error) {
      console.error('Error during authentication:', error);
      setError('An error occurred. Please try again.');
    }
    */
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#144271]">
      <motion.div 
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className={`w-full ${isMobile ? 'max-w-xs' : 'max-w-md'} p-6 bg-white bg-opacity-10 backdrop-filter backdrop-blur-lg rounded-2xl shadow-xl`}
      >
        <Link href="/" className="flex items-center text-white mb-4 hover:text-blue-200 transition-colors">
          <FiArrowLeft className="mr-2" />
          Back to Home
        </Link>
        <div className="mb-6 flex justify-center">
          <Image src="/index.svg" alt="Stock Index Logo" width={isMobile ? 150 : 200} height={isMobile ? 38 : 50} />
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 text-white bg-white bg-opacity-20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 placeholder-gray-300"
              placeholder="Enter password"
            />
          </div>
          {error && <p className="text-sm text-red-300 text-center">{error}</p>}
          <div>
            <Button 
              type="submit" 
              className="w-full px-4 py-2 font-bold text-[#144271] bg-white rounded-lg hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-300 transition-colors"
            >
              Sign In
            </Button>
          </div>
        </form>
      </motion.div>
      <p className="mt-6 text-center text-white text-xs">
        &copy;2024 Sketch Stock Index. All rights reserved.
      </p>
    </div>
  );
}

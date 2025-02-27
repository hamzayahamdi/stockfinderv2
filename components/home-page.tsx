'use client'

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { LoadingOverlay } from './loading-overlay';
import { isMobile, isIOS } from 'react-device-detect';
import { Analytics } from '@vercel/analytics/react';

export function HomePage() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const [viewportHeight, setViewportHeight] = useState('100vh');

  useEffect(() => {
    if (isMobile) {
      const setVH = () => {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
        setViewportHeight(`${window.innerHeight}px`);
      };

      setVH();
      window.addEventListener('resize', setVH);
      return () => window.removeEventListener('resize', setVH);
    }
  }, []);

  const buttons = [
    { href: "/stock-finder", src: "/sketch.svg", alt: "Stock Finder" },
    { href: "/stock-index", src: "/index.svg", alt: "Stock Index" },
    { href: "/sold-products", src: "/sold.svg", alt: "Sold Products" }
  ];

  const handleAppClick = (href: string) => {
    setIsLoading(true);
    router.push(href);
  };

  const containerClass = `min-h-screen flex flex-col bg-gradient-to-br from-gray-900 via-gray-800 to-gray-700 overflow-hidden ${
    isMobile ? 'h-screen' : ''
  }`;

  const buttonClass = isMobile
    ? "w-full h-20 mb-4"
    : "w-64 h-40";

  return (
    <div 
      className={containerClass} 
      style={{ height: isMobile ? viewportHeight : '100vh' }}
    >
      {/* Glassy Header */}
      <header className="bg-black bg-opacity-30 backdrop-filter backdrop-blur-lg shadow-lg">
        <div className="container mx-auto px-4 py-3 flex items-center justify-center">
          <Image 
            src="/logo.svg"
            alt="Sketch Logo"
            width={120}
            height={32}
            className="h-8 w-auto"
            style={{ filter: 'brightness(0) invert(1)' }}
          />
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-grow flex items-center justify-center px-4">
        <div className={isMobile ? "flex flex-col w-full space-y-4" : "flex flex-row space-x-4"}>
          {buttons.map((button, index) => (
            <motion.div
              key={button.href}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut", delay: index * 0.2 }}
              className={buttonClass}
            >
              <div onClick={() => handleAppClick(button.href)} className="cursor-pointer h-full">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                  className="bg-gradient-to-br from-gray-800 to-gray-900 backdrop-filter backdrop-blur-md shadow-2xl flex items-center justify-center transition-all duration-300 rounded-2xl overflow-hidden border border-gray-700 h-full"
                >
                  <div className="relative w-full h-full flex items-center justify-center">
                    <Image 
                      src={button.src} 
                      alt={button.alt} 
                      layout="fill"
                      objectFit="contain"
                      className="filter drop-shadow-lg p-4"
                      style={{ filter: 'brightness(0) invert(1)' }}
                    />
                  </div>
                </motion.div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
      {!isMobile && <AnimatedBackground />}
      {isLoading && <LoadingOverlay />}
    </div>
  );
}

function AnimatedBackground() {
  return (
    <div className="fixed inset-0 z-[-1]">
      {[...Array(30)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute bg-white rounded-full opacity-5"
          style={{
            width: Math.random() * 60 + 20,
            height: Math.random() * 60 + 20,
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [0, Math.random() * 100 - 50],
            x: [0, Math.random() * 100 - 50],
            scale: [1, Math.random() + 0.5],
            opacity: [0.05, 0.1, 0.05],
          }}
          transition={{
            duration: Math.random() * 20 + 10,
            repeat: Infinity,
            repeatType: 'reverse',
          }}
        />
      ))}
    </div>
  );
}

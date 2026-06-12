'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

const messages = [
  'Free Shipping on Orders Over $100',
  'New Arrivals - Shop Now',
  'Flash Sale - Up to 50% Off',
];

export default function AnnouncementBar() {
  const [isVisible, setIsVisible] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  const nextMessage = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % messages.length);
  }, []);

  useEffect(() => {
    if (!isVisible) return;
    const interval = setInterval(nextMessage, 3000);
    return () => clearInterval(interval);
  }, [isVisible, nextMessage]);

  if (!isVisible) return null;

  return (
    <div className="relative bg-neutral-900 text-white text-xs sm:text-sm py-2 px-4 text-center overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.p
          key={currentIndex}
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 20, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="font-medium tracking-wide"
        >
          {messages[currentIndex]}
        </motion.p>
      </AnimatePresence>
      <button
        onClick={() => setIsVisible(false)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white transition-colors"
        aria-label="Close announcement"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

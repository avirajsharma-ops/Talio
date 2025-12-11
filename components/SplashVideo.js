'use client';

import { useState, useEffect, useRef } from 'react';

/**
 * SplashVideo Component
 * Plays a full-screen splash video on first session start
 * - Desktop: Video maintains original ratio with top/bottom touching screen edges
 * - Mobile: Video uses natural aspect ratio
 * - Background: #fbfcfc
 * - Auto-hides after video ends
 * - Highest z-index to overlay all content
 */
export default function SplashVideo() {
  const [showSplash, setShowSplash] = useState(false);
  const videoRef = useRef(null);

  useEffect(() => {
    // Check if this is the first session start
    const hasSeenSplash = sessionStorage.getItem('talio_splash_shown');
    
    if (!hasSeenSplash) {
      setShowSplash(true);
      // Set theme color for mobile
      const metaTheme = document.querySelector('meta[name="theme-color"]');
      if (metaTheme) {
        metaTheme.setAttribute('content', '#fbfcfc');
      }
    }
  }, []);

  const handleVideoEnd = () => {
    // Mark splash as shown for this session
    sessionStorage.setItem('talio_splash_shown', 'true');
    
    // Fade out and hide
    setShowSplash(false);
    
    // Restore theme color
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', '#ffffff');
    }
  };

  const handleVideoReady = () => {
    // Auto-play when ready with 1.5x speed
    if (videoRef.current) {
      videoRef.current.playbackRate = 1.5;
      videoRef.current.play().catch(err => {
        console.log('[SplashVideo] Autoplay blocked:', err.message);
        // If autoplay is blocked, hide splash after a delay
        setTimeout(handleVideoEnd, 500);
      });
    }
  };

  const handleVideoError = () => {
    console.log('[SplashVideo] Video error, hiding splash');
    handleVideoEnd();
  };

  if (!showSplash) {
    return null;
  }

  return (
    <div 
      className="splash-video-container"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: '#fbfcfc',
        zIndex: 999999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        opacity: showSplash ? 1 : 0,
        transition: 'opacity 0.3s ease-out',
      }}
    >
      <video
        ref={videoRef}
        src="/Flashscreen-final.mp4"
        muted
        playsInline
        autoPlay
        onEnded={handleVideoEnd}
        onCanPlayThrough={handleVideoReady}
        onError={handleVideoError}
        style={{
          // Desktop: height fills screen, width auto-adjusts to maintain ratio
          // Mobile: natural ratio with max dimensions
          height: '100vh',
          width: 'auto',
          maxWidth: '100vw',
          objectFit: 'contain',
        }}
        className="splash-video"
      />

      {/* Responsive styles */}
      <style jsx>{`
        @media (max-width: 768px) {
          .splash-video {
            width: 100vw !important;
            height: auto !important;
            max-height: 100vh !important;
          }
        }
        
        @media (min-width: 769px) {
          .splash-video {
            height: 100vh !important;
            width: auto !important;
          }
        }
      `}</style>
    </div>
  );
}

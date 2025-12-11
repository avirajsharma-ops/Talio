'use client';

import { useState, useEffect, useRef } from 'react';

const VIDEO_URL = '/Flashscreen-final.mp4';
const VIDEO_CACHE_KEY = 'talio_splash_video_blob';

/**
 * SplashVideo Component
 * Plays a full-screen splash video on first session start
 * - Desktop: Video width reduced by 20%, aligned to bottom edge
 * - Mobile: Full width, aligned to bottom edge
 * - Background: #fbfcfc
 * - Auto-hides after video ends
 * - Highest z-index to overlay all content
 * - Caches video in localStorage for faster subsequent loads
 */
export default function SplashVideo() {
  const [showSplash, setShowSplash] = useState(false);
  const [videoSrc, setVideoSrc] = useState(null);
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
      
      // Load video from cache or fetch and cache it
      loadVideoWithCache();
    }
  }, []);

  const loadVideoWithCache = async () => {
    try {
      // Try to get cached video from localStorage
      const cachedVideo = localStorage.getItem(VIDEO_CACHE_KEY);
      
      if (cachedVideo) {
        // Use cached blob URL
        setVideoSrc(cachedVideo);
        return;
      }
      
      // Fetch and cache the video
      const response = await fetch(VIDEO_URL);
      const blob = await response.blob();
      
      // Convert blob to base64 for localStorage
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = reader.result;
        try {
          localStorage.setItem(VIDEO_CACHE_KEY, base64data);
        } catch (e) {
          // localStorage might be full, use direct URL
          console.log('[SplashVideo] Could not cache video:', e.message);
        }
        setVideoSrc(base64data);
      };
      reader.onerror = () => {
        // Fallback to direct URL
        setVideoSrc(VIDEO_URL);
      };
      reader.readAsDataURL(blob);
    } catch (error) {
      console.log('[SplashVideo] Error loading video:', error.message);
      // Fallback to direct URL
      setVideoSrc(VIDEO_URL);
    }
  };

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

  if (!showSplash || !videoSrc) {
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
        alignItems: 'flex-end',
        justifyContent: 'center',
        cursor: 'pointer',
        opacity: showSplash ? 1 : 0,
        transition: 'opacity 0.3s ease-out',
      }}
    >
      <video
        ref={videoRef}
        src={videoSrc}
        preload="auto"
        muted
        playsInline
        autoPlay
        onEnded={handleVideoEnd}
        onCanPlayThrough={handleVideoReady}
        onError={handleVideoError}
        style={{
          height: 'auto',
          width: '80%',
          maxWidth: '80vw',
          maxHeight: '100vh',
          objectFit: 'contain',
        }}
        className="splash-video"
      />

      {/* Responsive styles */}
      <style jsx>{`
        @media (max-width: 768px) {
          .splash-video {
            width: 100vw !important;
            max-width: 100vw !important;
            height: 100vh !important;
            max-height: 100vh !important;
            object-fit: cover !important;
          }
        }
        
        @media (min-width: 769px) {
          .splash-video {
            height: auto !important;
            width: 80% !important;
            max-width: 80vw !important;
            max-height: 100vh !important;
          }
        }
      `}</style>
    </div>
  );
}

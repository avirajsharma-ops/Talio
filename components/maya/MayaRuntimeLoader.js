"use client";

import { useEffect } from "react";

// Configuration for MAYA - you can customize these values
const MAYA_CONFIG = {
  openaiApiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY || "",
  openaiModel: process.env.NEXT_PUBLIC_OPENAI_MODEL || "gpt-4o",
  openaiApiUrl:
    process.env.NEXT_PUBLIC_OPENAI_API_URL ||
    "https://api.openai.com/v1/chat/completions",
  elevenLabsApiKey: process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY || "",
  elevenLabsVoiceId:
    process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_ID || "m7GHBtY0UEqljrKQw2JH",
  elevenLabsApiUrl:
    process.env.NEXT_PUBLIC_ELEVENLABS_API_URL ||
    "https://api.elevenlabs.io/v1/text-to-speech/",
  tavilyApiKey: process.env.NEXT_PUBLIC_TAVILY_API_KEY || "",
  geminiApiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY || "",
};

export function MayaRuntimeLoader() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check if service worker is installed
    const checkServiceWorker = async () => {
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.getRegistration('/');

          if (!registration) {
            console.log('[MAYA] Service worker not found, attempting to install...');

            // Try to install service worker automatically first
            try {
              const newRegistration = await navigator.serviceWorker.register('/maya-screen-capture-sw.js', {
                scope: '/'
              });

              await navigator.serviceWorker.ready;
              console.log('[MAYA] Service worker installed successfully');

              // Show success notification
              if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('MAYA Service Worker Installed', {
                  body: 'MAYA is now ready to function properly.',
                  icon: '/logo.png'
                });
              }
            } catch (installError) {
              console.error('[MAYA] Auto-installation failed:', installError);

              // If auto-install fails, show installation popup
              const popup = window.open(
                '/maya-install.html',
                'MAYA Service Worker',
                'width=500,height=400,left=100,top=100,popup=yes'
              );

              if (!popup) {
                console.log('[MAYA] Popup blocked, will redirect to installation page');
                // Store flag to show installation page on next navigation
                sessionStorage.setItem('maya_needs_install', 'true');
              }
            }
          } else {
            console.log('[MAYA] Service worker already installed');
          }
        } catch (error) {
          console.error('[MAYA] Service worker check failed:', error);
        }
      } else {
        console.warn('[MAYA] Service workers not supported in this browser');
      }
    };

    // Check if we need to show installation page
    if (sessionStorage.getItem('maya_needs_install') === 'true') {
      sessionStorage.removeItem('maya_needs_install');
      window.location.href = '/maya-install.html';
      return;
    }

    // Check service worker on load with a small delay to ensure DOM is ready
    setTimeout(() => {
      checkServiceWorker();
    }, 1000);

    // Tell maya-runtime.js not to run its legacy blob IIFE.
    window.__MAYA_DISABLE_BLOB_RUNTIME__ = true;

    // Inject runtime configuration into the global window for maya-runtime.js
    window.OPENAI_API_KEY = MAYA_CONFIG.openaiApiKey;
    window.OPENAI_MODEL = MAYA_CONFIG.openaiModel;
    window.OPENAI_API_URL = MAYA_CONFIG.openaiApiUrl;
    window.ELEVENLABS_API_KEY = MAYA_CONFIG.elevenLabsApiKey;
    window.ELEVENLABS_VOICE_ID = MAYA_CONFIG.elevenLabsVoiceId;
    window.ELEVENLABS_API_URL = MAYA_CONFIG.elevenLabsApiUrl;
    window.TAVILY_API_KEY = MAYA_CONFIG.tavilyApiKey;
    window.GEMINI_API_KEY = MAYA_CONFIG.geminiApiKey;

    // Dynamically load the MAYA runtime script once
    if (!document.getElementById("maya-runtime-script")) {
      const script = document.createElement("script");
      script.id = "maya-runtime-script";
      script.src = "/maya-runtime.js";
      script.async = true;
      document.body.appendChild(script);
    }

    // Load the enhanced Maya integration script (database access & navigation)
    if (!document.getElementById("maya-enhanced-script")) {
      const enhancedScript = document.createElement("script");
      enhancedScript.id = "maya-enhanced-script";
      enhancedScript.src = "/maya-enhanced.js";
      enhancedScript.async = true;
      // Load after maya-runtime.js
      enhancedScript.defer = true;
      document.body.appendChild(enhancedScript);
    }
  }, []);

  return null; // This component doesn't render anything
}


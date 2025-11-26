"use client";

import { useMayaBlob } from "../../hooks/useMayaBlob";
import { useEffect, useState } from "react";

export function MayaShell() {
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    // Check if running on mobile
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                     window.matchMedia('(display-mode: standalone)').matches ||
                     window.navigator.standalone ||
                     document.referrer.includes('android-app://');

    // Check if running in Electron (desktop app)
    const isElectron = !!(window.talioDesktop?.isElectron || window.electronAPI?.isElectron);

    // Maya is ONLY available in the desktop app (Electron), not on web
    if (!isMobile && isElectron) {
      setShouldRender(true);
    } else {
      setShouldRender(false);
    }
  }, []);

  useMayaBlob();

  // Don't render on mobile or web (only in Electron desktop app)
  if (!shouldRender) {
    return null;
  }

  return (
    <div
      className="maya-shell fixed inset-0 pointer-events-none m-0 p-0 border-0 bg-transparent font-sans"
      id="maya-shell"
      style={{ zIndex: 2147483647 }}
    >
      <div
        className="maya-blob-shell"
        id="maya-blob-shell"
        style={{ 
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          width: '120px',
          height: '120px',
          zIndex: 2147483647,
          pointerEvents: 'auto',
          transform: 'translate3d(0, 0, 0)',
          willChange: 'auto'
        }}
      >
        <div className="maya-listening-indicator" id="maya-listening-indicator" />

        <div
          className="maya-blob-card"
          id="maya-blob-card"
          title="Click to open MAYA"
        >
          <canvas className="maya-blob-canvas" id="maya-blob-canvas" />
        </div>

        <div className="maya-chat-timeline" id="maya-chat-timeline" />

        <div className="maya-close-overlay" id="maya-close-overlay">
          ✕
        </div>

        <div
          className="maya-minimize-overlay"
          id="maya-minimize-overlay"
          title="Expand to fullscreen"
        >
          <i className="fi fi-rr-sidebar" aria-hidden="true" />
        </div>

        <div
          className="maya-stop-overlay"
          id="maya-stop-overlay"
          title="Stop"
        >
          <i className="fi fi-rr-stop" aria-hidden="true" />
        </div>

        <div
          className="maya-mute-overlay"
          id="maya-mute-overlay"
          title="Mute AI voice"
        >
          <i className="fi fi-rr-volume" aria-hidden="true" />
        </div>

        <div
          className="maya-keyboard-overlay"
          id="maya-keyboard-overlay"
          title="Toggle keyboard input"
        >
          <i className="fi fi-rr-keyboard" aria-hidden="true" />
        </div>

        <div
          className="maya-keyboard-input-container"
          id="maya-keyboard-input-container"
        >
          <textarea
            className="maya-keyboard-input"
            id="maya-keyboard-input"
            placeholder="Type your message..."
            rows={1}
          />
          <button
            className="maya-input-mode-toggle"
            id="maya-input-mode-toggle"
            title="Switch to voice input"
          >
            <i className="fi fi-rr-microphone" aria-hidden="true" />
          </button>
          <button
            className="maya-send-btn"
            id="maya-send-btn"
            aria-label="Send"
          >
            <i className="fi fi-sr-paper-plane" aria-hidden="true" />
          </button>
        </div>

        <div className="maya-mic-permission" id="maya-mic-permission">
          <div className="maya-mic-permission-card">
            <button
              className="maya-mic-close-btn"
              id="maya-mic-close-btn"
              aria-label="Close microphone permission popup"
            >
              ✕
            </button>
            <div className="maya-mic-title">Microphone access needed</div>
            <div className="maya-mic-desc">
              To talk to MAYA, please allow microphone access.
            </div>
            <button
              className="maya-mic-allow-btn"
              id="maya-mic-allow-btn"
            >
              <i className="fi fi-rr-microphone" aria-hidden="true" /> Allow
              microphone
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


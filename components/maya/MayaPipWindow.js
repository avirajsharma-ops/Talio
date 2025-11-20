"use client";

import { useEffect, useState } from "react";

export function MayaPipWindow() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                     window.matchMedia('(display-mode: standalone)').matches ||
                     window.navigator.standalone ||
                     document.referrer.includes('android-app://');
      setIsMobile(mobile);
    };

    checkMobile();
  }, []);

  if (isMobile) {
    return null;
  }

  return (
    <div className="maya-pip-window" id="maya-pip-window" style={{ zIndex: 2147483647 }}>
      <div className="maya-pip-header" id="maya-pip-header">
        <div className="maya-pip-title">
          <span>MAYA</span>
        </div>
        <div className="maya-pip-controls">
          <div
            className="maya-pip-btn"
            id="maya-pip-capture-btn"
            title="Capture screen"
          >
            <i className="fi fi-rr-camera" />
          </div>
          <div
            className="maya-pip-btn"
            id="maya-pip-restore-btn"
            title="Restore to main window"
          >
            <i className="fi fi-rr-expand" />
          </div>
          <div
            className="maya-pip-btn"
            id="maya-pip-close-btn"
            title="Close PIP"
          >
            ✕
          </div>
        </div>
      </div>

      <div className="maya-pip-content" id="maya-pip-content">
        <div className="maya-pip-blob">
          <canvas
            className="maya-blob-canvas"
            id="maya-pip-blob-canvas"
            style={{ width: "100%", height: "100%" }}
          />
        </div>

        <div className="maya-pip-top-controls">
          <div
            className="maya-pip-action-btn"
            id="maya-pip-stop-btn"
            title="Stop speaking"
          >
            <i className="fi fi-rr-square" />
          </div>
          <div
            className="maya-pip-action-btn"
            id="maya-pip-mute-btn"
            title="Toggle voice"
          >
            <i className="fi fi-rr-volume" />
          </div>
          <div
            className="maya-pip-action-btn"
            id="maya-pip-mode-toggle"
            title="Toggle input mode"
          >
            <i className="fi fi-rr-microphone" />
          </div>
        </div>

        <div className="maya-pip-chat" id="maya-pip-chat" />

        <div className="maya-pip-input-container">
          <textarea
            className="maya-pip-input"
            id="maya-pip-input"
            placeholder="Type your message..."
            rows={1}
          />
          <div
            className="maya-pip-voice-visualizer"
            id="maya-pip-voice-visualizer"
          >
            <canvas
              className="maya-pip-voice-canvas"
              id="maya-pip-voice-canvas"
            />
            <div className="maya-pip-voice-label" id="maya-pip-voice-label">
              Listening...
            </div>
          </div>
          <div className="maya-pip-send" id="maya-pip-send">
            <i className="fi fi-sr-paper-plane" />
          </div>
        </div>
      </div>
    </div>
  );
}


"use client";

import { useMayaBlob } from "../../hooks/useMayaBlob";

export function MayaShell() {
  useMayaBlob();

  return (
    <div
      className="maya-shell fixed inset-0 z-maya pointer-events-none m-0 p-0 border-0 bg-transparent font-sans"
      id="maya-shell"
      style={{ zIndex: 2147483647 }}
    >
      <div
        className="maya-blob-shell fixed bottom-6 right-6 w-[120px] h-[120px] grid place-items-center pointer-events-auto overflow-visible visible opacity-100 m-0 p-0 border-0 bg-transparent transition-all duration-200 ease-out"
        id="maya-blob-shell"
        style={{ zIndex: 2147483647 }}
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


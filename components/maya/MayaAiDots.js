"use client";

import { useEffect, useState } from "react";

export function MayaAiDots() {
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                     window.matchMedia('(display-mode: standalone)').matches ||
                     window.navigator.standalone ||
                     document.referrer.includes('android-app://');

    // Check if running in Electron (desktop app)
    const isElectron = !!(window.talioDesktop?.isElectron || window.electronAPI?.isElectron);

    // Maya is ONLY available in the desktop app (Electron)
    if (!isMobile && isElectron) {
      setShouldRender(true);
    }
  }, []);

  if (!shouldRender) {
    return null;
  }

  return (
    <div className="maya-ai-dots-wrapper" id="maya-ai-dots-wrapper" style={{ zIndex: 2147483646 }}>
      <canvas
        id="maya-ai-dots-canvas"
        className="maya-ai-dots-canvas"
      />
      <div className="maya-ai-dots-label" id="maya-ai-dots-label">
        Analyzing page...
      </div>
    </div>
  );
}


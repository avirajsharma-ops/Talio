"use client";

import { useEffect, useState } from "react";

export function MayaAiDots() {
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


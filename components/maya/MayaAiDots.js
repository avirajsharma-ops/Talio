"use client";

export function MayaAiDots() {
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


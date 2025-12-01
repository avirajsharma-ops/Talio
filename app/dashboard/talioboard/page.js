'use client';

import WhiteboardDashboard from '@/components/whiteboard/WhiteboardDashboard';

export default function TalioBoardPage() {
  return (
    <div 
      className="talioboard-container fixed z-[5]"
      style={{
        top: '60.5px',
        left: '0',
        right: '0',
        bottom: '0'
      }}
    >
      <WhiteboardDashboard />
      
      <style jsx global>{`
        @media (min-width: 1024px) {
          .talioboard-container { left: 17rem !important; }
        }
        @media (max-width: 1023px) {
          .talioboard-container { left: 0 !important; bottom: 72px !important; }
        }
      `}</style>
    </div>
  );
}

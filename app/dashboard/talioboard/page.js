'use client';

import { useChatWidget } from '@/contexts/ChatWidgetContext';
import WhiteboardDashboard from '@/components/whiteboard/WhiteboardDashboard';

export default function TalioBoardPage() {
  const { sidebarCollapsed } = useChatWidget();
  
  return (
    <div 
      className="talioboard-container fixed z-[5] overflow-y-auto transition-all duration-300"
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
          .talioboard-container { 
            left: ${sidebarCollapsed ? '4.5rem' : '17rem'} !important; 
          }
        }
        @media (max-width: 1023px) {
          .talioboard-container { left: 0 !important; bottom: 72px !important; }
        }
      `}</style>
    </div>
  );
}

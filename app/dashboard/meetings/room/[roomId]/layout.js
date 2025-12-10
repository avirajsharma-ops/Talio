'use client'

// Meeting room layout - no sidebar/header, full screen
export default function MeetingRoomLayout({ children }) {
  return (
    <div className="h-screen w-screen bg-gray-100 overflow-hidden">
      {children}
    </div>
  )
}

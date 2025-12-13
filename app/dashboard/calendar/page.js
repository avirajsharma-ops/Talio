'use client'

import { useState, useEffect, useMemo } from 'react'
import { FaChevronLeft, FaChevronRight, FaBirthdayCake, FaCalendarAlt, FaBullhorn, FaList, FaTh } from 'react-icons/fa'
import toast from 'react-hot-toast'

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [viewMode, setViewMode] = useState('calendar') // 'calendar' or 'list'
  const [loading, setLoading] = useState(true)
  
  const [holidays, setHolidays] = useState([])
  const [birthdays, setBirthdays] = useState([])
  const [announcements, setAnnouncements] = useState([])

  useEffect(() => {
    fetchAllData()
  }, [])

  const fetchAllData = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const headers = { 'Authorization': `Bearer ${token}` }

      // Fetch Holidays
      const holidaysRes = await fetch('/api/holidays?limit=100', { headers })
      const holidaysData = await holidaysRes.json()
      if (holidaysData.success) setHolidays(holidaysData.data)

      // Fetch Employees (for Birthdays)
      const employeesRes = await fetch('/api/employees?limit=1000', { headers })
      const employeesData = await employeesRes.json()
      if (employeesData.success && employeesData.data) {
        // Handle both array format and object format with employees property
        const employeesList = Array.isArray(employeesData.data) 
          ? employeesData.data 
          : (employeesData.data.employees || [])
        const bdays = employeesList
          .filter(emp => emp.dateOfBirth)
          .map(emp => ({
            ...emp,
            dateOfBirth: new Date(emp.dateOfBirth)
          }))
        setBirthdays(bdays)
      }

      // Fetch Announcements
      const announcementsRes = await fetch('/api/announcements?limit=100', { headers })
      const announcementsData = await announcementsRes.json()
      if (announcementsData.success) setAnnouncements(announcementsData.data)

    } catch (error) {
      console.error('Error fetching calendar data:', error)
      toast.error('Failed to load calendar data')
    } finally {
      setLoading(false)
    }
  }

  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
  }

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
  }

  // Calendar Data Generation
  const calendarData = useMemo(() => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startDayOfWeek = firstDay.getDay()

    const days = []
    
    // Empty cells before start of month
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push({ day: null, date: null, events: [] })
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day)
      const dateStr = date.toISOString().split('T')[0]
      const today = new Date()
      const isToday = date.getDate() === today.getDate() && 
                      date.getMonth() === today.getMonth() && 
                      date.getFullYear() === today.getFullYear()

      // Find events for this day
      const dayEvents = []

      // 1. Holidays
      holidays.forEach(holiday => {
        const holidayDate = new Date(holiday.date)
        if (holidayDate.getDate() === day && holidayDate.getMonth() === month && holidayDate.getFullYear() === year) {
          dayEvents.push({ type: 'holiday', title: holiday.name, color: 'bg-purple-100 text-purple-800 border-purple-200' })
        }
      })

      // 2. Birthdays (match day and month only)
      birthdays.forEach(emp => {
        if (emp.dateOfBirth.getDate() === day && emp.dateOfBirth.getMonth() === month) {
          dayEvents.push({ 
            type: 'birthday', 
            title: `${emp.firstName} ${emp.lastName}'s Birthday`, 
            color: 'bg-pink-100 text-pink-800 border-pink-200',
            photo: emp.profilePicture
          })
        }
      })

      // 3. Announcements
      announcements.forEach(ann => {
        const annDate = new Date(ann.createdAt)
        if (annDate.getDate() === day && annDate.getMonth() === month && annDate.getFullYear() === year) {
          dayEvents.push({ type: 'announcement', title: ann.title, color: 'bg-blue-100 text-blue-800 border-blue-200' })
        }
      })

      days.push({
        day,
        date: date,
        isToday,
        events: dayEvents
      })
    }

    return days
  }, [currentMonth, holidays, birthdays, announcements])

  if (loading) {
    return (
      <div className="p-6 flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">General Calendar</h1>
          <p className="text-gray-600 mt-1">View holidays, birthdays, and company events</p>
        </div>

        <div className="flex items-center space-x-4">
          {/* View Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center space-x-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'calendar' ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <FaTh className="w-4 h-4" />
              <span>Calendar</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center space-x-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'list' ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <FaList className="w-4 h-4" />
              <span>List</span>
            </button>
          </div>

          {/* Month Navigation */}
          <div className="flex items-center space-x-2 bg-white rounded-lg shadow-sm border border-gray-200 p-1">
            <button
              onClick={goToPreviousMonth}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
            >
              <FaChevronLeft />
            </button>
            <span className="text-lg font-medium text-gray-800 min-w-[160px] text-center">
              {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </span>
            <button
              onClick={goToNextMonth}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
            >
              <FaChevronRight />
            </button>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-6 p-4 bg-white rounded-lg shadow-sm border border-gray-100">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-purple-500"></div>
          <span className="text-sm text-gray-600">Holidays</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-pink-500"></div>
          <span className="text-sm text-gray-600">Birthdays</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
          <span className="text-sm text-gray-600">Announcements</span>
        </div>
      </div>

      {viewMode === 'calendar' ? (
        <div className="bg-white rounded-lg shadow-md p-4">
          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-1 mb-2 border-b pb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="text-center text-sm font-semibold text-gray-500 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1 auto-rows-fr">
            {calendarData.map((dayData, index) => (
              <div
                key={index}
                className={`
                  min-h-[120px] p-2 rounded-lg border border-gray-100 transition-all
                  ${dayData.day === null ? 'bg-gray-50/50 border-transparent' : 'bg-white hover:shadow-md'}
                  ${dayData.isToday ? 'ring-2 ring-primary-500 ring-offset-2 z-10' : ''}
                `}
              >
                {dayData.day && (
                  <>
                    <div className="flex justify-between items-start mb-2">
                      <span className={`
                        text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full
                        ${dayData.isToday ? 'bg-primary-600 text-white' : 'text-gray-700'}
                      `}>
                        {dayData.day}
                      </span>
                    </div>
                    
                    <div className="space-y-1 overflow-y-auto max-h-[80px] custom-scrollbar">
                      {dayData.events.map((event, i) => (
                        <div 
                          key={i} 
                          className={`text-xs p-1.5 rounded border mb-1 truncate flex items-center gap-1 ${event.color}`}
                          title={event.title}
                        >
                          {event.type === 'holiday' && <FaCalendarAlt className="flex-shrink-0" />}
                          {event.type === 'birthday' && <FaBirthdayCake className="flex-shrink-0" />}
                          {event.type === 'announcement' && <FaBullhorn className="flex-shrink-0" />}
                          <span className="truncate">{event.title}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* List View */
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="divide-y divide-gray-200">
            {calendarData
              .filter(d => d.day && d.events.length > 0)
              .map((dayData, index) => (
                <div key={index} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-16 text-center">
                      <div className="text-sm font-bold text-gray-500 uppercase">
                        {dayData.date.toLocaleDateString('en-US', { weekday: 'short' })}
                      </div>
                      <div className={`text-2xl font-bold ${dayData.isToday ? 'text-primary-600' : 'text-gray-800'}`}>
                        {dayData.day}
                      </div>
                    </div>
                    <div className="flex-1 space-y-2">
                      {dayData.events.map((event, i) => (
                        <div key={i} className={`flex items-center gap-3 p-3 rounded-lg border ${event.color}`}>
                          <div className="p-2 bg-white/50 rounded-full">
                            {event.type === 'holiday' && <FaCalendarAlt />}
                            {event.type === 'birthday' && <FaBirthdayCake />}
                            {event.type === 'announcement' && <FaBullhorn />}
                          </div>
                          <div>
                            <p className="font-medium">{event.title}</p>
                            <p className="text-xs opacity-75 capitalize">{event.type}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            {calendarData.filter(d => d.day && d.events.length > 0).length === 0 && (
              <div className="p-8 text-center text-gray-500">
                No events found for this month.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

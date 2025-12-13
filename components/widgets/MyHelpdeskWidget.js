'use client'
import { useState, useEffect } from 'react'
import { FaHeadset, FaPlus } from 'react-icons/fa'
import { useRouter } from 'next/navigation'
import { getEmployeeId } from '@/utils/userHelper'

export default function MyHelpdeskWidget({ user }) {
  const router = useRouter()
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) fetchTickets()
  }, [user])

  const fetchTickets = async () => {
    try {
      const employeeId = getEmployeeId(user)
      if (!employeeId) return
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/helpdesk?employeeId=${employeeId}&limit=3`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()
      if (data.success) setTickets(data.data)
    } catch (error) {
      console.error('Error fetching tickets:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="animate-pulse h-32 bg-gray-100 rounded-lg"></div>

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 h-full">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
          <FaHeadset className="text-purple-500" /> Helpdesk
        </h3>
        <button 
          onClick={() => router.push('/dashboard/helpdesk')}
          className="text-xs bg-purple-50 text-purple-600 px-2 py-1 rounded hover:bg-purple-100 flex items-center gap-1"
        >
          <FaPlus size={10} /> New
        </button>
      </div>
      {tickets.length === 0 ? (
        <p className="text-sm text-gray-500">No open tickets.</p>
      ) : (
        <div className="space-y-2">
          {tickets.slice(0, 3).map(ticket => (
            <div key={ticket._id} className="flex items-center justify-between text-sm border-b border-gray-50 pb-1 last:border-0">
              <div className="truncate pr-2 flex-1">
                <p className="font-medium text-gray-800 truncate">{ticket.subject}</p>
                <p className="text-xs text-gray-500 capitalize">{ticket.priority}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${
                ticket.status === 'open' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {ticket.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

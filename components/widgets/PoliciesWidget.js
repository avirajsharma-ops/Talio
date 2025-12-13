'use client'
import { useState, useEffect } from 'react'
import { FaFileContract } from 'react-icons/fa'
import { useRouter } from 'next/navigation'

export default function PoliciesWidget() {
  const router = useRouter()
  const [policies, setPolicies] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPolicies()
  }, [])

  const fetchPolicies = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/policies?limit=3', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()
      if (data.success) setPolicies(data.data)
    } catch (error) {
      console.error('Error fetching policies:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="animate-pulse h-32 bg-gray-100 rounded-lg"></div>

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 h-full">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
          <FaFileContract className="text-orange-500" /> Policies
        </h3>
        <button 
          onClick={() => router.push('/dashboard/policies')}
          className="text-xs text-gray-500 hover:text-gray-700"
        >
          View All
        </button>
      </div>
      {policies.length === 0 ? (
        <p className="text-sm text-gray-500">No policies found.</p>
      ) : (
        <div className="space-y-2">
          {policies.slice(0, 3).map(policy => (
            <div key={policy._id} className="flex items-center justify-between text-sm border-b border-gray-50 pb-1 last:border-0 cursor-pointer hover:bg-gray-50 p-1 rounded" onClick={() => router.push('/dashboard/policies')}>
              <p className="font-medium text-gray-800 truncate w-full">{policy.title}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

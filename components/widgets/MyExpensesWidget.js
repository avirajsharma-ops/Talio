'use client'
import { useState, useEffect } from 'react'
import { FaMoneyBillWave, FaPlus } from 'react-icons/fa'
import { useRouter } from 'next/navigation'
import { getEmployeeId } from '@/utils/userHelper'

export default function MyExpensesWidget({ user }) {
  const router = useRouter()
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) fetchExpenses()
  }, [user])

  const fetchExpenses = async () => {
    try {
      const employeeId = getEmployeeId(user)
      if (!employeeId) return
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/expenses?employeeId=${employeeId}&limit=3`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()
      if (data.success) setExpenses(data.data)
    } catch (error) {
      console.error('Error fetching expenses:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="animate-pulse h-32 bg-gray-100 rounded-lg"></div>

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 h-full">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
          <FaMoneyBillWave className="text-green-500" /> Expenses
        </h3>
        <button 
          onClick={() => router.push('/dashboard/expenses')}
          className="text-xs bg-green-50 text-green-600 px-2 py-1 rounded hover:bg-green-100 flex items-center gap-1"
        >
          <FaPlus size={10} /> Add
        </button>
      </div>
      {expenses.length === 0 ? (
        <p className="text-sm text-gray-500">No recent expenses.</p>
      ) : (
        <div className="space-y-2">
          {expenses.slice(0, 3).map(expense => (
            <div key={expense._id} className="flex items-center justify-between text-sm border-b border-gray-50 pb-1 last:border-0">
              <div>
                <p className="font-medium text-gray-800 capitalize">{expense.category}</p>
                <p className="text-xs text-gray-500">{new Date(expense.date || expense.createdAt).toLocaleDateString()}</p>
              </div>
              <span className="font-semibold text-gray-700">${expense.amount}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

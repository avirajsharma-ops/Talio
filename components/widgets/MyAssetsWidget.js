'use client'
import { useState, useEffect } from 'react'
import { FaLaptop, FaBarcode } from 'react-icons/fa'
import { useRouter } from 'next/navigation'
import { getEmployeeId } from '@/utils/userHelper'

export default function MyAssetsWidget({ user }) {
  const router = useRouter()
  const [assets, setAssets] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) fetchAssets()
  }, [user])

  const fetchAssets = async () => {
    try {
      const employeeId = getEmployeeId(user)
      if (!employeeId) return
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/assets?employeeId=${employeeId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()
      if (data.success) setAssets(data.data)
    } catch (error) {
      console.error('Error fetching assets:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="animate-pulse h-32 bg-gray-100 rounded-lg"></div>

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 h-full">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
          <FaLaptop className="text-blue-500" /> My Assets
        </h3>
        <span className="text-xs font-medium bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
          {assets.length}
        </span>
      </div>
      {assets.length === 0 ? (
        <p className="text-sm text-gray-500">No assets assigned.</p>
      ) : (
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {assets.map(asset => (
            <div key={asset._id} className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded">
              <div>
                <p className="font-medium text-gray-800">{asset.name}</p>
                <p className="text-xs text-gray-500">{asset.assetId || asset.uin}</p>
              </div>
              <div className="text-xs text-gray-500 capitalize">
                {asset.status}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

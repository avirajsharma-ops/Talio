'use client'

import { useState } from 'react'
import { FaBuilding, FaBriefcase, FaCalendarAlt, FaUmbrellaBeach, FaCog } from 'react-icons/fa'

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('departments')

  const tabs = [
    { id: 'departments', name: 'Departments', icon: FaBuilding },
    { id: 'designations', name: 'Designations', icon: FaBriefcase },
    { id: 'holidays', name: 'Holidays', icon: FaCalendarAlt },
    { id: 'leave-types', name: 'Leave Types', icon: FaUmbrellaBeach },
    { id: 'general', name: 'General', icon: FaCog },
  ]

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Settings</h1>
        <p className="text-gray-600 mt-1">Configure your HRMS system</p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-64 bg-white rounded-lg shadow-md p-4">
          <nav className="space-y-2">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                    activeTab === tab.id
                      ? 'bg-primary-500 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon />
                  <span>{tab.name}</span>
                </button>
              )
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 bg-white rounded-lg shadow-md p-6">
          {activeTab === 'departments' && <DepartmentsTab />}
          {activeTab === 'designations' && <DesignationsTab />}
          {activeTab === 'holidays' && <HolidaysTab />}
          {activeTab === 'leave-types' && <LeaveTypesTab />}
          {activeTab === 'general' && <GeneralTab />}
        </div>
      </div>
    </div>
  )
}

function DepartmentsTab() {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Departments</h2>
        <button className="btn-primary">Add Department</button>
      </div>
      <div className="text-gray-600">
        <p>Manage organization departments here.</p>
        <div className="mt-4 space-y-2">
          <div className="p-4 border border-gray-200 rounded-lg flex justify-between items-center">
            <div>
              <h3 className="font-semibold">Engineering</h3>
              <p className="text-sm text-gray-500">50 employees</p>
            </div>
            <button className="text-primary-500 hover:text-primary-700">Edit</button>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg flex justify-between items-center">
            <div>
              <h3 className="font-semibold">Human Resources</h3>
              <p className="text-sm text-gray-500">10 employees</p>
            </div>
            <button className="text-primary-500 hover:text-primary-700">Edit</button>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg flex justify-between items-center">
            <div>
              <h3 className="font-semibold">Sales</h3>
              <p className="text-sm text-gray-500">25 employees</p>
            </div>
            <button className="text-primary-500 hover:text-primary-700">Edit</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function DesignationsTab() {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Designations</h2>
        <button className="btn-primary">Add Designation</button>
      </div>
      <div className="text-gray-600">
        <p>Manage job designations and titles here.</p>
        <div className="mt-4 space-y-2">
          <div className="p-4 border border-gray-200 rounded-lg flex justify-between items-center">
            <div>
              <h3 className="font-semibold">Software Engineer</h3>
              <p className="text-sm text-gray-500">Engineering Department</p>
            </div>
            <button className="text-primary-500 hover:text-primary-700">Edit</button>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg flex justify-between items-center">
            <div>
              <h3 className="font-semibold">HR Manager</h3>
              <p className="text-sm text-gray-500">Human Resources Department</p>
            </div>
            <button className="text-primary-500 hover:text-primary-700">Edit</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function HolidaysTab() {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Holidays</h2>
        <button className="btn-primary">Add Holiday</button>
      </div>
      <div className="text-gray-600">
        <p>Manage company holidays and observances.</p>
        <div className="mt-4 space-y-2">
          <div className="p-4 border border-gray-200 rounded-lg flex justify-between items-center">
            <div>
              <h3 className="font-semibold">New Year&apos;s Day</h3>
              <p className="text-sm text-gray-500">January 1, 2025</p>
            </div>
            <button className="text-primary-500 hover:text-primary-700">Edit</button>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg flex justify-between items-center">
            <div>
              <h3 className="font-semibold">Independence Day</h3>
              <p className="text-sm text-gray-500">July 4, 2025</p>
            </div>
            <button className="text-primary-500 hover:text-primary-700">Edit</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function LeaveTypesTab() {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Leave Types</h2>
        <button className="btn-primary">Add Leave Type</button>
      </div>
      <div className="text-gray-600">
        <p>Configure different types of leaves available.</p>
        <div className="mt-4 space-y-2">
          <div className="p-4 border border-gray-200 rounded-lg flex justify-between items-center">
            <div>
              <h3 className="font-semibold">Casual Leave</h3>
              <p className="text-sm text-gray-500">12 days per year</p>
            </div>
            <button className="text-primary-500 hover:text-primary-700">Edit</button>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg flex justify-between items-center">
            <div>
              <h3 className="font-semibold">Sick Leave</h3>
              <p className="text-sm text-gray-500">10 days per year</p>
            </div>
            <button className="text-primary-500 hover:text-primary-700">Edit</button>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg flex justify-between items-center">
            <div>
              <h3 className="font-semibold">Paid Time Off</h3>
              <p className="text-sm text-gray-500">15 days per year</p>
            </div>
            <button className="text-primary-500 hover:text-primary-700">Edit</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function GeneralTab() {
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">General Settings</h2>
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Company Name
          </label>
          <input
            type="text"
            defaultValue="My Company"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Company Email
          </label>
          <input
            type="email"
            defaultValue="info@company.com"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Time Zone
          </label>
          <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent">
            <option>UTC</option>
            <option>America/New_York</option>
            <option>America/Los_Angeles</option>
            <option>Europe/London</option>
            <option>Asia/Kolkata</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Currency
          </label>
          <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent">
            <option>USD - US Dollar</option>
            <option>EUR - Euro</option>
            <option>GBP - British Pound</option>
            <option>INR - Indian Rupee</option>
          </select>
        </div>

        <div className="flex justify-end">
          <button className="btn-primary">Save Changes</button>
        </div>
      </div>
    </div>
  )
}


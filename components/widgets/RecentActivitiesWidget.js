'use client'

export default function RecentActivitiesWidget() {
    return (
        <div className="p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-4">Recent Activities</h3>
            <div className="text-center py-8 text-gray-500">
                <p className="text-sm">No recent activities</p>
            </div>
        </div>
    )
}

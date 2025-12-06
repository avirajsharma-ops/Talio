'use client'

export default function BirthdayWidget() {
    return (
        <div className="p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-4">Upcoming Birthdays</h3>
            <div className="text-center py-8 text-gray-500">
                <p className="text-sm">No birthdays this week</p>
            </div>
        </div>
    )
}

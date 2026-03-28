export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-700">Users</h2>
            <p className="text-3xl font-bold text-blue-600 mt-2">—</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-700">Audit Logs</h2>
            <p className="text-3xl font-bold text-green-600 mt-2">—</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-700">Active Jobs</h2>
            <p className="text-3xl font-bold text-orange-600 mt-2">—</p>
          </div>
        </div>
      </div>
    </main>
  );
}

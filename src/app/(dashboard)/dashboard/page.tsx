import { getServerAuthSession } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await getServerAuthSession();

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="bg-white overflow-hidden shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900">Welcome back</h3>
          <p className="mt-1 text-sm text-gray-500">
            {session?.user?.name ?? session?.user?.email}
          </p>
          <p className="mt-2 text-xs text-gray-400">
            Role:{" "}
            <span className="font-semibold">{session?.user?.role}</span>
          </p>
        </div>
      </div>
    </div>
  );
}

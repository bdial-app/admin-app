import { Users, UsersRound, FileCheck, Star } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
  { name: 'Jan', registrations: 40 },
  { name: 'Feb', registrations: 30 },
  { name: 'Mar', registrations: 20 },
  { name: 'Apr', registrations: 27 },
  { name: 'May', registrations: 18 },
  { name: 'Jun', registrations: 23 },
  { name: 'Jul', registrations: 34 },
];

const stats = [
  { name: 'Total Users', value: '4,521', icon: Users, color: 'text-blue-600', bg: 'bg-blue-100' },
  { name: 'Total Providers', value: '821', icon: UsersRound, color: 'text-green-600', bg: 'bg-green-100' },
  { name: 'Pending Registrations', value: '23', icon: FileCheck, color: 'text-yellow-600', bg: 'bg-yellow-100' },
  { name: 'Pending Reviews', value: '14', icon: Star, color: 'text-purple-600', bg: 'bg-purple-100' },
];

const Dashboard = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Dashboard Overview</h2>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((item) => (
          <div key={item.name} className="bg-white overflow-hidden rounded-lg shadow border border-gray-100">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className={`p-3 rounded-md ${item.bg}`}>
                    <item.icon className={`h-6 w-6 ${item.color}`} aria-hidden="true" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">{item.name}</dt>
                    <dd className="text-2xl font-semibold text-gray-900">{item.value}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white shadow rounded-lg border border-gray-100 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Registration Analytics (Last 7 Months)</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} />
              <YAxis axisLine={false} tickLine={false} />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Line 
                type="monotone" 
                dataKey="registrations" 
                stroke="#2563eb" 
                strokeWidth={3}
                dot={{ r: 4 }}
                activeDot={{ r: 8 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

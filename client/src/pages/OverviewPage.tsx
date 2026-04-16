import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { fetchOverview } from '../api';
import StatCard from '../components/StatCard';
import LoadingSpinner from '../components/LoadingSpinner';

interface DailyActivity {
  date: string;
  messageCount: number;
  sessionCount: number;
  toolCallCount: number;
}

interface RecentSession {
  sessionId: string;
  projectName: string;
  firstPrompt?: string;
  messageCount: number;
  created: string;
}

interface OverviewData {
  statsCache: {
    totalSessions: number;
    totalMessages: number;
    firstSessionDate: string;
    dailyActivity: DailyActivity[];
  } | null;
  totalProjects: number;
  recentSessions: RecentSession[];
}

export default function OverviewPage() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchOverview()
      .then((res: OverviewData) => setData(res))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner message="Loading overview..." />;
  if (error) return <p className="text-red-400">Error: {error}</p>;
  if (!data) return null;

  const { statsCache, totalProjects, recentSessions } = data;

  const chartData = (statsCache?.dailyActivity ?? []).slice(-30);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
  };

  const truncate = (text: string | undefined, max: number) => {
    if (!text) return '-';
    return text.length > max ? text.slice(0, max) + '...' : text;
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Overview Dashboard</h1>

      {/* Stat Cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Total Sessions" value={statsCache ? statsCache.totalSessions.toLocaleString() : '-'} />
        <StatCard label="Total Messages" value={statsCache ? statsCache.totalMessages.toLocaleString() : '-'} />
        <StatCard label="Active Projects" value={totalProjects} />
        <StatCard label="First Session" value={statsCache?.firstSessionDate ? formatDate(statsCache.firstSessionDate) : '-'} />
      </div>

      {/* Daily Activity Chart */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Daily Activity (Last 30 Days)</h2>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="date"
              tick={{ fill: '#9ca3af', fontSize: 12 }}
              tickFormatter={(v: string) => v.slice(5)}
            />
            <YAxis yAxisId="left" tick={{ fill: '#9ca3af', fontSize: 12 }} />
            <YAxis yAxisId="right" orientation="right" tick={{ fill: '#9ca3af', fontSize: 12 }} />
            <Tooltip
              contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: 8 }}
              labelStyle={{ color: '#e5e7eb' }}
              itemStyle={{ color: '#e5e7eb' }}
            />
            <Legend />
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="messageCount"
              name="Messages"
              stroke="#3b82f6"
              fill="#3b82f680"
            />
            <Area
              yAxisId="right"
              type="monotone"
              dataKey="sessionCount"
              name="Sessions"
              stroke="#10b981"
              fill="#10b98180"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Recent Sessions Table */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Recent Sessions</h2>
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="border-b border-gray-700 text-gray-400">
              <th className="pb-3 font-medium">Project</th>
              <th className="pb-3 font-medium">First Prompt</th>
              <th className="pb-3 font-medium text-right">Messages</th>
              <th className="pb-3 font-medium text-right">Created</th>
            </tr>
          </thead>
          <tbody>
            {recentSessions.map((s) => (
              <tr
                key={s.sessionId}
                onClick={() => navigate(`/sessions/${s.sessionId}`)}
                className="border-b border-gray-700/50 cursor-pointer hover:bg-gray-700 transition-colors"
              >
                <td className="py-3 text-white">{s.projectName}</td>
                <td className="py-3 text-gray-300">{truncate(s.firstPrompt, 60)}</td>
                <td className="py-3 text-right text-gray-300">{s.messageCount}</td>
                <td className="py-3 text-right text-gray-400">{formatDate(s.created)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

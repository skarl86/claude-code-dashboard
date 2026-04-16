import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { fetchSessionDetail } from '../api';
import StatCard from '../components/StatCard';
import LoadingSpinner from '../components/LoadingSpinner';

interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
}

interface TokenUsagePerMessage {
  inputTokens: number;
  outputTokens: number;
}

interface ToolCallEntry {
  name: string;
  count: number;
}

interface MessageEntry {
  type: 'user' | 'assistant';
  timestamp: string;
  content: string;
  usage?: TokenUsagePerMessage;
  model?: string;
  toolCalls?: string[];
}

interface SessionDetailData {
  sessionId: string;
  projectName: string;
  projectDir: string;
  projectPath: string;
  firstPrompt?: string;
  messageCount: number;
  created: string;
  modified: string;
  gitBranch?: string;
  version?: string;
  messages: MessageEntry[];
  tokenUsage: TokenUsage;
  toolCalls: ToolCallEntry[];
  models: string[];
  durationMs: number;
}

function formatDuration(ms: number): string {
  const totalMinutes = Math.floor(ms / 60_000);
  if (totalMinutes < 60) return `${totalMinutes}m`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
}

export default function SessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<SessionDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    fetchSessionDetail(id)
      .then((data: SessionDetailData) => setDetail(data))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <LoadingSpinner message="Loading session..." />;
  if (error) return <p className="text-red-400">Error: {error}</p>;
  if (!detail) return <p className="text-gray-400">Session not found.</p>;

  const topTools = [...detail.toolCalls]
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const chartHeight = topTools.length * 40 + 40;

  return (
    <div className="space-y-6">
      {/* Session Header */}
      <div className="bg-gray-800 rounded-lg p-6">
        <button
          onClick={() => navigate('/sessions')}
          className="text-sm text-gray-400 hover:text-white transition-colors mb-4 flex items-center gap-1"
        >
          ← Sessions
        </button>
        <h1 className="text-2xl font-bold text-white">
          {detail.projectName}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-gray-400">
          <span>ID: {detail.sessionId.slice(0, 8)}</span>
          <span>Duration: {formatDuration(detail.durationMs)}</span>
          {detail.gitBranch && <span>Branch: {detail.gitBranch}</span>}
        </div>
      </div>

      {/* Token Usage Summary */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="Input Tokens"
          value={detail.tokenUsage.inputTokens.toLocaleString()}
        />
        <StatCard
          label="Output Tokens"
          value={detail.tokenUsage.outputTokens.toLocaleString()}
        />
        <StatCard
          label="Cache Creation"
          value={detail.tokenUsage.cacheCreationTokens.toLocaleString()}
        />
        <StatCard
          label="Cache Read"
          value={detail.tokenUsage.cacheReadTokens.toLocaleString()}
        />
      </div>

      {/* Tool Usage Distribution */}
      {topTools.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4">
            Tool Usage
          </h2>
          <ResponsiveContainer width="100%" height={chartHeight}>
            <BarChart data={topTools} layout="vertical">
              <XAxis type="number" stroke="#9ca3af" fontSize={12} />
              <YAxis
                type="category"
                dataKey="name"
                width={140}
                stroke="#9ca3af"
                fontSize={12}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: '1px solid #374151',
                  borderRadius: '0.5rem',
                  color: '#f3f4f6',
                }}
              />
              <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Message Timeline */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-white mb-4">
          Message Timeline
        </h2>
        <div className="max-h-[600px] overflow-y-auto space-y-4 pr-2">
          {detail.messages.map((msg, idx) => {
            const isUser = msg.type === 'user';
            return (
              <div
                key={idx}
                className={`border-l-4 pl-4 ${
                  isUser ? 'border-blue-500' : 'border-gray-500'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`text-xs font-medium ${
                      isUser ? 'text-blue-400' : 'text-gray-400'
                    }`}
                  >
                    {isUser ? 'User' : 'Assistant'}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(msg.timestamp).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-gray-300">{msg.content}</p>
                {!isUser && msg.usage && (
                  <div className="mt-1 flex gap-2">
                    <span className="text-xs bg-gray-700 rounded px-2 py-0.5 text-gray-300">
                      in: {msg.usage.inputTokens.toLocaleString()}
                    </span>
                    <span className="text-xs bg-gray-700 rounded px-2 py-0.5 text-gray-300">
                      out: {msg.usage.outputTokens.toLocaleString()}
                    </span>
                  </div>
                )}
                {!isUser && msg.toolCalls && msg.toolCalls.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {msg.toolCalls.map((tool, i) => (
                      <span
                        key={i}
                        className="text-xs bg-gray-700 rounded px-2 py-0.5 text-gray-400"
                      >
                        {tool}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
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
import { getToolView } from '../components/tool-views';
import type { ContentBlock, SessionDetail } from '../types/session';

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
  const [detail, setDetail] = useState<SessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filterTool, setFilterTool] = useState<string | null>(null);
  const [errorOnly, setErrorOnly] = useState(false);
  const [showThinking, setShowThinking] = useState(false);
  const [fullMode, setFullMode] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    window.scrollTo(0, 0);
    fetchSessionDetail(id, { full: fullMode })
      .then((data) => setDetail(data))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id, fullMode]);

  const displayedMessages = useMemo(() => {
    if (!detail) return [];
    return detail.messages.filter((m) => {
      const blocks = m.blocks ?? [];
      if (filterTool) {
        const hasTool = blocks.some(
          (b) => b.kind === 'tool_use' && b.name === filterTool
        );
        if (!hasTool) return false;
      }
      if (errorOnly) {
        const hasError = blocks.some(
          (b) =>
            (b.kind === 'tool_result' && b.isError) ||
            (b.kind === 'tool_use' && b.result?.isError)
        );
        if (!hasError) return false;
      }
      return true;
    });
  }, [detail, filterTool, errorOnly]);

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
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <button
            onClick={() => navigate('/sessions')}
            className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-1"
          >
            ← Sessions
          </button>
          {detail.parentSessionId && (
            <Link
              to={`/sessions/${detail.parentSessionId}`}
              className="text-xs text-blue-300 hover:underline"
            >
              ← Parent session
            </Link>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold text-white">
            {detail.projectName}
          </h1>
          {detail.isSidechain && (
            <span className="text-[10px] uppercase bg-yellow-900/50 text-yellow-200 rounded px-1.5 py-0.5">
              SUB-AGENT
            </span>
          )}
        </div>
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
              <Bar
                dataKey="count"
                fill="#3b82f6"
                radius={[0, 4, 4, 0]}
                style={{ cursor: 'pointer' }}
                onClick={(data: any) => {
                  const name: string | undefined =
                    data?.payload?.name ?? data?.name;
                  if (name) setFilterTool(name);
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Message Timeline */}
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <h2 className="text-lg font-semibold text-white">
            Message Timeline
          </h2>
          <span className="text-xs text-gray-400">
            {displayedMessages.length} / {detail.messages.length} messages
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs mb-3 text-gray-300">
          {filterTool && (
            <button
              type="button"
              onClick={() => setFilterTool(null)}
              className="bg-blue-900/50 text-blue-200 border border-blue-800 px-2 py-1 rounded hover:bg-blue-900/70"
            >
              tool: {filterTool} ✕
            </button>
          )}
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={errorOnly}
              onChange={(e) => setErrorOnly(e.target.checked)}
            />
            errors only
          </label>
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={showThinking}
              onChange={(e) => setShowThinking(e.target.checked)}
            />
            show thinking
          </label>
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={fullMode}
              onChange={(e) => setFullMode(e.target.checked)}
            />
            full (no cap)
          </label>
        </div>
        <div className="max-h-[600px] overflow-y-auto space-y-4 pr-2">
          {displayedMessages.map((msg, idx) => {
            const isUser = msg.type === 'user';
            const hasBlocks = !!(msg.blocks && msg.blocks.length > 0);
            return (
              <div
                key={idx}
                className={`border-l-4 pl-4 ${
                  isUser ? 'border-blue-500' : 'border-gray-500'
                }`}
              >
                <div className="flex flex-wrap items-center gap-2 mb-1">
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
                  {msg.model && (
                    <span className="text-[10px] uppercase bg-purple-900/50 text-purple-200 rounded px-1.5 py-0.5">
                      {msg.model}
                    </span>
                  )}
                  {msg.stopReason && (
                    <span className="text-[10px] text-gray-500">
                      stop: {msg.stopReason}
                    </span>
                  )}
                  {msg.isSidechain && (
                    <span className="text-[10px] uppercase bg-yellow-900/50 text-yellow-200 rounded px-1.5 py-0.5">
                      side-chain
                    </span>
                  )}
                </div>
                {hasBlocks ? (
                  <div className="space-y-2">
                    {msg.blocks!.map((b, i) => {
                      if (!showThinking && b.kind === 'thinking') return null;
                      return <BlockRenderer key={i} block={b} />;
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-gray-300 whitespace-pre-wrap">
                    {msg.content}
                  </p>
                )}
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
                {!isUser &&
                  !hasBlocks &&
                  msg.toolCalls &&
                  msg.toolCalls.length > 0 && (
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

function BlockRenderer({ block }: { block: ContentBlock }) {
  const [open, setOpen] = useState(false);

  if (block.kind === 'text') {
    return (
      <p className="text-sm text-gray-300 whitespace-pre-wrap">{block.text}</p>
    );
  }

  if (block.kind === 'thinking') {
    return (
      <div className="border border-gray-700 rounded">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="w-full flex items-center gap-2 px-2 py-1 text-left text-xs text-gray-400 hover:bg-gray-700/40"
        >
          <span>{open ? '▼' : '▶'}</span>
          <span className="font-medium">Thinking</span>
        </button>
        {open && (
          <div className="px-2 py-2 border-t border-gray-700">
            <pre className="text-xs text-gray-400 whitespace-pre-wrap">
              {block.thinking}
            </pre>
          </div>
        )}
      </div>
    );
  }

  if (block.kind === 'tool_use') {
    const View = getToolView(block.name);
    return <View block={block} />;
  }

  if (block.kind === 'tool_result') {
    const preview =
      typeof block.content === 'string'
        ? block.content
        : (() => {
            try {
              return JSON.stringify(block.content);
            } catch {
              return String(block.content);
            }
          })();
    const shortPreview =
      preview.length > 80 ? preview.slice(0, 80) + '…' : preview;
    return (
      <div className="text-xs text-gray-400">
        [result: {block.toolUseId}] {shortPreview}
        {block.truncated ? ' (truncated)' : ''}
      </div>
    );
  }

  return null;
}

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchSessions, fetchProjects } from '../api';
import Pagination from '../components/Pagination';
import LoadingSpinner from '../components/LoadingSpinner';

interface SessionItem {
  sessionId: string;
  projectName: string;
  firstPrompt?: string;
  messageCount: number;
  created: string;
  gitBranch?: string;
}

interface ProjectItem {
  dirName: string;
  projectPath: string;
  projectName: string;
  sessionCount: number;
}

type SortField = 'created' | 'messageCount';
type SortOrder = 'asc' | 'desc';

const LIMIT = 50;

export default function SessionListPage() {
  const navigate = useNavigate();

  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [sort, setSort] = useState<SortField>('created');
  const [order, setOrder] = useState<SortOrder>('desc');
  const [offset, setOffset] = useState(0);

  // Load projects once
  useEffect(() => {
    fetchProjects()
      .then((data: ProjectItem[]) => setProjects(data))
      .catch(() => {/* ignore */});
  }, []);

  // Load sessions when filters change
  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchSessions({
      project: selectedProject || undefined,
      sort,
      order,
      limit: LIMIT,
      offset,
    })
      .then((data: { sessions: SessionItem[]; total: number }) => {
        setSessions(data.sessions);
        setTotal(data.total);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [selectedProject, sort, order, offset]);

  function handleSort(field: SortField) {
    if (sort === field) {
      setOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSort(field);
      setOrder('desc');
    }
    setOffset(0);
  }

  function handleProjectChange(value: string) {
    setSelectedProject(value);
    setOffset(0);
  }

  function sortIcon(field: SortField) {
    if (sort !== field) return null;
    return order === 'asc' ? ' ▲' : ' ▼';
  }

  function truncate(text: string | undefined, max: number) {
    if (!text) return '-';
    return text.length > max ? text.slice(0, max) + '…' : text;
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString();
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Sessions</h1>
        <select
          value={selectedProject}
          onChange={(e) => handleProjectChange(e.target.value)}
          className="rounded border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-gray-100 focus:outline-none focus:ring-1 focus:ring-gray-600"
        >
          <option value="">전체 프로젝트</option>
          {projects.map((p) => (
            <option key={p.dirName} value={p.dirName}>
              {p.projectName}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="mb-4 rounded bg-red-900/40 px-4 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <LoadingSpinner message="세션 로딩 중..." />
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-gray-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700 bg-gray-800/60 text-left text-xs uppercase tracking-wider text-gray-400">
                  <th className="px-4 py-3 font-medium">프로젝트</th>
                  <th className="px-4 py-3 font-medium">요약</th>
                  <th
                    className="cursor-pointer select-none px-4 py-3 font-medium hover:text-gray-200"
                    onClick={() => handleSort('messageCount')}
                  >
                    메시지 수{sortIcon('messageCount')}
                  </th>
                  <th
                    className="cursor-pointer select-none px-4 py-3 font-medium hover:text-gray-200"
                    onClick={() => handleSort('created')}
                  >
                    생성일{sortIcon('created')}
                  </th>
                  <th className="px-4 py-3 font-medium">Git 브랜치</th>
                </tr>
              </thead>
              <tbody>
                {sessions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                      세션이 없습니다.
                    </td>
                  </tr>
                ) : (
                  sessions.map((s) => (
                    <tr
                      key={s.sessionId}
                      onClick={() => navigate(`/sessions/${s.sessionId}`)}
                      className="cursor-pointer border-b border-gray-700/50 transition-colors hover:bg-gray-700/50"
                    >
                      <td className="whitespace-nowrap px-4 py-3 text-gray-300">
                        {s.projectName}
                      </td>
                      <td className="px-4 py-3 text-gray-300">
                        {truncate(s.firstPrompt, 60)}
                      </td>
                      <td className="px-4 py-3 text-gray-300">{s.messageCount}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-400">
                        {formatDate(s.created)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-400">
                        {s.gitBranch ?? '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4">
            <Pagination
              total={total}
              limit={LIMIT}
              offset={offset}
              onChange={setOffset}
            />
          </div>
        </>
      )}
    </div>
  );
}

import type { ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  trend?: string;
}

export default function StatCard({ label, value, icon, trend }: StatCardProps) {
  return (
    <div className="bg-gray-800 rounded-lg p-6 shadow">
      <p className="text-sm text-gray-400">{label}</p>
      <div className="mt-2 flex items-center gap-3">
        {icon && <span className="text-gray-400">{icon}</span>}
        <span className="text-2xl font-bold text-white">{value}</span>
        {trend && <span className="text-sm text-gray-400">{trend}</span>}
      </div>
    </div>
  );
}

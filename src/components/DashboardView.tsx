import React from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  MapPinOff,
  Wrench,
} from 'lucide-react';
import {
  EquipmentAsset,
  FaultReport,
  HistoryEvent,
  MaintenanceTask,
  NavSection,
} from '../types/bems';
import { DEPARTMENTS } from '../data/mockBemsData';
import { StatusIndicator } from './StatusText';

interface DashboardViewProps {
  equipment: EquipmentAsset[];
  maintenance: MaintenanceTask[];
  faults: FaultReport[];
  history: HistoryEvent[];
  onSelectEquipment: (equipmentId: string) => void;
  onNavigate: (section: NavSection) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  equipment,
  maintenance,
  faults,
  history,
  onSelectEquipment,
  onNavigate,
}) => {
  const totalCount = equipment.length;
  const operationalCount = equipment.filter((e) => e.status === 'Operational').length;
  const faultyCount = equipment.filter((e) => e.status === 'Faulty').length;
  const underMaintCount = equipment.filter((e) => e.status === 'Under Maintenance').length;
  const awaitingInspCount = equipment.filter((e) => e.status === 'Awaiting Inspection').length;
  const decommissionedCount = equipment.filter((e) => e.status === 'Decommissioned').length;

  const overdueMaintCount = maintenance.filter((m) => m.status === 'Overdue').length;
  const upcomingMaintCount = maintenance.filter(
    (m) => m.status === 'Scheduled' || m.status === 'In Progress' || m.status === 'Awaiting Parts'
  ).length;
  const completedThisMonthCount = maintenance.filter(
    (m) => m.status === 'Completed' && m.completionDate.startsWith('2026-11')
  ).length;

  const kpis = [
    { label: 'Total Registered Equipment', value: totalCount, tone: 'text-slate-900', filter: 'inventory' as NavSection },
    { label: 'Operational Equipment', value: operationalCount, tone: 'text-emerald-700', filter: 'inventory' as NavSection },
    { label: 'Faulty Equipment', value: faultyCount, tone: 'text-red-700', filter: 'faults' as NavSection },
    { label: 'Under Maintenance', value: underMaintCount, tone: 'text-amber-700', filter: 'maintenance' as NavSection },
    { label: 'Awaiting Inspection', value: awaitingInspCount, tone: 'text-sky-700', filter: 'inventory' as NavSection },
    { label: 'Overdue Maintenance', value: overdueMaintCount, tone: 'text-red-700', filter: 'maintenance' as NavSection },
  ];

  // Equipment Status Overview Donut geometry
  const statusSegments = [
    { label: 'Operational', count: operationalCount, color: '#16a34a' },
    { label: 'Faulty', count: faultyCount, color: '#dc2626' },
    { label: 'Under Maintenance', count: underMaintCount, color: '#d97706' },
    { label: 'Awaiting Inspection', count: awaitingInspCount, color: '#0284c7' },
    { label: 'Decommissioned', count: decommissionedCount, color: '#64748b' },
  ];
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  let runningOffset = 0;

  // Attention items
  const criticalFaultItems = faults.filter(
    (f) => f.severity === 'Critical' && f.status !== 'Closed' && f.status !== 'Resolved'
  );
  const overdueTasks = maintenance.filter((m) => m.status === 'Overdue');
  const missingLocationEquipment = equipment.filter((e) => !e.location.trim());
  const approachingInspectionEquipment = equipment.filter(
    (e) =>
      e.nextServiceDate >= '2026-11-25' &&
      e.nextServiceDate <= '2026-12-10' &&
      e.status !== 'Decommissioned'
  );

  // Department distribution
  const deptStats = DEPARTMENTS.map((dept) => {
    const items = equipment.filter((e) => e.department === dept);
    return {
      dept,
      total: items.length,
      operational: items.filter((e) => e.status === 'Operational').length,
      faulty: items.filter((e) => e.status === 'Faulty').length,
    };
  });
  const maxDeptCount = Math.max(1, ...deptStats.map((d) => d.total));

  const sortedHistory = [...history]
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, 6);

  return (
    <div className="space-y-6">
      {/* Demonstration Data Notice */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 bg-white border border-slate-200 rounded-xl px-4 py-2.5">
        <span>
          Hospital Biomedical Engineering Operations Overview · Fictional demonstration fleet active for interactive workflow testing.
        </span>
        <button
          type="button"
          onClick={() => onNavigate('inventory')}
          className="inline-flex items-center gap-1 font-medium text-teal-700 hover:underline whitespace-nowrap"
        >
          Search Equipment Registry
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Top Summary Statistic Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpis.map((kpi) => (
          <button
            key={kpi.label}
            type="button"
            onClick={() => onNavigate(kpi.filter)}
            className="bg-white border border-slate-200 rounded-xl p-4 text-left hover:border-slate-300 transition-colors"
          >
            <div className="text-xs text-slate-500 leading-snug">{kpi.label}</div>
            <div className={`mt-2 text-2xl font-display font-bold tabular-nums ${kpi.tone}`}>
              {kpi.value}
            </div>
          </button>
        ))}
      </div>

      {/* Primary Analytics Grid: Status Overview + Maintenance Overview + Department Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* A. Equipment Status Overview */}
        <section className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Equipment Status Overview</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Distribution across operational and service states
            </p>
          </div>

          <div className="my-5 flex items-center justify-center">
            <div className="relative w-36 h-36">
              <svg viewBox="0 0 140 140" className="w-full h-full -rotate-90">
                <circle
                  cx="70"
                  cy="70"
                  r={radius}
                  fill="none"
                  stroke="#f1f5f9"
                  strokeWidth="16"
                />
                {statusSegments.map((seg) => {
                  if (seg.count === 0 || totalCount === 0) return null;
                  const segLength = (seg.count / totalCount) * circumference;
                  const dashArray = `${segLength} ${circumference - segLength}`;
                  const dashOffset = -runningOffset;
                  runningOffset += segLength;
                  return (
                    <circle
                      key={seg.label}
                      cx="70"
                      cy="70"
                      r={radius}
                      fill="none"
                      stroke={seg.color}
                      strokeWidth="16"
                      strokeDasharray={dashArray}
                      strokeDashoffset={dashOffset}
                    />
                  );
                })}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-display font-bold text-slate-900 tabular-nums">
                  {totalCount}
                </span>
                <span className="text-[11px] text-slate-500">Registered</span>
              </div>
            </div>
          </div>

          <div className="space-y-2 border-t border-slate-100 pt-3">
            {statusSegments.map((seg) => (
              <div key={seg.label} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-slate-700">
                  <span
                    className="w-2.5 h-2.5 rounded-xs shrink-0"
                    style={{ backgroundColor: seg.color }}
                    aria-hidden="true"
                  />
                  <span>{seg.label}</span>
                </span>
                <span className="font-mono font-medium text-slate-900 tabular-nums">
                  {seg.count}{' '}
                  <span className="text-slate-400">
                    ({totalCount > 0 ? Math.round((seg.count / totalCount) * 100) : 0}%)
                  </span>
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* B. Maintenance Overview */}
        <section className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-slate-900">Maintenance Overview</h2>
              <button
                type="button"
                onClick={() => onNavigate('maintenance')}
                className="text-xs font-medium text-teal-700 hover:underline whitespace-nowrap"
              >
                Open Schedule
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Preventive inspections and corrective repairs
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 my-5">
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <Clock className="w-3.5 h-3.5 text-sky-600" />
                <span>Upcoming</span>
              </div>
              <div className="mt-1.5 text-xl font-display font-bold text-slate-900 tabular-nums">
                {upcomingMaintCount}
              </div>
            </div>
            <div className="p-3.5 bg-red-50/70 border border-red-200 rounded-lg">
              <div className="flex items-center gap-1.5 text-xs text-red-800">
                <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                <span>Overdue</span>
              </div>
              <div className="mt-1.5 text-xl font-display font-bold text-red-700 tabular-nums">
                {overdueMaintCount}
              </div>
            </div>
            <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-lg">
              <div className="flex items-center gap-1.5 text-xs text-emerald-800">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Completed (Nov)</span>
              </div>
              <div className="mt-1.5 text-xl font-display font-bold text-emerald-700 tabular-nums">
                {completedThisMonthCount}
              </div>
            </div>
            <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-lg">
              <div className="flex items-center gap-1.5 text-xs text-amber-800">
                <Wrench className="w-3.5 h-3.5 text-amber-600" />
                <span>In Repair</span>
              </div>
              <div className="mt-1.5 text-xl font-display font-bold text-amber-700 tabular-nums">
                {underMaintCount}
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-3 space-y-2">
            <div className="text-xs font-medium text-slate-700">Next Scheduled Tasks</div>
            {maintenance
              .filter((m) => m.status !== 'Completed')
              .slice(0, 3)
              .map((task) => (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => onSelectEquipment(task.equipmentId)}
                  className="w-full flex items-center justify-between gap-2 text-xs py-1 hover:bg-slate-50 rounded px-1 transition-colors text-left"
                >
                  <span className="truncate text-slate-700">
                    <span className="font-mono text-slate-900 mr-1.5">{task.assetId}</span>
                    {task.type}
                  </span>
                  <span className="font-mono text-slate-500 tabular-nums shrink-0">
                    {task.nextMaintenanceDate}
                  </span>
                </button>
              ))}
          </div>
        </section>

        {/* E. Equipment by Department */}
        <section className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-slate-900">Equipment by Department</h2>
              <button
                type="button"
                onClick={() => onNavigate('departments')}
                className="text-xs font-medium text-teal-700 hover:underline whitespace-nowrap"
              >
                View All
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Registered asset distribution across clinical units
            </p>
          </div>

          <div className="mt-4 space-y-3">
            {deptStats.map((d) => (
              <div key={d.dept} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-700 truncate pr-2">{d.dept}</span>
                  <span className="font-mono text-slate-900 tabular-nums shrink-0">
                    {d.total}{' '}
                    <span className="text-slate-400">
                      ({d.operational} ok{d.faulty > 0 ? `, ${d.faulty} faulty` : ''})
                    </span>
                  </span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-slate-800 rounded-full transition-all"
                    style={{ width: `${(d.total / maxDeptCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Bottom Grid: Equipment Requiring Attention + Recent Equipment Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* D. Equipment Requiring Attention */}
        <section className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Equipment Requiring Attention</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Critical faults, overdue servicing, missing locations, and approaching inspections
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('faults')}
              className="text-xs font-medium text-red-700 hover:underline whitespace-nowrap"
            >
              Fault Console
            </button>
          </div>

          <div className="divide-y divide-slate-100 mt-2">
            {criticalFaultItems.map((fault) => (
              <div key={fault.id} className="py-3 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-mono font-semibold text-red-700 tabular-nums">
                      {fault.assetId}
                    </span>
                    <span className="font-medium text-slate-900 truncate">
                      {fault.equipmentName}
                    </span>
                    <span aria-hidden="true" className="text-slate-300">·</span>
                    <span className="text-red-700 font-medium">Critical Fault</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5 truncate">{fault.description}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onSelectEquipment(fault.equipmentId)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg whitespace-nowrap shrink-0"
                >
                  Inspect Asset
                </button>
              </div>
            ))}

            {overdueTasks.map((task) => (
              <div key={task.id} className="py-3 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-mono font-semibold text-amber-800 tabular-nums">
                      {task.assetId}
                    </span>
                    <span className="font-medium text-slate-900 truncate">
                      {task.equipmentName}
                    </span>
                    <span aria-hidden="true" className="text-slate-300">·</span>
                    <span className="text-amber-700 font-medium">
                      Overdue {task.type} (Due {task.nextMaintenanceDate})
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5 truncate">{task.instructions}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onSelectEquipment(task.equipmentId)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg whitespace-nowrap shrink-0"
                >
                  View Profile
                </button>
              </div>
            ))}

            {missingLocationEquipment.map((item) => (
              <div key={`loc-${item.id}`} className="py-3 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xs">
                    <MapPinOff className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span className="font-mono font-semibold text-slate-900 tabular-nums">
                      {item.assetId}
                    </span>
                    <span className="font-medium text-slate-900 truncate">{item.name}</span>
                    <span aria-hidden="true" className="text-slate-300">·</span>
                    <span className="text-amber-700 font-medium">Missing Location Record</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5 truncate">
                    Assigned to {item.department}; physical location unverified since {item.lastMovementAt}.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onSelectEquipment(item.id)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg whitespace-nowrap shrink-0"
                >
                  Verify Location
                </button>
              </div>
            ))}

            {approachingInspectionEquipment.slice(0, 2).map((item) => (
              <div key={`insp-${item.id}`} className="py-3 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xs">
                    <ClipboardCheck className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                    <span className="font-mono font-semibold text-slate-900 tabular-nums">
                      {item.assetId}
                    </span>
                    <span className="font-medium text-slate-900 truncate">{item.name}</span>
                    <span aria-hidden="true" className="text-slate-300">·</span>
                    <span className="text-sky-700 font-medium">
                      Inspection Due {item.nextServiceDate}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5 truncate">
                    {item.department} · {item.location || 'Location Pending'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onSelectEquipment(item.id)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg whitespace-nowrap shrink-0"
                >
                  Inspect
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* C. Recent Equipment Activity */}
        <section className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Recent Equipment Activity</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Traceable transfers, fault logs, and maintenance completions
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('movements')}
              className="text-xs font-medium text-teal-700 hover:underline whitespace-nowrap"
            >
              Movement Log
            </button>
          </div>

          <div className="divide-y divide-slate-100 mt-2">
            {sortedHistory.map((ev) => (
              <button
                key={ev.id}
                type="button"
                onClick={() => onSelectEquipment(ev.equipmentId)}
                className="w-full py-3 text-left hover:bg-slate-50 px-1 rounded transition-colors"
              >
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-medium text-slate-900">
                    <span className="font-mono text-teal-700 mr-1.5 tabular-nums">
                      {ev.assetId}
                    </span>
                    {ev.eventType}
                  </span>
                  <span className="font-mono text-[11px] text-slate-400 tabular-nums shrink-0">
                    {ev.timestamp}
                  </span>
                </div>
                <div className="text-xs text-slate-600 mt-0.5">
                  {ev.previousValue} → <span className="font-medium text-slate-800">{ev.newValue}</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                  {ev.responsibleUser} · {ev.notes}
                </div>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

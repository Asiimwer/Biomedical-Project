import React, { useMemo, useState } from 'react';
import { Download, FileSpreadsheet, Printer } from 'lucide-react';
import {
  EquipmentAsset,
  EquipmentMovement,
  FaultReport,
  MaintenanceTask,
} from '../types/bems';
import { DEPARTMENTS } from '../data/mockBemsData';
import { TechnicalImageGeneratorPanel } from './GeminiAssistantPanels';

interface ReportsViewProps {
  equipment: EquipmentAsset[];
  movements: EquipmentMovement[];
  maintenance: MaintenanceTask[];
  faults: FaultReport[];
  onSelectEquipment: (equipmentId: string) => void;
}

function downloadCsv(filename: string, headers: string[], rows: string[][]) {
  const escape = (v: string) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [
    headers.map(escape).join(','),
    ...rows.map((r) => r.map(escape).join(',')),
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

const MONTHLY_FAULT_DEMO = [
  { month: 'Jun 2026', count: 5 },
  { month: 'Jul 2026', count: 7 },
  { month: 'Aug 2026', count: 4 },
  { month: 'Sep 2026', count: 6 },
  { month: 'Oct 2026', count: 8 },
  { month: 'Nov 2026', count: 4 },
];

export const ReportsView: React.FC<ReportsViewProps> = ({
  equipment,
  movements,
  maintenance,
  faults,
  onSelectEquipment,
}) => {
  const [dateRange, setDateRange] = useState<'30d' | '90d' | 'ytd' | 'all'>('90d');

  const completedCount = maintenance.filter((m) => m.status === 'Completed').length;
  const overdueTasks = maintenance.filter((m) => m.status === 'Overdue');
  const completionRate =
    maintenance.length > 0 ? Math.round((completedCount / maintenance.length) * 100) : 0;

  const incompleteRecords = useMemo(
    () =>
      equipment.filter(
        (e) => !e.location.trim() || !e.serialNumber.trim() || e.nextServiceDate === 'N/A'
      ),
    [equipment]
  );

  const downtimeRecords = useMemo(
    () =>
      equipment
        .filter((e) => e.status === 'Faulty' || e.status === 'Under Maintenance')
        .map((e) => ({
          id: e.id,
          assetId: e.assetId,
          name: e.name,
          department: e.department,
          status: e.status,
          since: e.lastMovementAt,
          reason: e.notes || 'Pending engineering clearance',
        })),
    [equipment]
  );

  const deptDistribution = DEPARTMENTS.map((d) => ({
    dept: d,
    count: equipment.filter((e) => e.department === d).length,
  }));

  const statusDistribution = [
    'Operational',
    'Faulty',
    'Under Maintenance',
    'Awaiting Inspection',
    'Decommissioned',
  ].map((s) => ({
    status: s,
    count: equipment.filter((e) => e.status === s).length,
  }));

  const handleExportInventory = () => {
    downloadCsv(
      'bems-equipment-inventory.csv',
      [
        'Asset ID',
        'Name',
        'Category',
        'Manufacturer',
        'Model',
        'Serial Number',
        'Department',
        'Location',
        'Condition',
        'Status',
        'Last Service',
        'Next Service',
      ],
      equipment.map((e) => [
        e.assetId,
        e.name,
        e.category,
        e.manufacturer,
        e.model,
        e.serialNumber,
        e.department,
        e.location || 'MISSING',
        e.condition,
        e.status,
        e.lastServiceDate,
        e.nextServiceDate,
      ])
    );
  };

  const handleExportFaultsAndMaintCsv = () => {
    downloadCsv(
      'bems-audit-faults-maintenance.csv',
      ['Record Type', 'Code / Asset', 'Equipment', 'Department / Engineer', 'Priority / Severity', 'Status', 'Date'],
      [
        ...faults.map((f) => [
          'Fault Report',
          `${f.faultCode} (${f.assetId})`,
          f.equipmentName,
          f.reportingDepartment,
          f.severity,
          f.status,
          f.reportedAt,
        ]),
        ...maintenance.map((m) => [
          `Maintenance (${m.type})`,
          m.assetId,
          m.equipmentName,
          m.assignedEngineer,
          m.priority,
          m.status,
          m.nextMaintenanceDate,
        ]),
      ]
    );
  };

  const maxFaultBar = Math.max(1, ...MONTHLY_FAULT_DEMO.map((m) => m.count));

  return (
    <div className="space-y-6">
      {/* Header & Exports */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="text-sm font-semibold text-slate-900">
            Departmental Audit & Operations Analytics (Demonstration Dataset)
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span>Reporting Window:</span>
            <div className="inline-flex p-0.5 bg-slate-100 rounded-lg">
              {(
                [
                  ['30d', 'Last 30 Days'],
                  ['90d', 'Last 90 Days'],
                  ['ytd', 'Year to Date'],
                  ['all', 'All Records'],
                ] as const
              ).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setDateRange(val)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    dateRange === val
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportFaultsAndMaintCsv}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Export CSV
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap"
          >
            <Printer className="w-3.5 h-3.5" />
            Generate PDF
          </button>
          <button
            type="button"
            onClick={handleExportInventory}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            Download Equipment Inventory
          </button>
        </div>
      </div>

      {/* Top Analytic Summary Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500">Maintenance Completion Rate</div>
          <div className="mt-1.5 text-2xl font-display font-bold text-slate-900 tabular-nums">
            {completionRate}%
          </div>
          <div className="text-[11px] text-slate-500 mt-1 tabular-nums">
            {completedCount} of {maintenance.length} scheduled tasks closed
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500">Overdue Maintenance Tasks</div>
          <div className="mt-1.5 text-2xl font-display font-bold text-red-700 tabular-nums">
            {overdueTasks.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Requires engineering prioritization</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500">Movement Activity ({dateRange.toUpperCase()})</div>
          <div className="mt-1.5 text-2xl font-display font-bold text-slate-900 tabular-nums">
            {movements.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 tabular-nums">
            {movements.filter((m) => m.status === 'Overdue' || m.status === 'Pending Approval').length} pending/overdue custody
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500">Incomplete / Unverified Records</div>
          <div className="mt-1.5 text-2xl font-display font-bold text-amber-700 tabular-nums">
            {incompleteRecords.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Missing location or schedule</div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Fault Reports by Month */}
        <section className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-900">
            Fault Reports by Month (Demo)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            6-month biomedical fault ticket volume ({dateRange})
          </p>
          <div className="mt-6 h-44 flex items-end justify-between gap-3 px-1">
            {MONTHLY_FAULT_DEMO.map((m) => (
              <div key={m.month} className="flex-1 flex flex-col items-center gap-2">
                <span className="font-mono text-xs font-semibold text-slate-700 tabular-nums">
                  {m.count}
                </span>
                <div className="w-full bg-slate-100 rounded-t-md h-28 flex items-end">
                  <div
                    className="w-full bg-slate-800 rounded-t-md transition-all"
                    style={{ height: `${(m.count / maxFaultBar) * 100}%` }}
                  />
                </div>
                <span className="text-[11px] text-slate-500 whitespace-nowrap">
                  {m.month.split(' ')[0]}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Status Distribution */}
        <section className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-900">Equipment Status Distribution</h3>
          <p className="text-xs text-slate-500 mt-0.5">Live inventory status breakdown</p>
          <div className="mt-4 space-y-3">
            {statusDistribution.map((s) => (
              <div key={s.status} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-700">{s.status}</span>
                  <span className="font-mono font-semibold text-slate-900 tabular-nums">
                    {s.count}
                  </span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-teal-700 rounded-full"
                    style={{
                      width: `${equipment.length > 0 ? (s.count / equipment.length) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Department Distribution */}
        <section className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-900">Distribution by Department</h3>
          <p className="text-xs text-slate-500 mt-0.5">Registered assets per clinical unit</p>
          <div className="mt-4 space-y-2.5">
            {deptDistribution.map((d) => (
              <div key={d.dept} className="flex items-center justify-between text-xs py-1 border-b border-slate-100 last:border-b-0">
                <span className="text-slate-700 truncate pr-2">{d.dept}</span>
                <span className="font-mono font-semibold text-slate-900 tabular-nums">
                  {d.count}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Downtime & Incomplete Records Audit Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-900">Equipment Downtime Log</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Devices currently out of service due to faults or repair
          </p>
          <div className="mt-3 divide-y divide-slate-100">
            {downtimeRecords.length === 0 ? (
              <div className="py-6 text-xs text-slate-500">No active equipment downtime.</div>
            ) : (
              downtimeRecords.map((rec) => (
                <div key={rec.id} className="py-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <button
                      type="button"
                      onClick={() => onSelectEquipment(rec.id)}
                      className="text-xs font-semibold text-slate-900 hover:text-teal-700 hover:underline"
                    >
                      <span className="font-mono text-teal-800 mr-1.5">{rec.assetId}</span>
                      {rec.name}
                    </button>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {rec.department} · Out since {rec.since}
                    </div>
                    <div className="text-xs text-slate-600 mt-0.5 truncate">{rec.reason}</div>
                  </div>
                  <span className="text-xs font-medium text-red-700 shrink-0">{rec.status}</span>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-900">
            Incomplete & Unverified Asset Records
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Equipment requiring location verification or schedule completion before audit
          </p>
          <div className="mt-3 divide-y divide-slate-100">
            {incompleteRecords.length === 0 ? (
              <div className="py-6 text-xs text-slate-500">All asset records verified.</div>
            ) : (
              incompleteRecords.map((rec) => (
                <div key={rec.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <button
                      type="button"
                      onClick={() => onSelectEquipment(rec.id)}
                      className="text-xs font-semibold text-slate-900 hover:text-teal-700 hover:underline"
                    >
                      <span className="font-mono text-teal-800 mr-1.5">{rec.assetId}</span>
                      {rec.name}
                    </button>
                    <div className="text-xs text-amber-800 mt-0.5">
                      {!rec.location.trim() ? 'Missing current physical location' : 'Decommissioned / N/A service cycle'}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onSelectEquipment(rec.id)}
                    className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200 shrink-0"
                  >
                    Resolve
                  </button>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {/* High-Res SOP Technical Illustration Generator */}
      <TechnicalImageGeneratorPanel />
    </div>
  );
};

import React, { useMemo, useState } from 'react';
import { AlertOctagon, Plus, Search, ShieldAlert, X } from 'lucide-react';
import {
  EquipmentAsset,
  FaultReport,
  FaultStatus,
  PriorityLevel,
  UserRole,
} from '../types/bems';
import { DEPARTMENTS, ENGINEERS } from '../data/mockBemsData';
import { PriorityText, StatusIndicator } from './StatusText';

interface FaultReportsViewProps {
  equipment: EquipmentAsset[];
  faults: FaultReport[];
  activeRole: UserRole;
  preselectedEquipmentId?: string | null;
  onClearPreselect: () => void;
  onReportFault: (fault: FaultReport) => void;
  onUpdateFault: (fault: FaultReport) => void;
  onSelectEquipment: (equipmentId: string) => void;
}

const SEVERITIES: PriorityLevel[] = ['Critical', 'High', 'Medium', 'Low'];
const FAULT_STATUSES: FaultStatus[] = [
  'Reported',
  'Under Investigation',
  'Awaiting Parts',
  'Under Repair',
  'Resolved',
  'Closed',
];

export const FaultReportsView: React.FC<FaultReportsViewProps> = ({
  equipment,
  faults,
  activeRole,
  preselectedEquipmentId,
  onClearPreselect,
  onReportFault,
  onUpdateFault,
  onSelectEquipment,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  const [showReportModal, setShowReportModal] = useState(Boolean(preselectedEquipmentId));
  const [editingFault, setEditingFault] = useState<FaultReport | null>(null);

  const canReport = activeRole !== 'Read-Only/Auditor';
  const canTriage = activeRole === 'Administrator' || activeRole === 'Biomedical Engineer';

  const defaultEq =
    equipment.find((e) => e.id === preselectedEquipmentId) || equipment[0];

  const [reportForm, setReportForm] = useState({
    equipmentId: defaultEq?.id || '',
    reportingDepartment: defaultEq?.department || DEPARTMENTS[0],
    reportedBy: 'Nurse Elena Brooks',
    severity: 'High' as PriorityLevel,
    description: '',
    assignedEngineer: ENGINEERS[0] as string,
  });

  const activeCriticalFaults = faults.filter(
    (f) => f.severity === 'Critical' && f.status !== 'Closed' && f.status !== 'Resolved'
  );

  const filteredFaults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return [...faults]
      .sort((a, b) => b.reportedAt.localeCompare(a.reportedAt))
      .filter((f) => {
        if (severityFilter !== 'All' && f.severity !== severityFilter) return false;
        if (statusFilter !== 'All' && f.status !== statusFilter) return false;
        if (!q) return true;
        return (
          f.faultCode.toLowerCase().includes(q) ||
          f.assetId.toLowerCase().includes(q) ||
          f.equipmentName.toLowerCase().includes(q) ||
          f.description.toLowerCase().includes(q)
        );
      });
  }, [faults, searchQuery, severityFilter, statusFilter]);

  const handleReportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const eq = equipment.find((item) => item.id === reportForm.equipmentId);
    if (!eq || !reportForm.description.trim()) return;

    const newFault: FaultReport = {
      id: `flt-${Date.now()}`,
      faultCode: `FLT-2026-${String(faults.length + 43).padStart(3, '0')}`,
      equipmentId: eq.id,
      assetId: eq.assetId,
      equipmentName: eq.name,
      reportingDepartment: reportForm.reportingDepartment,
      reportedBy: reportForm.reportedBy.trim() || 'Clinical Staff',
      reportedAt: '2026-11-25 09:15',
      description: reportForm.description.trim(),
      severity: reportForm.severity,
      status: 'Reported',
      assignedEngineer: reportForm.assignedEngineer,
      resolutionNotes: '',
      resolutionDate: '',
    };
    onReportFault(newFault);
    setShowReportModal(false);
    onClearPreselect();
    setReportForm((prev) => ({ ...prev, description: '' }));
  };

  const handleUpdateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFault) return;
    onUpdateFault({
      ...editingFault,
      resolutionDate:
        editingFault.status === 'Resolved' || editingFault.status === 'Closed'
          ? editingFault.resolutionDate || '2026-11-25 10:00'
          : editingFault.resolutionDate,
    });
    setEditingFault(null);
  };

  return (
    <div className="space-y-5">
      {/* Critical Fault Prominent Alert */}
      {activeCriticalFaults.length > 0 && (
        <div className="bg-red-50 border border-red-300 rounded-xl p-4 flex items-start gap-3">
          <AlertOctagon className="w-5 h-5 text-red-700 shrink-0 mt-0.5" />
          <div className="text-xs text-red-900 space-y-1">
            <div className="text-sm font-semibold">
              {activeCriticalFaults.length} Active Critical Equipment Fault
              {activeCriticalFaults.length > 1 ? 's' : ''} Logged
            </div>
            <p>
              Affected units ({activeCriticalFaults.map((f) => f.assetId).join(', ')}) require immediate isolation and biomedical engineering assessment. BEMS logs fault status for engineering workflow only and never certifies a device as clinically safe.
            </p>
          </div>
        </div>
      )}

      {/* Non-certification safety note */}
      <div className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 flex items-center gap-2.5 text-xs text-slate-600">
        <ShieldAlert className="w-4 h-4 text-slate-500 shrink-0" />
        <span>
          Safety Notice: Reporting or resolving a fault ticket records engineering workflow traceability; qualified personnel must perform physical safety testing before clinical use.
        </span>
      </div>

      {/* Controls */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[260px]">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search fault ID, asset ID, or description..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
          </div>

          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            aria-label="Filter by severity"
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
          >
            <option value="All">All Severities</option>
            {SEVERITIES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by fault status"
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
          >
            <option value="All">All Fault Statuses</option>
            {FAULT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          disabled={!canReport}
          onClick={() => setShowReportModal(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-red-700 rounded-lg hover:bg-red-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          Report a Fault
        </button>
      </div>

      {/* Fault Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                <th className="py-3 px-4 whitespace-nowrap">Fault ID / Equipment</th>
                <th className="py-3 px-4 whitespace-nowrap">Reported By & Dept</th>
                <th className="py-3 px-4">Fault Description & Resolution</th>
                <th className="py-3 px-4 whitespace-nowrap">Severity</th>
                <th className="py-3 px-4 whitespace-nowrap">Status</th>
                <th className="py-3 px-4 whitespace-nowrap">Assigned Engineer</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredFaults.map((fault) => (
                <tr key={fault.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="font-mono text-xs text-slate-500 tabular-nums">
                      {fault.faultCode}
                    </div>
                    <button
                      type="button"
                      onClick={() => onSelectEquipment(fault.equipmentId)}
                      className="text-left font-medium text-slate-900 hover:text-teal-700 hover:underline mt-0.5"
                    >
                      <span className="font-mono text-xs text-teal-800 mr-1.5">
                        {fault.assetId}
                      </span>
                      {fault.equipmentName}
                    </button>
                  </td>
                  <td className="py-3 px-4 text-xs whitespace-nowrap">
                    <div className="font-medium text-slate-900">{fault.reportingDepartment}</div>
                    <div className="text-slate-600">{fault.reportedBy}</div>
                    <div className="font-mono text-[11px] text-slate-400 tabular-nums">
                      {fault.reportedAt}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-xs max-w-md">
                    <div className="text-slate-800 leading-relaxed">{fault.description}</div>
                    {fault.resolutionNotes && (
                      <div className="mt-1 text-slate-500">
                        <span className="font-medium text-slate-700">Resolution:</span>{' '}
                        {fault.resolutionNotes}
                        {fault.resolutionDate && ` (${fault.resolutionDate})`}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <PriorityText priority={fault.severity} />
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <StatusIndicator status={fault.status} />
                  </td>
                  <td className="py-3 px-4 text-xs text-slate-700 whitespace-nowrap">
                    {fault.assignedEngineer || 'Unassigned'}
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    {canTriage && fault.status !== 'Closed' && (
                      <button
                        type="button"
                        onClick={() => setEditingFault(fault)}
                        className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md"
                      >
                        Update Triage
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Report a Fault Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">Report Equipment Fault</h2>
              <button
                type="button"
                onClick={() => {
                  setShowReportModal(false);
                  onClearPreselect();
                }}
                className="p-1 text-slate-400 hover:text-slate-700 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleReportSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Equipment Asset *
                </label>
                <select
                  value={reportForm.equipmentId}
                  onChange={(e) => {
                    const eq = equipment.find((x) => x.id === e.target.value);
                    setReportForm({
                      ...reportForm,
                      equipmentId: e.target.value,
                      reportingDepartment: eq?.department || reportForm.reportingDepartment,
                    });
                  }}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                >
                  {equipment.map((eq) => (
                    <option key={eq.id} value={eq.id}>
                      {eq.assetId} — {eq.name} ({eq.department})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Reporting Department
                  </label>
                  <select
                    value={reportForm.reportingDepartment}
                    onChange={(e) =>
                      setReportForm({ ...reportForm, reportingDepartment: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  >
                    {DEPARTMENTS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Reported By *
                  </label>
                  <input
                    required
                    type="text"
                    value={reportForm.reportedBy}
                    onChange={(e) => setReportForm({ ...reportForm, reportedBy: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Severity *
                  </label>
                  <select
                    value={reportForm.severity}
                    onChange={(e) =>
                      setReportForm({ ...reportForm, severity: e.target.value as PriorityLevel })
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  >
                    {SEVERITIES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Assign Engineer
                  </label>
                  <select
                    value={reportForm.assignedEngineer}
                    onChange={(e) =>
                      setReportForm({ ...reportForm, assignedEngineer: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  >
                    {ENGINEERS.map((eng) => (
                      <option key={eng} value={eng}>
                        {eng}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Fault Description *
                </label>
                <textarea
                  required
                  rows={3}
                  value={reportForm.description}
                  onChange={(e) => setReportForm({ ...reportForm, description: e.target.value })}
                  placeholder="Describe error codes, abnormal alarms, cable damage, or power failures..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowReportModal(false);
                    onClearPreselect();
                  }}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-red-700 rounded-lg hover:bg-red-800"
                >
                  Submit Fault Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Triage / Update Fault Modal */}
      {editingFault && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">
                Update Fault · {editingFault.faultCode}
              </h2>
              <button
                type="button"
                onClick={() => setEditingFault(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Fault Status
                  </label>
                  <select
                    value={editingFault.status}
                    onChange={(e) =>
                      setEditingFault({
                        ...editingFault,
                        status: e.target.value as FaultStatus,
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  >
                    {FAULT_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Assigned Engineer
                  </label>
                  <select
                    value={editingFault.assignedEngineer}
                    onChange={(e) =>
                      setEditingFault({ ...editingFault, assignedEngineer: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  >
                    {ENGINEERS.map((eng) => (
                      <option key={eng} value={eng}>
                        {eng}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Resolution / Investigation Notes
                </label>
                <textarea
                  rows={3}
                  value={editingFault.resolutionNotes}
                  onChange={(e) =>
                    setEditingFault({ ...editingFault, resolutionNotes: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingFault(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800"
                >
                  Save Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

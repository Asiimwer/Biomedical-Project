import React, { useMemo, useState } from 'react';
import { Calendar as CalendarIcon, CheckCircle2, List, Plus, ShieldCheck, X } from 'lucide-react';
import {
  EquipmentAsset,
  EquipmentCondition,
  EquipmentStatus,
  MaintenanceStatus,
  MaintenanceTask,
  MaintenanceType,
  PriorityLevel,
  UserRole,
} from '../types/bems';
import { ENGINEERS } from '../data/mockBemsData';
import { PriorityText, StatusIndicator } from './StatusText';
import { ClinicalStandardsSearchPanel } from './GeminiAssistantPanels';

interface MaintenanceViewProps {
  equipment: EquipmentAsset[];
  maintenance: MaintenanceTask[];
  activeRole: UserRole;
  preselectedEquipmentId?: string | null;
  onClearPreselect: () => void;
  onCreateTask: (task: MaintenanceTask) => void;
  onCompleteTask: (
    task: MaintenanceTask,
    verifiedCondition: EquipmentCondition,
    verifiedStatus: EquipmentStatus
  ) => void;
  onSelectEquipment: (equipmentId: string) => void;
}

const MAINT_TYPES: MaintenanceType[] = [
  'Preventive Maintenance',
  'Corrective Maintenance',
  'Inspection',
  'Calibration',
  'Safety Testing',
];

const MAINT_STATUSES: MaintenanceStatus[] = [
  'Scheduled',
  'In Progress',
  'Completed',
  'Overdue',
  'Awaiting Parts',
];

const PRIORITIES: PriorityLevel[] = ['Critical', 'High', 'Medium', 'Low'];

export const MaintenanceView: React.FC<MaintenanceViewProps> = ({
  equipment,
  maintenance,
  activeRole,
  preselectedEquipmentId,
  onClearPreselect,
  onCreateTask,
  onCompleteTask,
  onSelectEquipment,
}) => {
  const [viewMode, setViewMode] = useState<'table' | 'calendar'>('table');
  const [typeFilter, setTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  const [showCreateModal, setShowCreateModal] = useState(Boolean(preselectedEquipmentId));
  const [completingTask, setCompletingTask] = useState<MaintenanceTask | null>(null);

  const canModify = activeRole === 'Administrator' || activeRole === 'Biomedical Engineer';

  const defaultEq =
    equipment.find((e) => e.id === preselectedEquipmentId) || equipment[0];

  const [createForm, setCreateForm] = useState({
    equipmentId: defaultEq?.id || '',
    type: 'Corrective Maintenance' as MaintenanceType,
    nextMaintenanceDate: '2026-11-28',
    assignedEngineer: ENGINEERS[0] as string,
    priority: 'High' as PriorityLevel,
    instructions: '',
  });

  const [completeForm, setCompleteForm] = useState({
    workPerformed: '',
    faultsDiscovered: 'None observed',
    partsReplaced: 'None required',
    completionDate: '2026-11-25',
    completedBy: ENGINEERS[0] as string,
    postCondition: 'Good' as EquipmentCondition,
    verifiedStatus: 'Operational' as EquipmentStatus,
    recommendations: '',
    nextMaintenanceDate: '2027-05-25',
  });

  const filteredTasks = useMemo(() => {
    return [...maintenance]
      .sort((a, b) => a.nextMaintenanceDate.localeCompare(b.nextMaintenanceDate))
      .filter((t) => {
        if (typeFilter !== 'All' && t.type !== typeFilter) return false;
        if (statusFilter !== 'All' && t.status !== statusFilter) return false;
        return true;
      });
  }, [maintenance, typeFilter, statusFilter]);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const eq = equipment.find((item) => item.id === createForm.equipmentId);
    if (!eq) return;
    const newTask: MaintenanceTask = {
      id: `mnt-${Date.now()}`,
      equipmentId: eq.id,
      assetId: eq.assetId,
      equipmentName: eq.name,
      type: createForm.type,
      lastMaintenanceDate: eq.lastServiceDate,
      nextMaintenanceDate: createForm.nextMaintenanceDate,
      assignedEngineer: createForm.assignedEngineer,
      priority: createForm.priority,
      status: 'Scheduled',
      instructions:
        createForm.instructions.trim() ||
        `Execute standard ${createForm.type.toLowerCase()} checklist.`,
      workPerformed: '',
      faultsDiscovered: '',
      partsReplaced: '',
      completionDate: '',
      completedBy: '',
      postCondition: '',
      recommendations: '',
    };
    onCreateTask(newTask);
    setShowCreateModal(false);
    onClearPreselect();
    setCreateForm((prev) => ({ ...prev, instructions: '' }));
  };

  const openCompleteModal = (task: MaintenanceTask) => {
    setCompletingTask(task);
    setCompleteForm({
      workPerformed: task.workPerformed || '',
      faultsDiscovered: task.faultsDiscovered || 'None observed',
      partsReplaced: task.partsReplaced || 'None required',
      completionDate: '2026-11-25',
      completedBy: task.assignedEngineer || ENGINEERS[0],
      postCondition: 'Good',
      verifiedStatus: 'Operational',
      recommendations: 'Verified by engineer; cleared for department return.',
      nextMaintenanceDate: '2027-05-25',
    });
  };

  const handleCompleteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!completingTask) return;
    const completedTask: MaintenanceTask = {
      ...completingTask,
      status: 'Completed',
      lastMaintenanceDate: completeForm.completionDate,
      nextMaintenanceDate: completeForm.nextMaintenanceDate,
      workPerformed: completeForm.workPerformed.trim() || 'Maintenance checklist executed.',
      faultsDiscovered: completeForm.faultsDiscovered.trim() || 'None',
      partsReplaced: completeForm.partsReplaced.trim() || 'None',
      completionDate: completeForm.completionDate,
      completedBy: completeForm.completedBy,
      postCondition: completeForm.postCondition,
      recommendations: completeForm.recommendations.trim(),
    };
    onCompleteTask(completedTask, completeForm.postCondition, completeForm.verifiedStatus);
    setCompletingTask(null);
  };

  // Group tasks by month/date for Calendar timeline view
  const calendarGroups = useMemo(() => {
    const map = new Map<string, MaintenanceTask[]>();
    for (const t of filteredTasks) {
      const key = t.nextMaintenanceDate || 'Unscheduled';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredTasks]);

  return (
    <div className="space-y-5">
      {/* Safety Governance Banner */}
      <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-start gap-3 text-xs text-slate-700">
        <ShieldCheck className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-slate-900">Engineering Sign-Off Required:</span>{' '}
          Completing a maintenance task records service history, but does not automatically mark an asset operational. A qualified biomedical engineer must explicitly verify and record post-service condition and status.
        </div>
      </div>

      {/* Controls Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                viewMode === 'table'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              Schedule Table
            </button>
            <button
              type="button"
              onClick={() => setViewMode('calendar')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                viewMode === 'calendar'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              Timeline Calendar
            </button>
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            aria-label="Filter maintenance type"
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg"
          >
            <option value="All">All Maintenance Types</option>
            {MAINT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter maintenance status"
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg"
          >
            <option value="All">All Statuses</option>
            {MAINT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          disabled={!canModify}
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          Create Maintenance Task
        </button>
      </div>

      {/* Table vs Calendar View */}
      {viewMode === 'table' ? (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-4 whitespace-nowrap">Equipment</th>
                  <th className="py-3 px-4 whitespace-nowrap">Maintenance Type</th>
                  <th className="py-3 px-4 whitespace-nowrap">Last / Next Date</th>
                  <th className="py-3 px-4 whitespace-nowrap">Assigned Engineer</th>
                  <th className="py-3 px-4 whitespace-nowrap">Priority</th>
                  <th className="py-3 px-4 whitespace-nowrap">Status</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredTasks.map((task) => (
                  <tr key={task.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => onSelectEquipment(task.equipmentId)}
                        className="text-left group"
                      >
                        <div className="font-mono text-xs font-semibold text-teal-800 group-hover:underline tabular-nums">
                          {task.assetId}
                        </div>
                        <div className="font-medium text-slate-900">{task.equipmentName}</div>
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-xs font-medium text-slate-900">{task.type}</div>
                      <div className="text-[11px] text-slate-500 max-w-xs truncate">
                        {task.instructions}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-xs tabular-nums whitespace-nowrap">
                      <div className="text-slate-900">Next: {task.nextMaintenanceDate}</div>
                      <div className="text-[11px] text-slate-400">
                        Last: {task.lastMaintenanceDate || 'N/A'}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-700 whitespace-nowrap">
                      {task.assignedEngineer}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <PriorityText priority={task.priority} />
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <StatusIndicator status={task.status} />
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      {task.status === 'Completed' ? (
                        <span className="text-xs text-emerald-700 font-medium inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Verified ({task.postCondition})
                        </span>
                      ) : (
                        canModify && (
                          <button
                            type="button"
                            onClick={() => openCompleteModal(task)}
                            className="px-3 py-1.5 text-xs font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-md transition-colors"
                          >
                            Complete Task
                          </button>
                        )
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="text-sm font-semibold text-slate-900">
            Upcoming & Overdue Maintenance Timeline
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {calendarGroups.map(([dateKey, items]) => (
              <div key={dateKey} className="border border-slate-200 rounded-lg p-4 space-y-3 bg-slate-50/50">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="font-mono text-xs font-semibold text-slate-900 tabular-nums">
                    {dateKey}
                  </span>
                  <span className="text-xs text-slate-500 tabular-nums">
                    {items.length} task{items.length > 1 ? 's' : ''}
                  </span>
                </div>
                <div className="space-y-2.5">
                  {items.map((t) => (
                    <div
                      key={t.id}
                      className="bg-white border border-slate-200 rounded-lg p-3 space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => onSelectEquipment(t.equipmentId)}
                          className="font-mono text-xs font-semibold text-teal-800 hover:underline tabular-nums"
                        >
                          {t.assetId} · {t.equipmentName}
                        </button>
                        <StatusIndicator status={t.status} />
                      </div>
                      <div className="text-xs text-slate-700">
                        {t.type} · {t.assignedEngineer}
                      </div>
                      {t.status !== 'Completed' && canModify && (
                        <button
                          type="button"
                          onClick={() => openCompleteModal(t)}
                          className="text-xs font-medium text-teal-700 hover:underline"
                        >
                          Record Completion →
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search-grounded biomedical standards lookup */}
      <ClinicalStandardsSearchPanel />

      {/* Create Maintenance Task Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">Create Maintenance Task</h2>
              <button
                type="button"
                onClick={() => {
                  setShowCreateModal(false);
                  onClearPreselect();
                }}
                className="p-1 text-slate-400 hover:text-slate-700 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Equipment Asset *
                </label>
                <select
                  value={createForm.equipmentId}
                  onChange={(e) => setCreateForm({ ...createForm, equipmentId: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                >
                  {equipment.map((eq) => (
                    <option key={eq.id} value={eq.id}>
                      {eq.assetId} — {eq.name} ({eq.status})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Maintenance Type
                  </label>
                  <select
                    value={createForm.type}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        type: e.target.value as MaintenanceType,
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  >
                    {MAINT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Scheduled Date *
                  </label>
                  <input
                    required
                    type="date"
                    value={createForm.nextMaintenanceDate}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, nextMaintenanceDate: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Assigned Engineer
                  </label>
                  <select
                    value={createForm.assignedEngineer}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, assignedEngineer: e.target.value })
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
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Priority</label>
                  <select
                    value={createForm.priority}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        priority: e.target.value as PriorityLevel,
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Maintenance Instructions *
                </label>
                <textarea
                  required
                  rows={3}
                  value={createForm.instructions}
                  onChange={(e) => setCreateForm({ ...createForm, instructions: e.target.value })}
                  placeholder="Describe inspection scope, calibration targets, or corrective actions..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    onClearPreselect();
                  }}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800"
                >
                  Save Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Complete Maintenance Task Modal */}
      {completingTask && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Complete Maintenance · {completingTask.assetId}
                </h2>
                <p className="text-xs text-slate-500">
                  {completingTask.equipmentName} ({completingTask.type})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCompletingTask(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCompleteSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Work Performed *
                </label>
                <textarea
                  required
                  rows={2}
                  value={completeForm.workPerformed}
                  onChange={(e) =>
                    setCompleteForm({ ...completeForm, workPerformed: e.target.value })
                  }
                  placeholder="Detail repairs, electrical safety tests, and calibration measurements..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Faults Discovered
                  </label>
                  <input
                    type="text"
                    value={completeForm.faultsDiscovered}
                    onChange={(e) =>
                      setCompleteForm({ ...completeForm, faultsDiscovered: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Parts Replaced
                  </label>
                  <input
                    type="text"
                    value={completeForm.partsReplaced}
                    onChange={(e) =>
                      setCompleteForm({ ...completeForm, partsReplaced: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Completion Date *
                  </label>
                  <input
                    required
                    type="date"
                    value={completeForm.completionDate}
                    onChange={(e) =>
                      setCompleteForm({ ...completeForm, completionDate: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Engineer Responsible *
                  </label>
                  <select
                    value={completeForm.completedBy}
                    onChange={(e) =>
                      setCompleteForm({ ...completeForm, completedBy: e.target.value })
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
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Verified Post-Maintenance Condition *
                  </label>
                  <select
                    value={completeForm.postCondition}
                    onChange={(e) =>
                      setCompleteForm({
                        ...completeForm,
                        postCondition: e.target.value as EquipmentCondition,
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  >
                    {(['Excellent', 'Good', 'Fair', 'Needs Repair', 'Unserviceable'] as EquipmentCondition[]).map(
                      (c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      )
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Engineer-Assessed Operational Status *
                  </label>
                  <select
                    value={completeForm.verifiedStatus}
                    onChange={(e) =>
                      setCompleteForm({
                        ...completeForm,
                        verifiedStatus: e.target.value as EquipmentStatus,
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  >
                    {(
                      [
                        'Operational',
                        'Awaiting Inspection',
                        'Under Maintenance',
                        'Faulty',
                        'Decommissioned',
                      ] as EquipmentStatus[]
                    ).map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Next Service Date *
                  </label>
                  <input
                    required
                    type="date"
                    value={completeForm.nextMaintenanceDate}
                    onChange={(e) =>
                      setCompleteForm({ ...completeForm, nextMaintenanceDate: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Recommendations
                </label>
                <textarea
                  rows={2}
                  value={completeForm.recommendations}
                  onChange={(e) =>
                    setCompleteForm({ ...completeForm, recommendations: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCompletingTask(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-teal-700 rounded-lg hover:bg-teal-800"
                >
                  Sign Off & Update History
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

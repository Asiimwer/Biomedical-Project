import React, { useMemo, useState } from 'react';
import { ArrowLeftRight, Info, Plus, Search, X } from 'lucide-react';
import {
  EquipmentAsset,
  EquipmentMovement,
  MovementStatus,
  UserRole,
} from '../types/bems';
import { DEPARTMENTS } from '../data/mockBemsData';
import { StatusIndicator } from './StatusText';

interface MovementsViewProps {
  equipment: EquipmentAsset[];
  movements: EquipmentMovement[];
  activeRole: UserRole;
  preselectedEquipmentId?: string | null;
  onClearPreselect: () => void;
  onRecordMovement: (movement: EquipmentMovement) => void;
  onUpdateMovementStatus: (movement: EquipmentMovement, newStatus: MovementStatus) => void;
  onSelectEquipment: (equipmentId: string) => void;
}

const MOVEMENT_STATUSES: MovementStatus[] = [
  'Pending Approval',
  'Released',
  'In Transit',
  'Received',
  'Returned',
  'Overdue',
];

export const MovementsView: React.FC<MovementsViewProps> = ({
  equipment,
  movements,
  activeRole,
  preselectedEquipmentId,
  onClearPreselect,
  onRecordMovement,
  onUpdateMovementStatus,
  onSelectEquipment,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showModal, setShowModal] = useState(Boolean(preselectedEquipmentId));

  const defaultEq =
    equipment.find((e) => e.id === preselectedEquipmentId) || equipment[0];

  const [form, setForm] = useState({
    equipmentId: defaultEq?.id || '',
    destinationDepartment: 'Intensive Care Unit',
    destinationLocation: 'ICU Bed 01',
    authorizingPerson: 'Eng. Marcus Vance',
    releasingPerson: 'Nurse Rachel Kim',
    receivingPerson: 'ICU Charge Nurse',
    movementDate: '2026-11-25 09:00',
    expectedReturnDate: '2026-12-05',
    status: 'Received' as MovementStatus,
    notes: '',
  });

  const selectedEquipment = equipment.find((e) => e.id === form.equipmentId) || defaultEq;

  const canRecord = activeRole !== 'Read-Only/Auditor';
  const canApprove = activeRole === 'Administrator' || activeRole === 'Biomedical Engineer';

  const filteredMovements = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return [...movements]
      .sort((a, b) => b.movementDate.localeCompare(a.movementDate))
      .filter((m) => {
        if (statusFilter !== 'All' && m.status !== statusFilter) return false;
        if (!q) return true;
        return (
          m.assetId.toLowerCase().includes(q) ||
          m.equipmentName.toLowerCase().includes(q) ||
          m.originDepartment.toLowerCase().includes(q) ||
          m.destinationDepartment.toLowerCase().includes(q) ||
          m.receivingPerson.toLowerCase().includes(q)
        );
      });
  }, [movements, searchQuery, statusFilter]);

  const openModalFor = (eqId?: string) => {
    const target = equipment.find((e) => e.id === eqId) || equipment[0];
    if (target) {
      setForm((prev) => ({
        ...prev,
        equipmentId: target.id,
        destinationDepartment:
          target.department === 'Emergency Department'
            ? 'Intensive Care Unit'
            : 'Emergency Department',
      }));
    }
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEquipment) return;
    const newMovement: EquipmentMovement = {
      id: `mov-${Date.now()}`,
      equipmentId: selectedEquipment.id,
      assetId: selectedEquipment.assetId,
      equipmentName: selectedEquipment.name,
      originDepartment: selectedEquipment.department,
      originLocation: selectedEquipment.location || 'Unverified Location',
      destinationDepartment: form.destinationDepartment,
      destinationLocation: form.destinationLocation.trim() || 'Assigned Receiving Bay',
      authorizingPerson: form.authorizingPerson.trim() || 'Biomedical Lead',
      releasingPerson: form.releasingPerson.trim() || 'Department Staff',
      receivingPerson: form.receivingPerson.trim() || 'Receiving Staff',
      movementDate: form.movementDate,
      expectedReturnDate: form.expectedReturnDate,
      actualReturnDate: form.status === 'Returned' ? '2026-11-25' : '',
      status: form.status,
      notes: form.notes.trim() || 'Standard inter-departmental equipment transfer.',
    };
    onRecordMovement(newMovement);
    setShowModal(false);
    onClearPreselect();
  };

  return (
    <div className="space-y-5">
      {/* Accountability Scope Clarification */}
      <div className="bg-sky-50 border border-sky-200 rounded-xl px-4 py-3 flex items-start gap-3 text-xs text-sky-900">
        <Info className="w-4 h-4 text-sky-700 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold">Custody & Accountability Ledger:</span> Movement logs establish chain-of-custody between releasing and receiving personnel and automatically update the asset&apos;s recorded history. BEMS does not perform automated physical or GPS tracking.
        </div>
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
              placeholder="Search by Asset ID, device, department, or staff..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter movement status"
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
          >
            <option value="All">All Movement Statuses</option>
            {MOVEMENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          disabled={!canRecord}
          onClick={() => openModalFor(preselectedEquipmentId || undefined)}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          Record Equipment Movement
        </button>
      </div>

      {/* Movement Log Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                <th className="py-3 px-4 whitespace-nowrap">Equipment</th>
                <th className="py-3 px-4 whitespace-nowrap">Origin → Destination</th>
                <th className="py-3 px-4 whitespace-nowrap">Custody Sign-Off</th>
                <th className="py-3 px-4 whitespace-nowrap">Movement / Return Dates</th>
                <th className="py-3 px-4 whitespace-nowrap">Status</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Workflow</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredMovements.map((mov) => (
                <tr key={mov.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4">
                    <button
                      type="button"
                      onClick={() => onSelectEquipment(mov.equipmentId)}
                      className="text-left group"
                    >
                      <div className="font-mono text-xs font-semibold text-teal-800 group-hover:underline tabular-nums">
                        {mov.assetId}
                      </div>
                      <div className="text-sm font-medium text-slate-900">{mov.equipmentName}</div>
                    </button>
                  </td>
                  <td className="py-3 px-4 text-xs">
                    <div className="text-slate-600">
                      <span className="font-medium text-slate-800">{mov.originDepartment}</span> ·{' '}
                      {mov.originLocation}
                    </div>
                    <div className="flex items-center gap-1 text-slate-900 font-medium mt-0.5">
                      <ArrowLeftRight className="w-3 h-3 text-teal-700 shrink-0" />
                      <span>
                        {mov.destinationDepartment} · {mov.destinationLocation}
                      </span>
                    </div>
                    {mov.notes && (
                      <div className="text-[11px] text-slate-500 mt-1 max-w-xs truncate">
                        {mov.notes}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4 text-xs space-y-0.5">
                    <div className="text-slate-600">
                      Auth: <span className="text-slate-900 font-medium">{mov.authorizingPerson}</span>
                    </div>
                    <div className="text-slate-600">
                      Released: <span className="text-slate-800">{mov.releasingPerson}</span>
                    </div>
                    <div className="text-slate-600">
                      Received: <span className="text-slate-800">{mov.receivingPerson}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 font-mono text-xs tabular-nums whitespace-nowrap">
                    <div className="text-slate-900">{mov.movementDate}</div>
                    {mov.expectedReturnDate && (
                      <div className="text-[11px] text-slate-500">
                        Exp. Return: {mov.expectedReturnDate}
                      </div>
                    )}
                    {mov.actualReturnDate && (
                      <div className="text-[11px] text-emerald-700">
                        Returned: {mov.actualReturnDate}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <StatusIndicator status={mov.status} />
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    {canApprove && mov.status !== 'Returned' && (
                      <div className="inline-flex items-center gap-1.5">
                        {mov.status === 'Pending Approval' && (
                          <button
                            type="button"
                            onClick={() => onUpdateMovementStatus(mov, 'Received')}
                            className="px-2.5 py-1 text-xs font-medium text-teal-800 bg-teal-50 border border-teal-200 rounded-md hover:bg-teal-100"
                          >
                            Confirm Receipt
                          </button>
                        )}
                        {(mov.status === 'Received' ||
                          mov.status === 'Overdue' ||
                          mov.status === 'Released' ||
                          mov.status === 'In Transit') && (
                          <button
                            type="button"
                            onClick={() => onUpdateMovementStatus(mov, 'Returned')}
                            className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md"
                          >
                            Mark Returned
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Equipment Movement Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">
                Record Equipment Movement
              </h2>
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  onClearPreselect();
                }}
                className="p-1 text-slate-400 hover:text-slate-700 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  1. Select Equipment *
                </label>
                <select
                  value={form.equipmentId}
                  onChange={(e) => setForm({ ...form, equipmentId: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                >
                  {equipment.map((eq) => (
                    <option key={eq.id} value={eq.id}>
                      {eq.assetId} — {eq.name} ({eq.department})
                    </option>
                  ))}
                </select>
              </div>

              {selectedEquipment && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700">
                  <span className="font-medium text-slate-900">2. Originating Location:</span>{' '}
                  {selectedEquipment.department} ·{' '}
                  {selectedEquipment.location || 'Unverified / Missing Location'}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    3. Destination Department *
                  </label>
                  <select
                    value={form.destinationDepartment}
                    onChange={(e) => setForm({ ...form, destinationDepartment: e.target.value })}
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
                    Destination Specific Location *
                  </label>
                  <input
                    required
                    type="text"
                    value={form.destinationLocation}
                    onChange={(e) => setForm({ ...form, destinationLocation: e.target.value })}
                    placeholder="e.g. ICU Bed 01"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Authorizing Person
                  </label>
                  <input
                    required
                    type="text"
                    value={form.authorizingPerson}
                    onChange={(e) => setForm({ ...form, authorizingPerson: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    4. Releasing Person *
                  </label>
                  <input
                    required
                    type="text"
                    value={form.releasingPerson}
                    onChange={(e) => setForm({ ...form, releasingPerson: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    5. Receiving Person *
                  </label>
                  <input
                    required
                    type="text"
                    value={form.receivingPerson}
                    onChange={(e) => setForm({ ...form, receivingPerson: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    6. Movement Date & Time *
                  </label>
                  <input
                    required
                    type="text"
                    value={form.movementDate}
                    onChange={(e) => setForm({ ...form, movementDate: e.target.value })}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    7. Expected Return Date
                  </label>
                  <input
                    type="date"
                    value={form.expectedReturnDate}
                    onChange={(e) => setForm({ ...form, expectedReturnDate: e.target.value })}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Movement Status
                  </label>
                  <select
                    value={form.status}
                    onChange={(e) =>
                      setForm({ ...form, status: e.target.value as MovementStatus })
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  >
                    {MOVEMENT_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">8. Notes</label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Reason for transfer, clinical urgency, or accessory kit checklist..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
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
                  Submit Movement Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

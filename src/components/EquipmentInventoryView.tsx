import React, { useMemo, useState } from 'react';
import {
  ArrowUpDown,
  Edit3,
  Eye,
  Plus,
  Search,
  AlertTriangle,
  X,
} from 'lucide-react';
import {
  EquipmentAsset,
  EquipmentCondition,
  EquipmentStatus,
  UserRole,
} from '../types/bems';
import { DEPARTMENTS } from '../data/mockBemsData';
import { ConditionText, StatusIndicator } from './StatusText';

interface EquipmentInventoryViewProps {
  equipment: EquipmentAsset[];
  activeRole: UserRole;
  onSelectEquipment: (id: string) => void;
  onAddEquipment: (item: EquipmentAsset) => void;
  onUpdateEquipment: (item: EquipmentAsset, note: string) => void;
}

type SortKey = 'assetId' | 'name' | 'department' | 'status' | 'nextServiceDate' | 'lastUpdated';

const CATEGORIES = [
  'Diagnostic Cardiology',
  'Patient Monitoring',
  'Fluid Delivery',
  'Resuscitation',
  'Diagnostic Imaging',
  'Anaesthesia & Gas',
  'Airway & Vacuum',
  'Critical Care Life Support',
  'Sterilization',
  'Laboratory Diagnostics',
];

const STATUSES: EquipmentStatus[] = [
  'Operational',
  'Faulty',
  'Under Maintenance',
  'Awaiting Inspection',
  'Decommissioned',
];

const CONDITIONS: EquipmentCondition[] = [
  'Excellent',
  'Good',
  'Fair',
  'Needs Repair',
  'Unserviceable',
];

export const EquipmentInventoryView: React.FC<EquipmentInventoryViewProps> = ({
  equipment,
  activeRole,
  onSelectEquipment,
  onAddEquipment,
  onUpdateEquipment,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [locationFilter, setLocationFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [conditionFilter, setConditionFilter] = useState('All');
  const [sortKey, setSortKey] = useState<SortKey>('assetId');
  const [sortAsc, setSortAsc] = useState(true);

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<EquipmentAsset | null>(null);

  const canModify = activeRole === 'Administrator' || activeRole === 'Biomedical Engineer';

  const uniqueLocations = useMemo(() => {
    const locs = Array.from(new Set(equipment.map((e) => e.location.trim() || 'Missing Location')));
    return locs.sort();
  }, [equipment]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return equipment
      .filter((item) => {
        if (q) {
          const match =
            item.assetId.toLowerCase().includes(q) ||
            item.name.toLowerCase().includes(q) ||
            item.serialNumber.toLowerCase().includes(q) ||
            item.model.toLowerCase().includes(q);
          if (!match) return false;
        }
        if (categoryFilter !== 'All' && item.category !== categoryFilter) return false;
        if (departmentFilter !== 'All' && item.department !== departmentFilter) return false;
        if (locationFilter !== 'All') {
          const itemLoc = item.location.trim() || 'Missing Location';
          if (itemLoc !== locationFilter) return false;
        }
        if (statusFilter !== 'All' && item.status !== statusFilter) return false;
        if (conditionFilter !== 'All' && item.condition !== conditionFilter) return false;
        return true;
      })
      .sort((a, b) => {
        const av = String(a[sortKey] || '');
        const bv = String(b[sortKey] || '');
        return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
      });
  }, [
    equipment,
    searchQuery,
    categoryFilter,
    departmentFilter,
    locationFilter,
    statusFilter,
    conditionFilter,
    sortKey,
    sortAsc,
  ]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  // Add Form State
  const [newForm, setNewForm] = useState({
    assetId: `EQ-${String(equipment.length + 17).padStart(3, '0')}`,
    name: '',
    category: CATEGORIES[0],
    manufacturer: '',
    model: '',
    serialNumber: '',
    department: DEPARTMENTS[0] as string,
    location: '',
    condition: 'Excellent' as EquipmentCondition,
    status: 'Awaiting Inspection' as EquipmentStatus,
    responsibleParty: '',
    acquisitionDate: '2026-11-25',
    lastServiceDate: '2026-11-25',
    nextServiceDate: '2027-05-25',
    notes: '',
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newForm.name.trim() || !newForm.assetId.trim()) return;
    const nowStr = '2026-11-25 08:30';
    const created: EquipmentAsset = {
      id: `eq-${newForm.assetId.toLowerCase().replace(/[^a-z0-9-]/g, '-')}-${Date.now().toString().slice(-4)}`,
      assetId: newForm.assetId.trim().toUpperCase(),
      name: newForm.name.trim(),
      category: newForm.category,
      manufacturer: newForm.manufacturer.trim() || 'Generic Medical',
      model: newForm.model.trim() || 'Standard Model',
      serialNumber: newForm.serialNumber.trim() || `SN-${Date.now().toString().slice(-6)}`,
      department: newForm.department,
      location: newForm.location.trim(),
      condition: newForm.condition,
      status: newForm.status,
      responsibleParty: newForm.responsibleParty.trim() || `${newForm.department} Lead`,
      lastHandler: 'Eng. Marcus Vance',
      lastMovementAt: nowStr,
      acquisitionDate: newForm.acquisitionDate,
      lastServiceDate: newForm.lastServiceDate,
      nextServiceDate: newForm.nextServiceDate,
      lastUpdated: nowStr,
      notes: newForm.notes.trim(),
    };
    onAddEquipment(created);
    setShowAddModal(false);
    setNewForm({
      ...newForm,
      assetId: `EQ-${String(equipment.length + 18).padStart(3, '0')}`,
      name: '',
      manufacturer: '',
      model: '',
      serialNumber: '',
      location: '',
      responsibleParty: '',
      notes: '',
    });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    const updated: EquipmentAsset = {
      ...editingItem,
      lastUpdated: '2026-11-25 08:35',
    };
    onUpdateEquipment(updated, 'Updated asset metadata, assignment, or status from inventory registry.');
    setEditingItem(null);
  };

  return (
    <div className="space-y-5">
      {/* Action Header & Search/Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Asset ID, equipment name, model, or serial..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 tabular-nums whitespace-nowrap">
              Showing {filtered.length} of {equipment.length} assets
            </span>
            <button
              type="button"
              disabled={!canModify}
              onClick={() => setShowAddModal(true)}
              title={canModify ? 'Register a new asset' : 'Requires Biomedical Engineer or Administrator role'}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" />
              Add New Equipment
            </button>
          </div>
        </div>

        {/* Multi-Facet Filter Bar */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-2 border-t border-slate-100">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            aria-label="Filter by category"
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
          >
            <option value="All">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            aria-label="Filter by department"
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
          >
            <option value="All">All Departments</option>
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          <select
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            aria-label="Filter by location"
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
          >
            <option value="All">All Locations</option>
            {uniqueLocations.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by status"
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
          >
            <option value="All">All Statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <select
            value={conditionFilter}
            onChange={(e) => setConditionFilter(e.target.value)}
            aria-label="Filter by condition"
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
          >
            <option value="All">All Conditions</option>
            {CONDITIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Equipment Registry Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                <th className="py-3 px-4 whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => toggleSort('assetId')}
                    className="inline-flex items-center gap-1 hover:text-slate-900"
                  >
                    Asset ID
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-3 px-4 whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => toggleSort('name')}
                    className="inline-flex items-center gap-1 hover:text-slate-900"
                  >
                    Equipment & Model
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-3 px-4 whitespace-nowrap">Serial No.</th>
                <th className="py-3 px-4 whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => toggleSort('department')}
                    className="inline-flex items-center gap-1 hover:text-slate-900"
                  >
                    Department & Location
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-3 px-4 whitespace-nowrap">Condition</th>
                <th className="py-3 px-4 whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => toggleSort('status')}
                    className="inline-flex items-center gap-1 hover:text-slate-900"
                  >
                    Operational Status
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-3 px-4 whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => toggleSort('nextServiceDate')}
                    className="inline-flex items-center gap-1 hover:text-slate-900"
                  >
                    Next Service
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 px-4 text-center text-sm text-slate-500">
                    No equipment matches your active filters. Try clearing filters or registering a new asset.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => {
                  const unverifiedLoc = !item.location.trim();
                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                      onClick={() => onSelectEquipment(item.id)}
                    >
                      <td className="py-3 px-4 font-mono text-xs font-semibold text-teal-800 tabular-nums whitespace-nowrap">
                        {item.assetId}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900">{item.name}</div>
                        <div className="text-xs text-slate-500">
                          {item.manufacturer} · {item.model} · {item.category}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-600 tabular-nums whitespace-nowrap">
                        {item.serialNumber}
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-xs font-medium text-slate-800">{item.department}</div>
                        {unverifiedLoc ? (
                          <div className="inline-flex items-center gap-1 text-xs text-amber-700 mt-0.5">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Unverified / Missing location</span>
                          </div>
                        ) : (
                          <div className="text-xs text-slate-500">{item.location}</div>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <ConditionText condition={item.condition} />
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <StatusIndicator status={item.status} />
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-600 tabular-nums whitespace-nowrap">
                        <div>{item.nextServiceDate}</div>
                        <div className="text-[11px] text-slate-400">
                          Last: {item.lastServiceDate}
                        </div>
                      </td>
                      <td
                        className="py-3 px-4 text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onSelectEquipment(item.id)}
                            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                            title="View Equipment Profile & History"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {canModify && (
                            <button
                              type="button"
                              onClick={() => setEditingItem(item)}
                              className="p-1.5 text-slate-600 hover:text-teal-700 hover:bg-slate-100 rounded-md transition-colors"
                              title="Edit Equipment Record"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add New Equipment Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">Register New Equipment</h2>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Asset ID *</label>
                  <input
                    required
                    type="text"
                    value={newForm.assetId}
                    onChange={(e) => setNewForm({ ...newForm, assetId: e.target.value })}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Equipment Name *
                  </label>
                  <input
                    required
                    type="text"
                    value={newForm.name}
                    onChange={(e) => setNewForm({ ...newForm, name: e.target.value })}
                    placeholder="e.g. ECG Machine"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Category</label>
                  <select
                    value={newForm.category}
                    onChange={(e) => setNewForm({ ...newForm, category: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Manufacturer
                  </label>
                  <input
                    type="text"
                    value={newForm.manufacturer}
                    onChange={(e) => setNewForm({ ...newForm, manufacturer: e.target.value })}
                    placeholder="e.g. CardioTech Medical"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Model</label>
                  <input
                    type="text"
                    value={newForm.model}
                    onChange={(e) => setNewForm({ ...newForm, model: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Serial Number
                  </label>
                  <input
                    type="text"
                    value={newForm.serialNumber}
                    onChange={(e) => setNewForm({ ...newForm, serialNumber: e.target.value })}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Assigned Department
                  </label>
                  <select
                    value={newForm.department}
                    onChange={(e) => setNewForm({ ...newForm, department: e.target.value })}
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
                    Current Location
                  </label>
                  <input
                    type="text"
                    value={newForm.location}
                    onChange={(e) => setNewForm({ ...newForm, location: e.target.value })}
                    placeholder="e.g. ICU Bed 05"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Condition</label>
                  <select
                    value={newForm.condition}
                    onChange={(e) =>
                      setNewForm({ ...newForm, condition: e.target.value as EquipmentCondition })
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  >
                    {CONDITIONS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Operational Status
                  </label>
                  <select
                    value={newForm.status}
                    onChange={(e) =>
                      setNewForm({ ...newForm, status: e.target.value as EquipmentStatus })
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Responsible Person / Dept
                  </label>
                  <input
                    type="text"
                    value={newForm.responsibleParty}
                    onChange={(e) => setNewForm({ ...newForm, responsibleParty: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Next Scheduled Service
                  </label>
                  <input
                    type="date"
                    value={newForm.nextServiceDate}
                    onChange={(e) => setNewForm({ ...newForm, nextServiceDate: e.target.value })}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={newForm.notes}
                  onChange={(e) => setNewForm({ ...newForm, notes: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800"
                >
                  Save Equipment Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Equipment Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">
                Edit Equipment · {editingItem.assetId}
              </h2>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Assigned Department
                  </label>
                  <select
                    value={editingItem.department}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, department: e.target.value })
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
                    Current Location
                  </label>
                  <input
                    type="text"
                    value={editingItem.location}
                    onChange={(e) => setEditingItem({ ...editingItem, location: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Operational Status
                  </label>
                  <select
                    value={editingItem.status}
                    onChange={(e) =>
                      setEditingItem({
                        ...editingItem,
                        status: e.target.value as EquipmentStatus,
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Condition</label>
                  <select
                    value={editingItem.condition}
                    onChange={(e) =>
                      setEditingItem({
                        ...editingItem,
                        condition: e.target.value as EquipmentCondition,
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  >
                    {CONDITIONS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Responsible Party
                  </label>
                  <input
                    type="text"
                    value={editingItem.responsibleParty}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, responsibleParty: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Next Service Date
                  </label>
                  <input
                    type="date"
                    value={editingItem.nextServiceDate}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, nextServiceDate: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={editingItem.notes}
                  onChange={(e) => setEditingItem({ ...editingItem, notes: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

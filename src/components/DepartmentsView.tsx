import React, { useState } from 'react';
import { Building2, ChevronRight } from 'lucide-react';
import { EquipmentAsset } from '../types/bems';
import { DEPARTMENTS } from '../data/mockBemsData';
import { ConditionText, StatusIndicator } from './StatusText';

interface DepartmentsViewProps {
  equipment: EquipmentAsset[];
  onSelectEquipment: (equipmentId: string) => void;
}

export const DepartmentsView: React.FC<DepartmentsViewProps> = ({
  equipment,
  onSelectEquipment,
}) => {
  const [selectedDept, setSelectedDept] = useState<string>(DEPARTMENTS[0]);

  const deptSummaries = DEPARTMENTS.map((dept) => {
    const items = equipment.filter((e) => e.department === dept);
    return {
      name: dept,
      total: items.length,
      operational: items.filter((e) => e.status === 'Operational').length,
      faulty: items.filter((e) => e.status === 'Faulty').length,
      maintenance: items.filter((e) => e.status === 'Under Maintenance').length,
    };
  });

  const deptEquipment = equipment.filter((e) => e.department === selectedDept);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {deptSummaries.map((dept) => {
          const active = selectedDept === dept.name;
          return (
            <button
              key={dept.name}
              type="button"
              onClick={() => setSelectedDept(dept.name)}
              className={`text-left rounded-xl p-4 border transition-colors ${
                active
                  ? 'bg-slate-900 border-slate-900 text-white'
                  : 'bg-white border-slate-200 text-slate-900 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold truncate">{dept.name}</span>
                <Building2
                  className={`w-4 h-4 shrink-0 ${active ? 'text-teal-400' : 'text-slate-400'}`}
                />
              </div>

              <div className="mt-3 grid grid-cols-2 gap-y-1.5 text-xs">
                <div className={active ? 'text-slate-300' : 'text-slate-500'}>
                  Total:{' '}
                  <span className={`font-mono font-semibold tabular-nums ${active ? 'text-white' : 'text-slate-900'}`}>
                    {dept.total}
                  </span>
                </div>
                <div className={active ? 'text-emerald-300' : 'text-emerald-700'}>
                  Operational:{' '}
                  <span className="font-mono font-semibold tabular-nums">{dept.operational}</span>
                </div>
                <div className={active ? 'text-red-300' : 'text-red-700'}>
                  Faulty:{' '}
                  <span className="font-mono font-semibold tabular-nums">{dept.faulty}</span>
                </div>
                <div className={active ? 'text-amber-300' : 'text-amber-700'}>
                  In Maint:{' '}
                  <span className="font-mono font-semibold tabular-nums">{dept.maintenance}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Department Equipment Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              {selectedDept} · Assigned Equipment
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
              {deptEquipment.length} registered asset{deptEquipment.length === 1 ? '' : 's'} assigned to this clinical unit
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                <th className="py-3 px-4">Asset ID</th>
                <th className="py-3 px-4">Equipment</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">Condition</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Responsible Party</th>
                <th className="py-3 px-4 text-right">Profile</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {deptEquipment.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 px-4 text-center text-xs text-slate-500">
                    No equipment currently assigned to {selectedDept}.
                  </td>
                </tr>
              ) : (
                deptEquipment.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => onSelectEquipment(item.id)}
                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-4 font-mono text-xs font-semibold text-teal-800 tabular-nums">
                      {item.assetId}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900">{item.name}</div>
                      <div className="text-xs text-slate-500">
                        {item.manufacturer} · {item.model}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-700">
                      {item.location || (
                        <span className="text-amber-700 font-medium">Unverified / Missing</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <ConditionText condition={item.condition} />
                    </td>
                    <td className="py-3 px-4">
                      <StatusIndicator status={item.status} />
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600">{item.responsibleParty}</td>
                    <td className="py-3 px-4 text-right">
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-teal-700">
                        Inspect
                        <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

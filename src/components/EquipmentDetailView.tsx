import React, { useState } from 'react';
import {
  AlertOctagon,
  ArrowLeft,
  ArrowLeftRight,
  CheckCircle2,
  Clock,
  ShieldAlert,
  UserCheck,
  Wrench,
} from 'lucide-react';
import {
  EquipmentAsset,
  EquipmentMovement,
  FaultReport,
  HistoryEvent,
  MaintenanceTask,
  UserRole,
} from '../types/bems';
import { ConditionText, StatusIndicator } from './StatusText';
import { Equipment3DViewer } from './Equipment3DViewer';
import {
  ClinicalStandardsSearchPanel,
  TechnicalImageGeneratorPanel,
} from './GeminiAssistantPanels';

interface EquipmentDetailViewProps {
  equipment: EquipmentAsset;
  movements: EquipmentMovement[];
  maintenance: MaintenanceTask[];
  faults: FaultReport[];
  history: HistoryEvent[];
  activeRole: UserRole;
  onBack: () => void;
  onQuickMove: (equipmentId: string) => void;
  onQuickFault: (equipmentId: string) => void;
  onQuickMaintenance: (equipmentId: string) => void;
}

export const EquipmentDetailView: React.FC<EquipmentDetailViewProps> = ({
  equipment,
  movements,
  maintenance,
  faults,
  history,
  activeRole,
  onBack,
  onQuickMove,
  onQuickFault,
  onQuickMaintenance,
}) => {
  const [activeTab, setActiveTab] = useState<'3d' | 'standards' | 'illustration'>('3d');

  const assetHistory = history
    .filter((h) => h.equipmentId === equipment.id)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  const assetTasks = maintenance.filter((m) => m.equipmentId === equipment.id);
  const outstandingTasks = assetTasks.filter((m) => m.status !== 'Completed');
  const lastCompletedTask = assetTasks
    .filter((m) => m.status === 'Completed')
    .sort((a, b) => b.completionDate.localeCompare(a.completionDate))[0];

  const assetMovements = movements
    .filter((m) => m.equipmentId === equipment.id)
    .sort((a, b) => b.movementDate.localeCompare(a.movementDate));

  const openFaults = faults.filter(
    (f) => f.equipmentId === equipment.id && f.status !== 'Closed' && f.status !== 'Resolved'
  );

  const canModify = activeRole === 'Administrator' || activeRole === 'Biomedical Engineer';
  const canReportFault = activeRole !== 'Read-Only/Auditor';

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Quick Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Inventory
          </button>
          <div className="text-xs text-slate-500">
            Equipment Registry <span aria-hidden="true">/</span>{' '}
            <span className="font-mono font-semibold text-slate-900">{equipment.assetId}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canReportFault && (
            <button
              type="button"
              onClick={() => onQuickMove(equipment.id)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              Record Movement
            </button>
          )}
          {canReportFault && (
            <button
              type="button"
              onClick={() => onQuickFault(equipment.id)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors whitespace-nowrap"
            >
              <AlertOctagon className="w-3.5 h-3.5" />
              Report Fault
            </button>
          )}
          {canModify && (
            <button
              type="button"
              onClick={() => onQuickMaintenance(equipment.id)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap"
            >
              <Wrench className="w-3.5 h-3.5" />
              Schedule Maintenance
            </button>
          )}
        </div>
      </div>

      {/* Critical Fault Warning Banner if applicable */}
      {openFaults.some((f) => f.severity === 'Critical') && (
        <div className="bg-red-50 border border-red-300 rounded-xl p-4 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-red-700 shrink-0 mt-0.5" />
          <div className="text-xs text-red-900 space-y-1">
            <div className="font-semibold text-sm">
              Critical Fault Active · Engineering Verification Required
            </div>
            <p>
              {openFaults[0]?.description} Assigned to {openFaults[0]?.assignedEngineer || 'Unassigned'}. Do not return to clinical use without formal biomedical inspection sign-off.
            </p>
          </div>
        </div>
      )}

      {/* Three-Column Information Architecture: Overview, Accountability, Maintenance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 1. Equipment Overview */}
        <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <div className="font-mono text-xs font-semibold text-teal-700 tabular-nums">
                {equipment.assetId}
              </div>
              <h2 className="text-lg font-display font-bold text-slate-900 mt-0.5">
                {equipment.name}
              </h2>
            </div>
            <StatusIndicator status={equipment.status} />
          </div>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
            <div>
              <dt className="text-slate-500">Manufacturer</dt>
              <dd className="font-medium text-slate-900 mt-0.5">{equipment.manufacturer}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Model</dt>
              <dd className="font-medium text-slate-900 mt-0.5">{equipment.model}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Serial Number</dt>
              <dd className="font-mono font-medium text-slate-900 mt-0.5 tabular-nums">
                {equipment.serialNumber}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Category</dt>
              <dd className="font-medium text-slate-900 mt-0.5">{equipment.category}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Assigned Department</dt>
              <dd className="font-medium text-slate-900 mt-0.5">{equipment.department}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Current Location</dt>
              <dd
                className={`font-medium mt-0.5 ${
                  equipment.location.trim() ? 'text-slate-900' : 'text-amber-700'
                }`}
              >
                {equipment.location.trim() || 'Unverified / Missing Location'}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Physical Condition</dt>
              <dd className="mt-0.5">
                <ConditionText condition={equipment.condition} />
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Acquired</dt>
              <dd className="font-mono text-slate-800 mt-0.5 tabular-nums">
                {equipment.acquisitionDate}
              </dd>
            </div>
          </dl>

          {equipment.notes && (
            <div className="pt-3 border-t border-slate-100 text-xs text-slate-600 leading-relaxed">
              {equipment.notes}
            </div>
          )}
        </section>

        {/* 2. Accountability Information */}
        <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900">Accountability & Custody</h3>
            <UserCheck className="w-4 h-4 text-slate-400" />
          </div>

          <dl className="space-y-3 text-xs">
            <div>
              <dt className="text-slate-500">Currently Responsible Person / Unit</dt>
              <dd className="font-medium text-slate-900 mt-0.5">{equipment.responsibleParty}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Last Person to Handle Equipment</dt>
              <dd className="font-medium text-slate-900 mt-0.5">{equipment.lastHandler}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Date & Time of Last Movement</dt>
              <dd className="font-mono text-slate-900 mt-0.5 tabular-nums">
                {equipment.lastMovementAt}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Current Assignment</dt>
              <dd className="font-medium text-slate-900 mt-0.5">
                {equipment.department} · {equipment.location || 'Location Pending'}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Previous Recorded Location</dt>
              <dd className="text-slate-700 mt-0.5">
                {assetMovements[0]
                  ? `${assetMovements[0].originDepartment} · ${assetMovements[0].originLocation}`
                  : 'Initial Commissioning Store'}
              </dd>
            </div>
          </dl>

          <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500 leading-relaxed">
            Custody records document authorized transfers and handoffs; physical verification remains required during audits.
          </div>
        </section>

        {/* 3. Maintenance Information */}
        <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900">Maintenance & Inspection</h3>
            <Wrench className="w-4 h-4 text-slate-400" />
          </div>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
            <div>
              <dt className="text-slate-500">Last Maintenance / Service</dt>
              <dd className="font-mono font-medium text-slate-900 mt-0.5 tabular-nums">
                {equipment.lastServiceDate}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Next Scheduled Service</dt>
              <dd className="font-mono font-medium text-slate-900 mt-0.5 tabular-nums">
                {equipment.nextServiceDate}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Last Verified Inspection</dt>
              <dd className="font-medium text-slate-900 mt-0.5">
                {lastCompletedTask ? `${lastCompletedTask.completionDate} (${lastCompletedTask.type})` : equipment.lastServiceDate}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Outstanding Tasks</dt>
              <dd className="font-mono font-semibold text-slate-900 mt-0.5 tabular-nums">
                {outstandingTasks.length}
              </dd>
            </div>
          </dl>

          <div className="pt-3 border-t border-slate-100 space-y-2">
            <div className="text-xs font-medium text-slate-700">Current Repair / Task Status</div>
            {outstandingTasks.length === 0 ? (
              <div className="flex items-center gap-1.5 text-xs text-emerald-700">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>No open maintenance or repair orders</span>
              </div>
            ) : (
              outstandingTasks.slice(0, 2).map((t) => (
                <div key={t.id} className="text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-slate-900">{t.type}</span>
                    <StatusIndicator status={t.status} />
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    {t.assignedEngineer} · Due {t.nextMaintenanceDate}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {/* Interactive 3D Digital Twin & Gemini Technical Workbench */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              3D Asset Inspection & Engineering Reference Tools
            </h3>
            <p className="text-xs text-slate-500">
              Inspect hardware sub-assemblies in 3D, query live IEC/ISO maintenance standards, or generate high-resolution SOP illustrations.
            </p>
          </div>
          <div className="inline-flex p-1 bg-slate-200/70 rounded-lg">
            <button
              type="button"
              onClick={() => setActiveTab('3d')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                activeTab === '3d'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              3D Equipment Twin
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('standards')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                activeTab === 'standards'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Standards Search (Google)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('illustration')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                activeTab === 'illustration'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              SOP Visual Generator
            </button>
          </div>
        </div>

        {activeTab === '3d' && <Equipment3DViewer equipment={equipment} />}
        {activeTab === 'standards' && (
          <ClinicalStandardsSearchPanel
            equipmentContext={`${equipment.name} (${equipment.manufacturer} ${equipment.model}, ${equipment.category})`}
            defaultQuery={`Preventive maintenance and electrical safety inspection standards for hospital ${equipment.name}`}
          />
        )}
        {activeTab === 'illustration' && (
          <TechnicalImageGeneratorPanel
            defaultPrompt={`${equipment.name} (${equipment.manufacturer} ${equipment.model}) in a clinical biomedical inspection bay`}
          />
        )}
      </section>

      {/* Complete Chronological Equipment History Timeline */}
      <section className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Complete Equipment History Timeline
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Immutable chronological audit trail of registrations, movements, faults, inspections, and repairs
            </p>
          </div>
          <span className="text-xs font-mono text-slate-500 tabular-nums">
            {assetHistory.length} recorded events
          </span>
        </div>

        {assetHistory.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">
            No historical events recorded for this asset yet.
          </div>
        ) : (
          <ol className="mt-4 space-y-4">
            {assetHistory.map((ev, index) => (
              <li key={ev.id} className="relative pl-6 pb-4 border-b border-slate-100 last:border-b-0 last:pb-0">
                <span
                  className="absolute left-0 top-1.5 w-2.5 h-2.5 rounded-full bg-slate-800"
                  aria-hidden="true"
                />
                {index !== assetHistory.length - 1 && (
                  <span
                    className="absolute left-[4px] top-4 bottom-0 w-px bg-slate-200"
                    aria-hidden="true"
                  />
                )}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-semibold text-slate-900">{ev.eventType}</span>
                    <span aria-hidden="true" className="text-slate-300">·</span>
                    <span className="text-slate-600">{ev.responsibleUser}</span>
                  </div>
                  <span className="inline-flex items-center gap-1 font-mono text-xs text-slate-500 tabular-nums">
                    <Clock className="w-3 h-3" />
                    {ev.timestamp}
                  </span>
                </div>
                <div className="mt-1 text-xs text-slate-700">
                  <span className="text-slate-500">{ev.previousValue}</span>
                  <span className="mx-1.5 text-slate-400">→</span>
                  <span className="font-medium text-slate-900">{ev.newValue}</span>
                </div>
                {ev.notes && (
                  <p className="mt-1 text-xs text-slate-600 leading-relaxed">{ev.notes}</p>
                )}
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
};

import React from 'react';
import {
  EquipmentCondition,
  EquipmentStatus,
  FaultStatus,
  MaintenanceStatus,
  MovementStatus,
  PriorityLevel,
} from '../types/bems';

export function StatusIndicator({
  status,
}: {
  status: EquipmentStatus | MovementStatus | MaintenanceStatus | FaultStatus | string;
}) {
  let colorClass = 'text-slate-700';
  let markClass = 'bg-slate-400';

  switch (status) {
    case 'Operational':
    case 'Received':
    case 'Returned':
    case 'Completed':
    case 'Resolved':
      colorClass = 'text-emerald-700';
      markClass = 'bg-emerald-600';
      break;
    case 'Faulty':
    case 'Critical':
    case 'Overdue':
      colorClass = 'text-red-700';
      markClass = 'bg-red-600';
      break;
    case 'Under Maintenance':
    case 'Awaiting Inspection':
    case 'Awaiting Parts':
    case 'In Progress':
    case 'Pending Approval':
    case 'Under Investigation':
    case 'Under Repair':
    case 'In Transit':
      colorClass = 'text-amber-700';
      markClass = 'bg-amber-500';
      break;
    case 'Scheduled':
    case 'Released':
    case 'Reported':
      colorClass = 'text-sky-700';
      markClass = 'bg-sky-600';
      break;
    case 'Decommissioned':
    case 'Closed':
      colorClass = 'text-slate-500';
      markClass = 'bg-slate-400';
      break;
  }

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap ${colorClass}`}>
      <span className={`w-1.5 h-1.5 rounded-xs shrink-0 ${markClass}`} aria-hidden="true" />
      <span>{status}</span>
    </span>
  );
}

export function PriorityText({ priority }: { priority: PriorityLevel }) {
  const styles: Record<PriorityLevel, string> = {
    Critical: 'text-red-700 font-semibold',
    High: 'text-amber-700 font-medium',
    Medium: 'text-sky-700 font-medium',
    Low: 'text-slate-600 font-normal',
  };
  return <span className={`text-xs whitespace-nowrap ${styles[priority]}`}>{priority}</span>;
}

export function ConditionText({ condition }: { condition: EquipmentCondition | string }) {
  let cls = 'text-slate-700';
  if (condition === 'Excellent' || condition === 'Good') cls = 'text-emerald-700';
  else if (condition === 'Fair') cls = 'text-amber-700';
  else if (condition === 'Needs Repair' || condition === 'Unserviceable') cls = 'text-red-700';

  return <span className={`text-xs font-medium whitespace-nowrap ${cls}`}>{condition}</span>;
}

import React from 'react';
import { Shield, Users } from 'lucide-react';
import { DEMO_USERS } from '../data/mockBemsData';
import { UserRole } from '../types/bems';

interface UserManagementViewProps {
  activeRole: UserRole;
  onChangeActiveRole: (role: UserRole) => void;
}

const ROLE_DEFINITIONS: Array<{
  role: UserRole;
  summary: string;
  capabilities: string[];
}> = [
  {
    role: 'Administrator',
    summary: 'Full departmental governance, configuration, user access, and audit oversight.',
    capabilities: [
      'Manage user roles & system settings',
      'View & edit all equipment records',
      'Access audit reports & export logs',
      'Approve movements, faults & maintenance',
    ],
  },
  {
    role: 'Biomedical Engineer',
    summary: 'Core operational role for equipment maintenance, calibration, triage, and tracking.',
    capabilities: [
      'Register & update equipment records',
      'Create & sign off maintenance tasks',
      'Triage, investigate & resolve faults',
      'Record & verify equipment movements',
    ],
  },
  {
    role: 'Department Personnel',
    summary: 'Clinical unit staff visibility for assigned assets, fault reporting, and transfers.',
    capabilities: [
      'View equipment inventory & locations',
      'Submit clinical fault reports',
      'Record or request equipment transfers',
      'Cannot modify maintenance sign-off records',
    ],
  },
  {
    role: 'Read-Only/Auditor',
    summary: 'Compliance & audit inspection access without write privileges.',
    capabilities: [
      'View approved inventory & histories',
      'Generate & export audit reports',
      'Cannot create or edit records',
      'Cannot alter fault or maintenance state',
    ],
  },
];

export const UserManagementView: React.FC<UserManagementViewProps> = ({
  activeRole,
  onChangeActiveRole,
}) => {
  return (
    <div className="space-y-6">
      {/* Prototype RBAC Demonstration Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Shield className="w-4 h-4 text-teal-700" />
            <span>Interactive Role Permissions Preview</span>
          </div>
          <p className="text-xs text-slate-600 max-w-2xl">
            Switch the active prototype role below to observe how BEMS adjusts action permissions across Inventory, Movements, Maintenance, and Fault Reports. Note: This role switcher demonstrates intended RBAC design and does not replace server-side hospital IAM.
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5 bg-slate-100 p-1 rounded-lg shrink-0">
          {ROLE_DEFINITIONS.map((def) => (
            <button
              key={def.role}
              type="button"
              onClick={() => onChangeActiveRole(def.role)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                activeRole === def.role
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              {def.role}
            </button>
          ))}
        </div>
      </div>

      {/* Role Cards Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {ROLE_DEFINITIONS.map((def) => {
          const isActive = activeRole === def.role;
          return (
            <div
              key={def.role}
              className={`rounded-xl border p-5 space-y-3 ${
                isActive
                  ? 'bg-slate-900 border-slate-900 text-white'
                  : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">{def.role}</h3>
                {isActive && (
                  <span className="text-[11px] font-medium text-teal-300">Active Preview</span>
                )}
              </div>
              <p className={`text-xs leading-relaxed ${isActive ? 'text-slate-300' : 'text-slate-600'}`}>
                {def.summary}
              </p>
              <ul className={`text-xs space-y-1.5 pt-2 border-t ${isActive ? 'border-slate-800 text-slate-200' : 'border-slate-100 text-slate-700'}`}>
                {def.capabilities.map((cap) => (
                  <li key={cap} className="flex items-start gap-2">
                    <span className="text-teal-500 mt-0.5">•</span>
                    <span>{cap}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {/* Demonstration Directory Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-500" />
            <h3 className="text-sm font-semibold text-slate-900">
              Demonstration Personnel Directory
            </h3>
          </div>
          <span className="text-xs text-slate-500">Fictional Hospital Staff Roster</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                <th className="py-3 px-4">Staff Member</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Account Status</th>
                <th className="py-3 px-4">Last Activity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {DEMO_USERS.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/70">
                  <td className="py-3 px-4">
                    <div className="font-medium text-slate-900">{u.name}</div>
                    <div className="font-mono text-xs text-slate-500">{u.email}</div>
                  </td>
                  <td className="py-3 px-4 text-xs font-medium text-slate-800">{u.role}</td>
                  <td className="py-3 px-4 text-xs text-slate-600">{u.department}</td>
                  <td className="py-3 px-4 text-xs font-medium text-emerald-700">{u.status}</td>
                  <td className="py-3 px-4 font-mono text-xs text-slate-500 tabular-nums">
                    {u.lastActive}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import {
  Activity,
  AlertOctagon,
  ArrowLeftRight,
  BarChart3,
  Building2,
  ClipboardList,
  LayoutDashboard,
  Settings,
  Users,
  Wrench,
  X,
} from 'lucide-react';
import { NavSection, UserRole } from '../types/bems';

interface SidebarProps {
  activeSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  openFaultCount: number;
  overdueMaintCount: number;
  pendingMovementsCount: number;
  activeRole: UserRole;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const NAV_ITEMS: Array<{
  id: NavSection;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'inventory', label: 'Equipment Inventory', icon: ClipboardList },
  { id: 'movements', label: 'Equipment Movements', icon: ArrowLeftRight },
  { id: 'maintenance', label: 'Maintenance Management', icon: Wrench },
  { id: 'faults', label: 'Fault Reports', icon: AlertOctagon },
  { id: 'departments', label: 'Departments & Locations', icon: Building2 },
  { id: 'reports', label: 'Reports & Analytics', icon: BarChart3 },
  { id: 'users', label: 'User Management', icon: Users },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeSection,
  onSelectSection,
  openFaultCount,
  overdueMaintCount,
  pendingMovementsCount,
  activeRole,
  mobileOpen,
  onCloseMobile,
}) => {
  const getCount = (id: NavSection): number | null => {
    if (id === 'faults' && openFaultCount > 0) return openFaultCount;
    if (id === 'maintenance' && overdueMaintCount > 0) return overdueMaintCount;
    if (id === 'movements' && pendingMovementsCount > 0) return pendingMovementsCount;
    return null;
  };

  const navContent = (
    <div className="flex flex-col h-full bg-slate-900 text-slate-300 w-64 shrink-0">
      <div className="h-16 px-5 flex items-center justify-between border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center text-white shrink-0">
            <Activity className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="font-display font-bold text-sm text-white tracking-tight truncate">
              BEMS
            </div>
            <div className="text-[11px] text-slate-400 truncate">
              Biomedical Engineering
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onCloseMobile}
          className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-md"
          aria-label="Close navigation"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1" aria-label="Primary Navigation">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = activeSection === item.id;
          const count = getCount(item.id);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onSelectSection(item.id);
                onCloseMobile();
              }}
              className={`w-full flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left whitespace-nowrap ${
                active
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
              }`}
            >
              <span className="flex items-center gap-2.5 min-w-0">
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    active ? 'text-teal-400' : 'text-slate-400'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </span>
              {count !== null && (
                <span
                  className={`text-[11px] font-mono tabular-nums px-1.5 py-0.5 rounded ${
                    item.id === 'faults'
                      ? 'bg-red-950 text-red-300'
                      : 'bg-amber-950 text-amber-300'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800 text-xs space-y-1">
        <div className="text-slate-400">Active Role Scope</div>
        <div className="text-slate-100 font-medium truncate">{activeRole}</div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop persistent sidebar */}
      <aside className="hidden lg:flex shrink-0 border-r border-slate-800">
        {navContent}
      </aside>

      {/* Mobile / Tablet drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/60"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative z-10 flex h-full">{navContent}</div>
        </div>
      )}
    </>
  );
};

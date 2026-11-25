import React, { useMemo, useRef, useState, useEffect } from 'react';
import {
  Bell,
  Calendar,
  LogIn,
  LogOut,
  Menu,
  Search,
  User as UserIcon,
  CheckCheck,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { BemsNotification, EquipmentAsset, NavSection, UserRole } from '../types/bems';

interface TopBarProps {
  sectionTitle: string;
  equipment: EquipmentAsset[];
  notifications: BemsNotification[];
  onMarkAllRead: () => void;
  onSelectNotification: (notif: BemsNotification) => void;
  onSelectEquipment: (equipmentId: string) => void;
  onNavigate: (section: NavSection) => void;
  onOpenMobileNav: () => void;
  firebaseUser: User | null;
  authLoading: boolean;
  onSignInGoogle: () => void;
  onSignOutGoogle: () => void;
  activeRole: UserRole;
  firestoreSynced: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({
  sectionTitle,
  equipment,
  notifications,
  onMarkAllRead,
  onSelectNotification,
  onSelectEquipment,
  onNavigate,
  onOpenMobileNav,
  firebaseUser,
  authLoading,
  onSignInGoogle,
  onSignOutGoogle,
  activeRole,
  firestoreSynced,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const searchBoxRef = useRef<HTMLDivElement>(null);
  const notifBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setSearchFocused(false);
      }
      if (notifBoxRef.current && !notifBoxRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchResults = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return [];
    return equipment
      .filter(
        (item) =>
          item.assetId.toLowerCase().includes(q) ||
          item.name.toLowerCase().includes(q) ||
          item.serialNumber.toLowerCase().includes(q) ||
          item.department.toLowerCase().includes(q) ||
          item.model.toLowerCase().includes(q)
      )
      .slice(0, 6);
  }, [searchTerm, equipment]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between gap-4 shrink-0">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileNav}
          className="lg:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="min-w-0">
          <h1 className="text-base font-semibold text-slate-900 truncate">{sectionTitle}</h1>
        </div>
      </div>

      {/* Global Equipment Search */}
      <div ref={searchBoxRef} className="relative flex-1 max-w-md hidden md:block">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onFocus={() => setSearchFocused(true)}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setSearchFocused(true);
            }}
            placeholder="Global search by Asset ID (e.g. ECG-001), device, serial, department..."
            className="w-full pl-9 pr-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:ring-2 focus:ring-teal-600 focus:border-transparent"
          />
        </div>

        {searchFocused && searchTerm.trim().length > 0 && (
          <div className="absolute left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg z-40 overflow-hidden">
            {searchResults.length === 0 ? (
              <div className="p-4 text-xs text-slate-500">
                No registered equipment matching &ldquo;{searchTerm}&rdquo;.
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {searchResults.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onSelectEquipment(item.id);
                        setSearchFocused(false);
                        setSearchTerm('');
                      }}
                      className="w-full px-4 py-2.5 text-left hover:bg-slate-50 flex items-center justify-between gap-3 transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-slate-900 truncate">
                          <span className="font-mono text-xs text-teal-700 mr-2 tabular-nums">
                            {item.assetId}
                          </span>
                          {item.name}
                        </div>
                        <div className="text-xs text-slate-500 truncate">
                          {item.department} · {item.location || 'Location missing'}
                        </div>
                      </div>
                      <span className="text-xs font-medium text-slate-600 shrink-0">
                        {item.status}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
              <span className="text-[11px] text-slate-500">
                Click any asset to inspect full profile & history
              </span>
              <button
                type="button"
                onClick={() => {
                  onNavigate('inventory');
                  setSearchFocused(false);
                }}
                className="text-[11px] font-medium text-teal-700 hover:underline"
              >
                Open Full Inventory
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Right Utilities: Date, Notifications, User Profile / Google Auth */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="hidden xl:flex items-center gap-1.5 text-xs text-slate-600 tabular-nums whitespace-nowrap pr-2 border-r border-slate-200">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span>25 Nov 2026</span>
        </div>

        {/* Notifications Popover */}
        <div ref={notifBoxRef} className="relative">
          <button
            type="button"
            onClick={() => setNotifOpen((o) => !o)}
            className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="Open notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-600 text-white text-[10px] font-mono font-semibold rounded-full flex items-center justify-center tabular-nums">
                {unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-slate-200 rounded-xl shadow-lg z-40 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-slate-900">Department Alerts</div>
                  <div className="text-xs text-slate-500 tabular-nums">
                    {unreadCount} unread operational alerts
                  </div>
                </div>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={onMarkAllRead}
                    className="inline-flex items-center gap-1 text-xs font-medium text-teal-700 hover:underline"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <div className="p-4 text-xs text-slate-500 text-center">
                    No active biomedical alerts.
                  </div>
                ) : (
                  notifications.map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => {
                        onSelectNotification(n);
                        setNotifOpen(false);
                      }}
                      className={`w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors ${
                        n.read ? 'opacity-70' : 'bg-slate-50/60'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 text-[11px] mb-0.5">
                        <span
                          className={`font-semibold ${
                            n.severity === 'critical'
                              ? 'text-red-700'
                              : n.severity === 'warning'
                                ? 'text-amber-700'
                                : 'text-sky-700'
                          }`}
                        >
                          {n.category}
                        </span>
                        <span className="font-mono text-slate-400 tabular-nums">{n.timestamp}</span>
                      </div>
                      <div className="text-xs font-medium text-slate-900">{n.title}</div>
                      <div className="text-xs text-slate-600 mt-0.5 line-clamp-2">{n.message}</div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User / Firebase Google Sign-In */}
        {firebaseUser ? (
          <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200">
            <div className="hidden sm:block text-right min-w-0">
              <div className="text-xs font-medium text-slate-900 truncate max-w-[150px]">
                {firebaseUser.displayName || firebaseUser.email}
              </div>
              <div className="text-[11px] text-slate-500 truncate">
                {activeRole} · {firestoreSynced ? 'Cloud Synced' : 'Syncing'}
              </div>
            </div>
            <button
              type="button"
              onClick={onSignOutGoogle}
              title="Sign out"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200">
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-600">
              <UserIcon className="w-3.5 h-3.5 text-slate-400" />
              <span className="truncate max-w-[110px]">{activeRole}</span>
            </div>
            <button
              type="button"
              disabled={authLoading}
              onClick={onSignInGoogle}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap disabled:opacity-50"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign in with Google</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

import React, { useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import { auth, googleProvider } from './firebase';
import {
  INITIAL_EQUIPMENT,
  INITIAL_FAULTS,
  INITIAL_HISTORY,
  INITIAL_MAINTENANCE,
  INITIAL_MOVEMENTS,
} from './data/mockBemsData';
import {
  BemsNotification,
  EquipmentAsset,
  EquipmentCondition,
  EquipmentMovement,
  EquipmentStatus,
  FaultReport,
  HistoryEvent,
  MaintenanceTask,
  MovementStatus,
  NavSection,
  UserRole,
} from './types/bems';
import {
  ensureUserProfile,
  persistEquipmentCreate,
  persistEquipmentUpdate,
  persistFaultCreate,
  persistFaultUpdate,
  persistMaintenanceComplete,
  persistMaintenanceCreate,
  persistMovementRecord,
  persistMovementStatusUpdate,
  seedUserWorkspaceIfEmpty,
  subscribeWorkspace,
} from './services/bemsFirestore';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { DashboardView } from './components/DashboardView';
import { EquipmentInventoryView } from './components/EquipmentInventoryView';
import { EquipmentDetailView } from './components/EquipmentDetailView';
import { MovementsView } from './components/MovementsView';
import { MaintenanceView } from './components/MaintenanceView';
import { FaultReportsView } from './components/FaultReportsView';
import { DepartmentsView } from './components/DepartmentsView';
import { ReportsView } from './components/ReportsView';
import { UserManagementView } from './components/UserManagementView';
import { SettingsView } from './components/SettingsView';

const SECTION_TITLES: Record<NavSection, string> = {
  dashboard: 'Biomedical Operations Dashboard',
  inventory: 'Equipment Inventory Registry',
  movements: 'Equipment Movements & Accountability',
  maintenance: 'Maintenance Management',
  faults: 'Fault Reports & Triage',
  departments: 'Departments & Locations',
  reports: 'Reports & Analytics',
  users: 'User Management & Access Control',
  settings: 'System Settings',
};

function buildInitialNotifications(): BemsNotification[] {
  return [
    {
      id: 'notif-1',
      category: 'Critical Fault',
      title: 'Critical Fault: XR-007 X-ray Machine',
      message: 'Error E-402 HV Inverter Overcurrent reported in Radiology. Isolated awaiting OEM IGBT driver.',
      timestamp: '2026-11-23 12:45',
      severity: 'critical',
      equipmentId: 'eq-xr-007',
      read: false,
    },
    {
      id: 'notif-2',
      category: 'Overdue Maintenance',
      title: 'Overdue PM: AUT-010 Autoclave',
      message: 'Preventive maintenance & Bowie-Dick gasket check overdue since 2026-10-30.',
      timestamp: '2026-11-24 08:00',
      severity: 'warning',
      equipmentId: 'eq-aut-010',
      read: false,
    },
    {
      id: 'notif-3',
      category: 'Upcoming Inspection',
      title: 'Upcoming Inspection: DEF-004 Defibrillator',
      message: 'Semi-annual joule output discharge test scheduled for 2026-11-29.',
      timestamp: '2026-11-24 09:30',
      severity: 'info',
      equipmentId: 'eq-def-004',
      read: false,
    },
    {
      id: 'notif-4',
      category: 'Overdue Return',
      title: 'Overdue Return: DEF-004 Defibrillator',
      message: 'Loaner defibrillator transferred from Ward 1A exceeded expected return date (2026-11-24).',
      timestamp: '2026-11-25 06:15',
      severity: 'warning',
      equipmentId: 'eq-def-004',
      read: false,
    },
    {
      id: 'notif-5',
      category: 'Movement Confirmation',
      title: 'Awaiting Confirmation: PM-011 Patient Monitor',
      message: 'Outpatient Wing transfer awaits receiving staff sign-off.',
      timestamp: '2026-11-24 17:10',
      severity: 'warning',
      equipmentId: 'eq-pm-011',
      read: true,
    },
    {
      id: 'notif-6',
      category: 'Missing Record',
      title: 'Missing Location: PM-011 Patient Monitor',
      message: 'Physical room/bay location missing after clinic wing reorganization.',
      timestamp: '2026-11-25 07:00',
      severity: 'warning',
      equipmentId: 'eq-pm-011',
      read: false,
    },
  ];
}

export default function App() {
  const [activeSection, setActiveSection] = useState<NavSection>('dashboard');
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Pre-selected equipment shortcuts when navigating from Equipment Detail Quick Actions
  const [preselectMoveEqId, setPreselectMoveEqId] = useState<string | null>(null);
  const [preselectFaultEqId, setPreselectFaultEqId] = useState<string | null>(null);
  const [preselectMaintEqId, setPreselectMaintEqId] = useState<string | null>(null);

  // Domain State (fictional demonstration baseline, synced with Firestore when signed in)
  const [equipment, setEquipment] = useState<EquipmentAsset[]>(INITIAL_EQUIPMENT);
  const [movements, setMovements] = useState<EquipmentMovement[]>(INITIAL_MOVEMENTS);
  const [maintenance, setMaintenance] = useState<MaintenanceTask[]>(INITIAL_MAINTENANCE);
  const [faults, setFaults] = useState<FaultReport[]>(INITIAL_FAULTS);
  const [history, setHistory] = useState<HistoryEvent[]>(INITIAL_HISTORY);
  const [notifications, setNotifications] = useState<BemsNotification[]>(buildInitialNotifications);

  // Auth & RBAC State
  const [activeRole, setActiveRole] = useState<UserRole>('Biomedical Engineer');
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [firestoreSynced, setFirestoreSynced] = useState(false);
  const [bannerError, setBannerError] = useState<string | null>(null);

  useEffect(() => {
    let unsubWorkspace: (() => void) | null = null;
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      setAuthLoading(false);

      if (unsubWorkspace) {
        unsubWorkspace();
        unsubWorkspace = null;
      }

      if (user && user.emailVerified) {
        try {
          if (user.email === 'timbrelplatforms@gmail.com') {
            setActiveRole('Administrator');
          }
          await ensureUserProfile(
            user.uid,
            user.email || 'user@hospital-bems.demo',
            user.displayName || 'Biomedical User'
          );
          await seedUserWorkspaceIfEmpty(
            user.uid,
            INITIAL_EQUIPMENT,
            INITIAL_MOVEMENTS,
            INITIAL_MAINTENANCE,
            INITIAL_FAULTS,
            INITIAL_HISTORY
          );
          unsubWorkspace = subscribeWorkspace(user.uid, {
            onEquipment: (items) => {
              if (items.length > 0) setEquipment(items);
              setFirestoreSynced(true);
            },
            onMovements: (items) => setMovements(items),
            onMaintenance: (items) => setMaintenance(items),
            onFaults: (items) => setFaults(items),
            onHistory: (items) => setHistory(items),
          });
        } catch (err) {
          setBannerError(
            err instanceof Error ? err.message : 'Unable to initialize Firestore workspace.'
          );
        }
      } else {
        setFirestoreSynced(false);
      }
    });

    return () => {
      unsubAuth();
      if (unsubWorkspace) unsubWorkspace();
    };
  }, []);

  const handleSignInGoogle = async () => {
    setBannerError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setBannerError(
        err instanceof Error ? err.message : 'Google Sign-In was cancelled or blocked.'
      );
    }
  };

  const handleSignOutGoogle = async () => {
    try {
      await signOut(auth);
      setFirestoreSynced(false);
    } catch (err) {
      setBannerError(err instanceof Error ? err.message : 'Sign-out failed.');
    }
  };

  const handleSelectSection = (section: NavSection) => {
    setSelectedEquipmentId(null);
    setActiveSection(section);
  };

  const handleOpenEquipment = (id: string) => {
    setSelectedEquipmentId(id);
  };

  // --- Workflow Mutations (Client State + Optional Firestore Persistence) ---
  const handleAddEquipment = async (item: EquipmentAsset) => {
    const newEvent: HistoryEvent = {
      id: `hist-${Date.now()}`,
      equipmentId: item.id,
      assetId: item.assetId,
      eventType: 'Equipment Registered',
      timestamp: '2026-11-25 09:00',
      responsibleUser: firebaseUser?.displayName || 'Eng. Marcus Vance',
      previousValue: 'Unregistered',
      newValue: `${item.department} · ${item.location || 'Location Pending'}`,
      notes: `New asset registered (${item.status}, ${item.condition}).`,
    };
    setEquipment((prev) => [item, ...prev]);
    setHistory((prev) => [newEvent, ...prev]);

    if (firebaseUser && firebaseUser.emailVerified) {
      try {
        await persistEquipmentCreate(firebaseUser.uid, item, newEvent);
      } catch (err) {
        setBannerError(err instanceof Error ? err.message : 'Failed to save equipment to Firestore.');
      }
    }
  };

  const handleUpdateEquipment = async (updated: EquipmentAsset, note: string) => {
    const prevItem = equipment.find((e) => e.id === updated.id);
    const newEvent: HistoryEvent = {
      id: `hist-${Date.now()}`,
      equipmentId: updated.id,
      assetId: updated.assetId,
      eventType: 'Status & Record Updated',
      timestamp: '2026-11-25 09:10',
      responsibleUser: firebaseUser?.displayName || 'Eng. Marcus Vance',
      previousValue: prevItem ? `${prevItem.status} · ${prevItem.department}` : 'Previous',
      newValue: `${updated.status} · ${updated.department}`,
      notes: note,
    };
    setEquipment((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
    setHistory((prev) => [newEvent, ...prev]);

    if (firebaseUser && firebaseUser.emailVerified) {
      try {
        await persistEquipmentUpdate(firebaseUser.uid, updated, newEvent);
      } catch (err) {
        setBannerError(err instanceof Error ? err.message : 'Failed to update equipment.');
      }
    }
  };

  const handleRecordMovement = async (movement: EquipmentMovement) => {
    const targetEq = equipment.find((e) => e.id === movement.equipmentId);
    if (!targetEq) return;

    const updatedEq: EquipmentAsset = {
      ...targetEq,
      department: movement.destinationDepartment,
      location: movement.destinationLocation,
      lastHandler: movement.receivingPerson,
      responsibleParty: `${movement.destinationDepartment} Lead`,
      lastMovementAt: movement.movementDate,
      lastUpdated: movement.movementDate,
    };

    const newEvent: HistoryEvent = {
      id: `hist-${Date.now()}`,
      equipmentId: targetEq.id,
      assetId: targetEq.assetId,
      eventType: 'Equipment Moved',
      timestamp: movement.movementDate,
      responsibleUser: movement.authorizingPerson,
      previousValue: `${movement.originDepartment} · ${movement.originLocation}`,
      newValue: `${movement.destinationDepartment} · ${movement.destinationLocation}`,
      notes: `Released by ${movement.releasingPerson}; received by ${movement.receivingPerson}. ${movement.notes}`,
    };

    setMovements((prev) => [movement, ...prev]);
    setEquipment((prev) => prev.map((e) => (e.id === updatedEq.id ? updatedEq : e)));
    setHistory((prev) => [newEvent, ...prev]);

    if (movement.status === 'Pending Approval') {
      setNotifications((prev) => [
        {
          id: `notif-${Date.now()}`,
          category: 'Movement Confirmation',
          title: `Movement Awaiting Confirmation: ${movement.assetId}`,
          message: `Transfer from ${movement.originDepartment} to ${movement.destinationDepartment} requires receipt confirmation.`,
          timestamp: movement.movementDate,
          severity: 'warning',
          equipmentId: movement.equipmentId,
          read: false,
        },
        ...prev,
      ]);
    }

    if (firebaseUser && firebaseUser.emailVerified) {
      try {
        await persistMovementRecord(firebaseUser.uid, movement, updatedEq, newEvent);
      } catch (err) {
        setBannerError(err instanceof Error ? err.message : 'Failed to persist movement.');
      }
    }
  };

  const handleUpdateMovementStatus = async (
    movement: EquipmentMovement,
    newStatus: MovementStatus
  ) => {
    const updatedMov: EquipmentMovement = {
      ...movement,
      status: newStatus,
      actualReturnDate: newStatus === 'Returned' ? '2026-11-25' : movement.actualReturnDate,
    };
    const newEvent: HistoryEvent = {
      id: `hist-${Date.now()}`,
      equipmentId: movement.equipmentId,
      assetId: movement.assetId,
      eventType: newStatus === 'Returned' ? 'Equipment Returned' : 'Movement Confirmed',
      timestamp: '2026-11-25 09:30',
      responsibleUser: firebaseUser?.displayName || 'Eng. Marcus Vance',
      previousValue: movement.status,
      newValue: newStatus,
      notes: `Custody status updated for transfer to ${movement.destinationDepartment}.`,
    };

    setMovements((prev) => prev.map((m) => (m.id === movement.id ? updatedMov : m)));
    setHistory((prev) => [newEvent, ...prev]);

    if (firebaseUser && firebaseUser.emailVerified) {
      try {
        await persistMovementStatusUpdate(updatedMov, firebaseUser.uid, newEvent);
      } catch (err) {
        setBannerError(err instanceof Error ? err.message : 'Failed to update movement status.');
      }
    }
  };

  const handleReportFault = async (fault: FaultReport) => {
    const targetEq = equipment.find((e) => e.id === fault.equipmentId);
    if (!targetEq) return;

    const updatedEq: EquipmentAsset = {
      ...targetEq,
      status: 'Faulty',
      condition: fault.severity === 'Critical' || fault.severity === 'High' ? 'Needs Repair' : targetEq.condition,
      lastUpdated: fault.reportedAt,
    };

    const newEvent: HistoryEvent = {
      id: `hist-${Date.now()}`,
      equipmentId: targetEq.id,
      assetId: targetEq.assetId,
      eventType: 'Fault Reported',
      timestamp: fault.reportedAt,
      responsibleUser: fault.reportedBy,
      previousValue: targetEq.status,
      newValue: `Faulty (${fault.severity})`,
      notes: `${fault.faultCode}: ${fault.description}`,
    };

    setFaults((prev) => [fault, ...prev]);
    setEquipment((prev) => prev.map((e) => (e.id === updatedEq.id ? updatedEq : e)));
    setHistory((prev) => [newEvent, ...prev]);

    if (fault.severity === 'Critical' || fault.severity === 'High') {
      setNotifications((prev) => [
        {
          id: `notif-${Date.now()}`,
          category: 'Critical Fault',
          title: `${fault.severity} Fault: ${fault.assetId} ${fault.equipmentName}`,
          message: fault.description,
          timestamp: fault.reportedAt,
          severity: fault.severity === 'Critical' ? 'critical' : 'warning',
          equipmentId: fault.equipmentId,
          read: false,
        },
        ...prev,
      ]);
    }

    if (firebaseUser && firebaseUser.emailVerified) {
      try {
        await persistFaultCreate(firebaseUser.uid, fault, updatedEq, newEvent);
      } catch (err) {
        setBannerError(err instanceof Error ? err.message : 'Failed to persist fault report.');
      }
    }
  };

  const handleUpdateFault = async (updatedFault: FaultReport) => {
    const newEvent: HistoryEvent = {
      id: `hist-${Date.now()}`,
      equipmentId: updatedFault.equipmentId,
      assetId: updatedFault.assetId,
      eventType: 'Fault Triage Updated',
      timestamp: '2026-11-25 10:00',
      responsibleUser: updatedFault.assignedEngineer || 'Biomedical Engineer',
      previousValue: 'Open Fault',
      newValue: updatedFault.status,
      notes: updatedFault.resolutionNotes || 'Fault triage status updated.',
    };

    setFaults((prev) => prev.map((f) => (f.id === updatedFault.id ? updatedFault : f)));
    setHistory((prev) => [newEvent, ...prev]);

    if (firebaseUser && firebaseUser.emailVerified) {
      try {
        await persistFaultUpdate(firebaseUser.uid, updatedFault, newEvent);
      } catch (err) {
        setBannerError(err instanceof Error ? err.message : 'Failed to update fault report.');
      }
    }
  };

  const handleCreateMaintenance = async (task: MaintenanceTask) => {
    const targetEq = equipment.find((e) => e.id === task.equipmentId);
    const updatedEq: EquipmentAsset | null =
      targetEq && task.type === 'Corrective Maintenance'
        ? {
            ...targetEq,
            status: 'Under Maintenance',
            lastUpdated: '2026-11-25 09:40',
          }
        : null;

    const newEvent: HistoryEvent = {
      id: `hist-${Date.now()}`,
      equipmentId: task.equipmentId,
      assetId: task.assetId,
      eventType: 'Maintenance Scheduled',
      timestamp: '2026-11-25 09:40',
      responsibleUser: task.assignedEngineer,
      previousValue: targetEq?.status || 'Active',
      newValue: updatedEq ? 'Under Maintenance' : `${task.type} (${task.nextMaintenanceDate})`,
      notes: task.instructions,
    };

    setMaintenance((prev) => [task, ...prev]);
    if (updatedEq) {
      setEquipment((prev) => prev.map((e) => (e.id === updatedEq.id ? updatedEq : e)));
    }
    setHistory((prev) => [newEvent, ...prev]);

    if (firebaseUser && firebaseUser.emailVerified) {
      try {
        await persistMaintenanceCreate(firebaseUser.uid, task, updatedEq, newEvent);
      } catch (err) {
        setBannerError(err instanceof Error ? err.message : 'Failed to create maintenance task.');
      }
    }
  };

  const handleCompleteMaintenance = async (
    completedTask: MaintenanceTask,
    verifiedCondition: EquipmentCondition,
    verifiedStatus: EquipmentStatus
  ) => {
    const targetEq = equipment.find((e) => e.id === completedTask.equipmentId);
    if (!targetEq) return;

    const updatedEq: EquipmentAsset = {
      ...targetEq,
      condition: verifiedCondition,
      status: verifiedStatus,
      lastServiceDate: completedTask.completionDate,
      nextServiceDate: completedTask.nextMaintenanceDate,
      lastHandler: completedTask.completedBy,
      lastUpdated: `${completedTask.completionDate} 10:15`,
    };

    const newEvent: HistoryEvent = {
      id: `hist-${Date.now()}`,
      equipmentId: targetEq.id,
      assetId: targetEq.assetId,
      eventType: 'Maintenance Performed',
      timestamp: `${completedTask.completionDate} 10:15`,
      responsibleUser: completedTask.completedBy,
      previousValue: `${targetEq.status} · ${targetEq.condition}`,
      newValue: `${verifiedStatus} · ${verifiedCondition}`,
      notes: `${completedTask.type}: ${completedTask.workPerformed}. Parts: ${completedTask.partsReplaced}.`,
    };

    setMaintenance((prev) =>
      prev.map((m) => (m.id === completedTask.id ? completedTask : m))
    );
    setEquipment((prev) => prev.map((e) => (e.id === updatedEq.id ? updatedEq : e)));
    setHistory((prev) => [newEvent, ...prev]);

    if (firebaseUser && firebaseUser.emailVerified) {
      try {
        await persistMaintenanceComplete(
          firebaseUser.uid,
          completedTask,
          updatedEq,
          newEvent
        );
      } catch (err) {
        setBannerError(err instanceof Error ? err.message : 'Failed to complete maintenance task.');
      }
    }
  };

  const handleResetDemoWorkspace = () => {
    setEquipment(INITIAL_EQUIPMENT);
    setMovements(INITIAL_MOVEMENTS);
    setMaintenance(INITIAL_MAINTENANCE);
    setFaults(INITIAL_FAULTS);
    setHistory(INITIAL_HISTORY);
    setNotifications(buildInitialNotifications());
    setSelectedEquipmentId(null);
    setActiveSection('dashboard');
  };

  const selectedEquipment = selectedEquipmentId
    ? equipment.find((e) => e.id === selectedEquipmentId) || null
    : null;

  const openFaultCount = faults.filter(
    (f) => f.status !== 'Closed' && f.status !== 'Resolved'
  ).length;
  const overdueMaintCount = maintenance.filter((m) => m.status === 'Overdue').length;
  const pendingMovementsCount = movements.filter(
    (m) => m.status === 'Pending Approval' || m.status === 'Overdue'
  ).length;

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      <Sidebar
        activeSection={activeSection}
        onSelectSection={handleSelectSection}
        openFaultCount={openFaultCount}
        overdueMaintCount={overdueMaintCount}
        pendingMovementsCount={pendingMovementsCount}
        activeRole={activeRole}
        mobileOpen={mobileNavOpen}
        onCloseMobile={() => setMobileNavOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          sectionTitle={
            selectedEquipment
              ? `${selectedEquipment.assetId} · ${selectedEquipment.name}`
              : SECTION_TITLES[activeSection]
          }
          equipment={equipment}
          notifications={notifications}
          onMarkAllRead={() =>
            setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
          }
          onSelectNotification={(notif) => {
            setNotifications((prev) =>
              prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
            );
            if (notif.equipmentId) {
              setSelectedEquipmentId(notif.equipmentId);
            }
          }}
          onSelectEquipment={handleOpenEquipment}
          onNavigate={handleSelectSection}
          onOpenMobileNav={() => setMobileNavOpen(true)}
          firebaseUser={firebaseUser}
          authLoading={authLoading}
          onSignInGoogle={handleSignInGoogle}
          onSignOutGoogle={handleSignOutGoogle}
          activeRole={activeRole}
          firestoreSynced={firestoreSynced}
        />

        <main className="flex-1 p-4 sm:p-6 max-w-[1440px] w-full mx-auto">
          {bannerError && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3 text-xs text-red-900">
              <span className="truncate">{bannerError}</span>
              <button
                type="button"
                onClick={() => setBannerError(null)}
                className="font-medium underline shrink-0"
              >
                Dismiss
              </button>
            </div>
          )}

          {selectedEquipment ? (
            <EquipmentDetailView
              equipment={selectedEquipment}
              movements={movements}
              maintenance={maintenance}
              faults={faults}
              history={history}
              activeRole={activeRole}
              onBack={() => setSelectedEquipmentId(null)}
              onQuickMove={(eqId) => {
                setSelectedEquipmentId(null);
                setPreselectMoveEqId(eqId);
                setActiveSection('movements');
              }}
              onQuickFault={(eqId) => {
                setSelectedEquipmentId(null);
                setPreselectFaultEqId(eqId);
                setActiveSection('faults');
              }}
              onQuickMaintenance={(eqId) => {
                setSelectedEquipmentId(null);
                setPreselectMaintEqId(eqId);
                setActiveSection('maintenance');
              }}
            />
          ) : (
            <>
              {activeSection === 'dashboard' && (
                <DashboardView
                  equipment={equipment}
                  maintenance={maintenance}
                  faults={faults}
                  history={history}
                  onSelectEquipment={handleOpenEquipment}
                  onNavigate={handleSelectSection}
                />
              )}

              {activeSection === 'inventory' && (
                <EquipmentInventoryView
                  equipment={equipment}
                  activeRole={activeRole}
                  onSelectEquipment={handleOpenEquipment}
                  onAddEquipment={handleAddEquipment}
                  onUpdateEquipment={handleUpdateEquipment}
                />
              )}

              {activeSection === 'movements' && (
                <MovementsView
                  equipment={equipment}
                  movements={movements}
                  activeRole={activeRole}
                  preselectedEquipmentId={preselectMoveEqId}
                  onClearPreselect={() => setPreselectMoveEqId(null)}
                  onRecordMovement={handleRecordMovement}
                  onUpdateMovementStatus={handleUpdateMovementStatus}
                  onSelectEquipment={handleOpenEquipment}
                />
              )}

              {activeSection === 'maintenance' && (
                <MaintenanceView
                  equipment={equipment}
                  maintenance={maintenance}
                  activeRole={activeRole}
                  preselectedEquipmentId={preselectMaintEqId}
                  onClearPreselect={() => setPreselectMaintEqId(null)}
                  onCreateTask={handleCreateMaintenance}
                  onCompleteTask={handleCompleteMaintenance}
                  onSelectEquipment={handleOpenEquipment}
                />
              )}

              {activeSection === 'faults' && (
                <FaultReportsView
                  equipment={equipment}
                  faults={faults}
                  activeRole={activeRole}
                  preselectedEquipmentId={preselectFaultEqId}
                  onClearPreselect={() => setPreselectFaultEqId(null)}
                  onReportFault={handleReportFault}
                  onUpdateFault={handleUpdateFault}
                  onSelectEquipment={handleOpenEquipment}
                />
              )}

              {activeSection === 'departments' && (
                <DepartmentsView
                  equipment={equipment}
                  onSelectEquipment={handleOpenEquipment}
                />
              )}

              {activeSection === 'reports' && (
                <ReportsView
                  equipment={equipment}
                  movements={movements}
                  maintenance={maintenance}
                  faults={faults}
                  onSelectEquipment={handleOpenEquipment}
                />
              )}

              {activeSection === 'users' && (
                <UserManagementView
                  activeRole={activeRole}
                  onChangeActiveRole={setActiveRole}
                />
              )}

              {activeSection === 'settings' && (
                <SettingsView
                  firebaseUser={firebaseUser}
                  firestoreSynced={firestoreSynced}
                  onSignInGoogle={handleSignInGoogle}
                  onResetDemoWorkspace={handleResetDemoWorkspace}
                />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

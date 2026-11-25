import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  Unsubscribe,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  EquipmentAsset,
  EquipmentMovement,
  FaultReport,
  HistoryEvent,
  MaintenanceTask,
  UserRole,
} from '../types/bems';

const safeId = (val: string) => val.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 128);
const safeAssetCode = (val: string) =>
  val
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '-')
    .slice(0, 32) || 'ASSET-000';
const safeStr = (val: string | undefined, max: number) => (val ?? '').slice(0, max);
const safeNonEmpty = (val: string | undefined, fallback: string, max: number) => {
  const trimmed = (val ?? '').trim();
  return (trimmed.length > 0 ? trimmed : fallback).slice(0, max);
};

export function sanitizeEquipmentPayload(item: EquipmentAsset, ownerUid: string) {
  return {
    id: safeId(item.id),
    assetId: safeAssetCode(item.assetId),
    name: safeNonEmpty(item.name, 'Medical Device', 120),
    category: safeNonEmpty(item.category, 'General Medical', 64),
    manufacturer: safeNonEmpty(item.manufacturer, 'Unspecified', 80),
    model: safeNonEmpty(item.model, 'Standard', 80),
    serialNumber: safeNonEmpty(item.serialNumber, 'SN-PENDING', 64),
    department: safeNonEmpty(item.department, 'Biomedical Engineering', 80),
    location: safeStr(item.location, 120),
    condition: item.condition,
    status: item.status,
    responsibleParty: safeNonEmpty(item.responsibleParty, 'Biomedical Engineering', 100),
    lastHandler: safeNonEmpty(item.lastHandler, 'System', 100),
    lastMovementAt: safeStr(item.lastMovementAt, 40),
    acquisitionDate: safeStr(item.acquisitionDate, 32),
    lastServiceDate: safeStr(item.lastServiceDate, 32),
    nextServiceDate: safeStr(item.nextServiceDate, 32),
    lastUpdated: safeStr(item.lastUpdated, 40),
    notes: safeStr(item.notes, 1000),
    ownerUid: safeId(ownerUid),
  };
}

export function sanitizeMovementPayload(item: EquipmentMovement, ownerUid: string) {
  return {
    id: safeId(item.id),
    equipmentId: safeId(item.equipmentId),
    assetId: safeAssetCode(item.assetId),
    equipmentName: safeNonEmpty(item.equipmentName, 'Medical Device', 120),
    originDepartment: safeNonEmpty(item.originDepartment, 'Unassigned', 80),
    originLocation: safeStr(item.originLocation, 120),
    destinationDepartment: safeNonEmpty(item.destinationDepartment, 'Unassigned', 80),
    destinationLocation: safeNonEmpty(item.destinationLocation, 'Assigned Bay', 120),
    authorizingPerson: safeNonEmpty(item.authorizingPerson, 'Biomedical Lead', 100),
    releasingPerson: safeNonEmpty(item.releasingPerson, 'Department Staff', 100),
    receivingPerson: safeNonEmpty(item.receivingPerson, 'Receiving Staff', 100),
    movementDate: safeNonEmpty(item.movementDate, '2026-11-25 08:00', 40),
    expectedReturnDate: safeStr(item.expectedReturnDate, 40),
    actualReturnDate: safeStr(item.actualReturnDate, 40),
    status: item.status,
    notes: safeStr(item.notes, 1000),
    ownerUid: safeId(ownerUid),
  };
}

export function sanitizeMaintenancePayload(item: MaintenanceTask, ownerUid: string) {
  return {
    id: safeId(item.id),
    equipmentId: safeId(item.equipmentId),
    assetId: safeAssetCode(item.assetId),
    equipmentName: safeNonEmpty(item.equipmentName, 'Medical Device', 120),
    type: item.type,
    lastMaintenanceDate: safeStr(item.lastMaintenanceDate, 32),
    nextMaintenanceDate: safeNonEmpty(item.nextMaintenanceDate, '2026-12-01', 32),
    assignedEngineer: safeNonEmpty(item.assignedEngineer, 'Biomedical Engineer', 100),
    priority: item.priority,
    status: item.status,
    instructions: safeStr(item.instructions, 1000),
    workPerformed: safeStr(item.workPerformed, 1000),
    faultsDiscovered: safeStr(item.faultsDiscovered, 1000),
    partsReplaced: safeStr(item.partsReplaced, 500),
    completionDate: safeStr(item.completionDate, 32),
    completedBy: safeStr(item.completedBy, 100),
    postCondition: safeStr(item.postCondition, 64),
    recommendations: safeStr(item.recommendations, 1000),
    ownerUid: safeId(ownerUid),
  };
}

export function sanitizeFaultPayload(item: FaultReport, ownerUid: string) {
  return {
    id: safeId(item.id),
    faultCode: safeAssetCode(item.faultCode),
    equipmentId: safeId(item.equipmentId),
    assetId: safeAssetCode(item.assetId),
    equipmentName: safeNonEmpty(item.equipmentName, 'Medical Device', 120),
    reportingDepartment: safeNonEmpty(item.reportingDepartment, 'Clinical Unit', 80),
    reportedBy: safeNonEmpty(item.reportedBy, 'Clinical Staff', 100),
    reportedAt: safeNonEmpty(item.reportedAt, '2026-11-25 08:00', 40),
    description: safeNonEmpty(item.description, 'Reported fault', 1000),
    severity: item.severity,
    status: item.status,
    assignedEngineer: safeStr(item.assignedEngineer, 100),
    resolutionNotes: safeStr(item.resolutionNotes, 1000),
    resolutionDate: safeStr(item.resolutionDate, 40),
    ownerUid: safeId(ownerUid),
  };
}

export function sanitizeHistoryPayload(item: HistoryEvent, ownerUid: string) {
  return {
    id: safeId(item.id),
    equipmentId: safeId(item.equipmentId),
    assetId: safeAssetCode(item.assetId),
    eventType: safeNonEmpty(item.eventType, 'Update', 64),
    timestamp: safeNonEmpty(item.timestamp, '2026-11-25 08:00', 40),
    responsibleUser: safeNonEmpty(item.responsibleUser, 'System', 100),
    previousValue: safeStr(item.previousValue, 160),
    newValue: safeStr(item.newValue, 160),
    notes: safeStr(item.notes, 1000),
    ownerUid: safeId(ownerUid),
  };
}

export async function ensureUserProfile(
  uid: string,
  email: string,
  displayName: string,
  role: UserRole = 'Biomedical Engineer'
) {
  const path = `users/${uid}`;
  try {
    const q = query(collection(db, 'users'), where('uid', '==', uid));
    const snap = await getDocs(q);
    if (snap.empty) {
      await setDoc(doc(db, 'users', uid), {
        uid: safeId(uid),
        email: safeNonEmpty(email, 'user@hospital.demo', 254),
        displayName: safeNonEmpty(displayName, 'Biomedical Staff', 120),
        role: email === 'timbrelplatforms@gmail.com' ? 'Administrator' : role,
        department: 'Biomedical Engineering',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function seedUserWorkspaceIfEmpty(
  uid: string,
  initialEquipment: EquipmentAsset[],
  initialMovements: EquipmentMovement[],
  initialMaintenance: MaintenanceTask[],
  initialFaults: FaultReport[],
  initialHistory: HistoryEvent[]
): Promise<boolean> {
  try {
    const existingEq = await getDocs(query(collection(db, 'equipment'), where('ownerUid', '==', uid)));
    if (!existingEq.empty) {
      return false;
    }

    const batch = writeBatch(db);

    for (const eq of initialEquipment) {
      batch.set(doc(db, 'equipment', safeId(eq.id)), {
        ...sanitizeEquipmentPayload(eq, uid),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    for (const mov of initialMovements) {
      batch.set(doc(db, 'movements', safeId(mov.id)), {
        ...sanitizeMovementPayload(mov, uid),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    for (const task of initialMaintenance) {
      batch.set(doc(db, 'maintenanceTasks', safeId(task.id)), {
        ...sanitizeMaintenancePayload(task, uid),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    for (const fault of initialFaults) {
      batch.set(doc(db, 'faultReports', safeId(fault.id)), {
        ...sanitizeFaultPayload(fault, uid),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    for (const hist of initialHistory) {
      batch.set(doc(db, 'historyEvents', safeId(hist.id)), {
        ...sanitizeHistoryPayload(hist, uid),
        createdAt: serverTimestamp(),
      });
    }

    await batch.commit();
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'equipment');
  }
}

export function subscribeWorkspace(
  uid: string,
  callbacks: {
    onEquipment: (items: EquipmentAsset[]) => void;
    onMovements: (items: EquipmentMovement[]) => void;
    onMaintenance: (items: MaintenanceTask[]) => void;
    onFaults: (items: FaultReport[]) => void;
    onHistory: (items: HistoryEvent[]) => void;
  }
): () => void {
  const unsubs: UnscribeList = [];

  unsubs.push(
    onSnapshot(
      query(collection(db, 'equipment'), where('ownerUid', '==', uid)),
      (snap) => {
        callbacks.onEquipment(snap.docs.map((d) => d.data() as EquipmentAsset));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'equipment')
    )
  );

  unsubs.push(
    onSnapshot(
      query(collection(db, 'movements'), where('ownerUid', '==', uid)),
      (snap) => {
        callbacks.onMovements(snap.docs.map((d) => d.data() as EquipmentMovement));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'movements')
    )
  );

  unsubs.push(
    onSnapshot(
      query(collection(db, 'maintenanceTasks'), where('ownerUid', '==', uid)),
      (snap) => {
        callbacks.onMaintenance(snap.docs.map((d) => d.data() as MaintenanceTask));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'maintenanceTasks')
    )
  );

  unsubs.push(
    onSnapshot(
      query(collection(db, 'faultReports'), where('ownerUid', '==', uid)),
      (snap) => {
        callbacks.onFaults(snap.docs.map((d) => d.data() as FaultReport));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'faultReports')
    )
  );

  unsubs.push(
    onSnapshot(
      query(collection(db, 'historyEvents'), where('ownerUid', '==', uid)),
      (snap) => {
        callbacks.onHistory(snap.docs.map((d) => d.data() as HistoryEvent));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'historyEvents')
    )
  );

  return () => {
    unsubs.forEach((u) => u());
  };
}

type UnscribeList = Unsubscribe[];

export async function persistEquipmentCreate(uid: string, item: EquipmentAsset, event: HistoryEvent) {
  const id = safeId(item.id);
  try {
    const batch = writeBatch(db);
    batch.set(doc(db, 'equipment', id), {
      ...sanitizeEquipmentPayload(item, uid),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    batch.set(doc(db, 'historyEvents', safeId(event.id)), {
      ...sanitizeHistoryPayload(event, uid),
      createdAt: serverTimestamp(),
    });
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `equipment/${id}`);
  }
}

export async function persistEquipmentUpdate(
  uid: string,
  item: EquipmentAsset,
  event?: HistoryEvent
) {
  const id = safeId(item.id);
  try {
    const sanitized = sanitizeEquipmentPayload(item, uid);
    const { id: _i, ownerUid: _o, acquisitionDate: _a, ...mutableFields } = sanitized;
    await updateDoc(doc(db, 'equipment', id), {
      ...mutableFields,
      updatedAt: serverTimestamp(),
    });
    if (event) {
      await setDoc(doc(db, 'historyEvents', safeId(event.id)), {
        ...sanitizeHistoryPayload(event, uid),
        createdAt: serverTimestamp(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `equipment/${id}`);
  }
}

export async function persistMovementRecord(
  uid: string,
  movement: EquipmentMovement,
  updatedEquipment: EquipmentAsset,
  event: HistoryEvent
) {
  const id = safeId(movement.id);
  try {
    const batch = writeBatch(db);
    batch.set(doc(db, 'movements', id), {
      ...sanitizeMovementPayload(movement, uid),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    const sanitizedEq = sanitizeEquipmentPayload(updatedEquipment, uid);
    const { id: _i, ownerUid: _o, acquisitionDate: _a, ...eqUpdates } = sanitizedEq;
    batch.update(doc(db, 'equipment', safeId(updatedEquipment.id)), {
      ...eqUpdates,
      updatedAt: serverTimestamp(),
    });
    batch.set(doc(db, 'historyEvents', safeId(event.id)), {
      ...sanitizeHistoryPayload(event, uid),
      createdAt: serverTimestamp(),
    });
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `movements/${id}`);
  }
}

export async function persistMovementStatusUpdate(
  movement: EquipmentMovement,
  uid: string,
  event?: HistoryEvent
) {
  const id = safeId(movement.id);
  try {
    await updateDoc(doc(db, 'movements', id), {
      status: movement.status,
      actualReturnDate: safeStr(movement.actualReturnDate, 40),
      receivingPerson: safeNonEmpty(movement.receivingPerson, 'Receiving Staff', 100),
      notes: safeStr(movement.notes, 1000),
      updatedAt: serverTimestamp(),
    });
    if (event) {
      await setDoc(doc(db, 'historyEvents', safeId(event.id)), {
        ...sanitizeHistoryPayload(event, uid),
        createdAt: serverTimestamp(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `movements/${id}`);
  }
}

export async function persistMaintenanceCreate(
  uid: string,
  task: MaintenanceTask,
  updatedEquipment: EquipmentAsset | null,
  event: HistoryEvent
) {
  const id = safeId(task.id);
  try {
    const batch = writeBatch(db);
    batch.set(doc(db, 'maintenanceTasks', id), {
      ...sanitizeMaintenancePayload(task, uid),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    if (updatedEquipment) {
      const sanitizedEq = sanitizeEquipmentPayload(updatedEquipment, uid);
      const { id: _i, ownerUid: _o, acquisitionDate: _a, ...eqUpdates } = sanitizedEq;
      batch.update(doc(db, 'equipment', safeId(updatedEquipment.id)), {
        ...eqUpdates,
        updatedAt: serverTimestamp(),
      });
    }
    batch.set(doc(db, 'historyEvents', safeId(event.id)), {
      ...sanitizeHistoryPayload(event, uid),
      createdAt: serverTimestamp(),
    });
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `maintenanceTasks/${id}`);
  }
}

export async function persistMaintenanceComplete(
  uid: string,
  task: MaintenanceTask,
  updatedEquipment: EquipmentAsset,
  event: HistoryEvent
) {
  const id = safeId(task.id);
  try {
    const batch = writeBatch(db);
    const sanitizedTask = sanitizeMaintenancePayload(task, uid);
    batch.update(doc(db, 'maintenanceTasks', id), {
      status: sanitizedTask.status,
      lastMaintenanceDate: sanitizedTask.lastMaintenanceDate,
      nextMaintenanceDate: sanitizedTask.nextMaintenanceDate,
      workPerformed: sanitizedTask.workPerformed,
      faultsDiscovered: sanitizedTask.faultsDiscovered,
      partsReplaced: sanitizedTask.partsReplaced,
      completionDate: sanitizedTask.completionDate,
      completedBy: sanitizedTask.completedBy,
      postCondition: sanitizedTask.postCondition,
      recommendations: sanitizedTask.recommendations,
      updatedAt: serverTimestamp(),
    });
    const sanitizedEq = sanitizeEquipmentPayload(updatedEquipment, uid);
    const { id: _i, ownerUid: _o, acquisitionDate: _a, ...eqUpdates } = sanitizedEq;
    batch.update(doc(db, 'equipment', safeId(updatedEquipment.id)), {
      ...eqUpdates,
      updatedAt: serverTimestamp(),
    });
    batch.set(doc(db, 'historyEvents', safeId(event.id)), {
      ...sanitizeHistoryPayload(event, uid),
      createdAt: serverTimestamp(),
    });
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `maintenanceTasks/${id}`);
  }
}

export async function persistFaultCreate(
  uid: string,
  fault: FaultReport,
  updatedEquipment: EquipmentAsset,
  event: HistoryEvent
) {
  const id = safeId(fault.id);
  try {
    const batch = writeBatch(db);
    batch.set(doc(db, 'faultReports', id), {
      ...sanitizeFaultPayload(fault, uid),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    const sanitizedEq = sanitizeEquipmentPayload(updatedEquipment, uid);
    const { id: _i, ownerUid: _o, acquisitionDate: _a, ...eqUpdates } = sanitizedEq;
    batch.update(doc(db, 'equipment', safeId(updatedEquipment.id)), {
      ...eqUpdates,
      updatedAt: serverTimestamp(),
    });
    batch.set(doc(db, 'historyEvents', safeId(event.id)), {
      ...sanitizeHistoryPayload(event, uid),
      createdAt: serverTimestamp(),
    });
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `faultReports/${id}`);
  }
}

export async function persistFaultUpdate(
  uid: string,
  fault: FaultReport,
  event?: HistoryEvent
) {
  const id = safeId(fault.id);
  try {
    await updateDoc(doc(db, 'faultReports', id), {
      status: fault.status,
      assignedEngineer: safeStr(fault.assignedEngineer, 100),
      resolutionNotes: safeStr(fault.resolutionNotes, 1000),
      resolutionDate: safeStr(fault.resolutionDate, 40),
      updatedAt: serverTimestamp(),
    });
    if (event) {
      await setDoc(doc(db, 'historyEvents', safeId(event.id)), {
        ...sanitizeHistoryPayload(event, uid),
        createdAt: serverTimestamp(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `faultReports/${id}`);
  }
}

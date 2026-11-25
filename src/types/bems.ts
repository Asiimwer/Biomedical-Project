export type NavSection =
  | 'dashboard'
  | 'inventory'
  | 'movements'
  | 'maintenance'
  | 'faults'
  | 'departments'
  | 'reports'
  | 'users'
  | 'settings';

export type EquipmentStatus =
  | 'Operational'
  | 'Faulty'
  | 'Under Maintenance'
  | 'Awaiting Inspection'
  | 'Decommissioned';

export type EquipmentCondition =
  | 'Excellent'
  | 'Good'
  | 'Fair'
  | 'Needs Repair'
  | 'Unserviceable';

export type MovementStatus =
  | 'Pending Approval'
  | 'Released'
  | 'In Transit'
  | 'Received'
  | 'Returned'
  | 'Overdue';

export type MaintenanceType =
  | 'Preventive Maintenance'
  | 'Corrective Maintenance'
  | 'Inspection'
  | 'Calibration'
  | 'Safety Testing';

export type MaintenanceStatus =
  | 'Scheduled'
  | 'In Progress'
  | 'Completed'
  | 'Overdue'
  | 'Awaiting Parts';

export type PriorityLevel = 'Critical' | 'High' | 'Medium' | 'Low';

export type FaultStatus =
  | 'Reported'
  | 'Under Investigation'
  | 'Awaiting Parts'
  | 'Under Repair'
  | 'Resolved'
  | 'Closed';

export type UserRole =
  | 'Administrator'
  | 'Biomedical Engineer'
  | 'Department Personnel'
  | 'Read-Only/Auditor';

export interface EquipmentAsset {
  id: string;
  assetId: string;
  name: string;
  category: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  department: string;
  location: string;
  condition: EquipmentCondition;
  status: EquipmentStatus;
  responsibleParty: string;
  lastHandler: string;
  lastMovementAt: string;
  acquisitionDate: string;
  lastServiceDate: string;
  nextServiceDate: string;
  lastUpdated: string;
  notes: string;
  ownerUid?: string;
}

export interface EquipmentMovement {
  id: string;
  equipmentId: string;
  assetId: string;
  equipmentName: string;
  originDepartment: string;
  originLocation: string;
  destinationDepartment: string;
  destinationLocation: string;
  authorizingPerson: string;
  releasingPerson: string;
  receivingPerson: string;
  movementDate: string;
  expectedReturnDate: string;
  actualReturnDate: string;
  status: MovementStatus;
  notes: string;
  ownerUid?: string;
}

export interface MaintenanceTask {
  id: string;
  equipmentId: string;
  assetId: string;
  equipmentName: string;
  type: MaintenanceType;
  lastMaintenanceDate: string;
  nextMaintenanceDate: string;
  assignedEngineer: string;
  priority: PriorityLevel;
  status: MaintenanceStatus;
  instructions: string;
  workPerformed: string;
  faultsDiscovered: string;
  partsReplaced: string;
  completionDate: string;
  completedBy: string;
  postCondition: string;
  recommendations: string;
  ownerUid?: string;
}

export interface FaultReport {
  id: string;
  faultCode: string;
  equipmentId: string;
  assetId: string;
  equipmentName: string;
  reportingDepartment: string;
  reportedBy: string;
  reportedAt: string;
  description: string;
  severity: PriorityLevel;
  status: FaultStatus;
  assignedEngineer: string;
  resolutionNotes: string;
  resolutionDate: string;
  ownerUid?: string;
}

export interface HistoryEvent {
  id: string;
  equipmentId: string;
  assetId: string;
  eventType: string;
  timestamp: string;
  responsibleUser: string;
  previousValue: string;
  newValue: string;
  notes: string;
  ownerUid?: string;
}

export interface BemsNotification {
  id: string;
  category:
    | 'Overdue Maintenance'
    | 'Upcoming Inspection'
    | 'Critical Fault'
    | 'Movement Confirmation'
    | 'Overdue Return'
    | 'Missing Record';
  title: string;
  message: string;
  timestamp: string;
  severity: 'critical' | 'warning' | 'info';
  equipmentId?: string;
  read: boolean;
}

export interface DemoUserAccount {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  status: 'Active' | 'Inactive';
  lastActive: string;
}

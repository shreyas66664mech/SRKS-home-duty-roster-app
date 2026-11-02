export type DutyId = 
  | '10_turn'
  | 'veg_turn'
  | 'prayer_hall'
  | 'milk_curd'
  | 'majjige_turn'
  | 'gante'
  | (string & {});

export interface Student {
  id: string;
  name: string;
  rollNo?: number; // Resident Number #1 to #N
  isAway: boolean; // Flagged as 'went home'
  awayReason?: string;
  passwordHash?: string; // Hashed password for student login (default initial "12345")
}

export interface DutyDefinition {
  id: DutyId;
  title: string;
  subtitle: string;
  memberCount: number;
  direction: 'forward' | 'reverse';
  baseNames: string[]; // Starting names on baseline date
}

export interface RepeatPenalty {
  id: string;
  studentName: string;
  dutyId: DutyId;
  repeatCount: number; // Number of times to repeat
  completedCount: number;
  createdAtDate: string; // YYYY-MM-DD
  active: boolean;
}

export interface DayDutyStatus {
  dutyId: DutyId;
  assignedStudents: string[];
  isCompleted?: boolean;
  isSkipped?: boolean;
  hasRepeatPenalty?: boolean;
  customNotes?: string;
}

export interface DaySchedule {
  date: string; // YYYY-MM-DD
  duties: Record<DutyId, DayDutyStatus>;
}

export interface AppRosterData {
  baselineDate: string;
  students: Student[];
  duties?: DutyDefinition[]; // Configurable turn cycle duties
  penalties: RepeatPenalty[];
  overrides: Record<string, Record<DutyId, Partial<DayDutyStatus>>>; // date -> dutyId -> override
  completedDuties: Record<string, DutyId[]>; // date -> completed duty ids
  adminPasswordHash: string;
  isPasswordSet: boolean;
  lastUpdated?: number;
}

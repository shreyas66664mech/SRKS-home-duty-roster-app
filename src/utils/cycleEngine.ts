import { DutyDefinition, DutyId, Student, RepeatPenalty, DayDutyStatus } from '../types/roster';

export const INITIAL_STUDENTS: Student[] = [
  { id: '1', name: 'Bhargav', rollNo: 1, isAway: false },
  { id: '2', name: 'Sudarshan', rollNo: 2, isAway: false },
  { id: '3', name: 'Preetham B', rollNo: 3, isAway: false },
  { id: '4', name: 'Aneesh', rollNo: 4, isAway: false },
  { id: '5', name: 'Shreyas', rollNo: 5, isAway: false },
  { id: '6', name: 'Narasimha', rollNo: 6, isAway: false },
  { id: '7', name: 'Mr Preetham', rollNo: 7, isAway: false },
  { id: '8', name: 'Mohan', rollNo: 8, isAway: false },
  { id: '9', name: 'Pavanaj', rollNo: 9, isAway: false },
  { id: '10', name: 'Vasanth', rollNo: 10, isAway: false },
  { id: '11', name: 'Sheersha', rollNo: 11, isAway: false },
  { id: '12', name: 'Tharun', rollNo: 12, isAway: false },
  { id: '13', name: 'Sanjay', rollNo: 13, isAway: false },
  { id: '14', name: 'Hemanth', rollNo: 14, isAway: false },
  { id: '15', name: 'Abhay', rollNo: 15, isAway: false },
  { id: '16', name: 'Vikas', rollNo: 16, isAway: false },
  { id: '17', name: 'Kushal', rollNo: 17, isAway: false },
];

/**
 * Returns clean resident number string e.g. "#01" for a student name
 */
export function getResidentNumber(studentName: string, students: Student[]): string {
  if (!studentName || !students) return '';
  const idx = students.findIndex((s) => s.name.trim().toLowerCase() === studentName.trim().toLowerCase());
  if (idx === -1) return '';
  const s = students[idx];
  const num = typeof s.rollNo === 'number' && s.rollNo > 0 ? s.rollNo : idx + 1;
  return `#${num.toString().padStart(2, '0')}`;
}


export const BASELINE_DATE = '2026-10-29';

/**
 * Returns today's actual current local date in YYYY-MM-DD format
 */
export function getSystemTodayDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const DUTY_DEFINITIONS: DutyDefinition[] = [
  {
    id: '10_turn',
    title: '10 Turn',
    subtitle: 'Bathroom cleaning',
    memberCount: 1,
    direction: 'forward',
    baseNames: ['Shreyas'],
  },
  {
    id: 'veg_turn',
    title: 'Veg Turn',
    subtitle: 'Vegetable duty',
    memberCount: 1,
    direction: 'reverse',
    baseNames: ['Sheersha'],
  },
  {
    id: 'prayer_hall',
    title: 'Prayer Hall',
    subtitle: 'Prayer hall cleaning',
    memberCount: 2,
    direction: 'forward',
    baseNames: ['Tharun', 'Sheersha'],
  },
  {
    id: 'milk_curd',
    title: 'Hallu Mosaru',
    subtitle: 'Milk / curd duty',
    memberCount: 1,
    direction: 'forward',
    baseNames: ['Bhargav'],
  },
  {
    id: 'majjige_turn',
    title: 'Majjige Turn',
    subtitle: 'Buttermilk duty',
    memberCount: 1,
    direction: 'reverse',
    baseNames: ['Sudarshan'],
  },
  {
    id: 'gante',
    title: 'Gante',
    subtitle: 'Bell duty',
    memberCount: 1,
    direction: 'reverse',
    baseNames: ['Sheersha'],
  },
];

/**
 * Calculates calendar day offset between two YYYY-MM-DD strings
 */
export function getDaysDiff(targetDateStr: string, baseDateStr: string = BASELINE_DATE): number {
  const [tY, tM, tD] = targetDateStr.split('-').map(Number);
  const [bY, bM, bD] = baseDateStr.split('-').map(Number);
  
  const target = Date.UTC(tY, tM - 1, tD);
  const base = Date.UTC(bY, bM - 1, bD);
  
  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  return Math.round((target - base) / MS_PER_DAY);
}

/**
 * Normalizes index within array bounds
 */
function modulo(n: number, m: number): number {
  return ((n % m) + m) % m;
}

/**
 * Calculates the schedule for all duties on a specific target date
 */
export function calculateRosterForDate(
  targetDate: string,
  students: Student[] = INITIAL_STUDENTS,
  penalties: RepeatPenalty[] = [],
  overrides: Record<string, Record<DutyId, Partial<DayDutyStatus>>> = {},
  completedDuties: Record<string, DutyId[]> = {},
  baselineDate: string = BASELINE_DATE,
  customDuties?: DutyDefinition[]
): Record<DutyId, DayDutyStatus> {
  const safeStudents = (students && students.length > 0) ? students : INITIAL_STUDENTS;
  const safePenalties = Array.isArray(penalties) ? penalties : [];
  const safeOverrides = overrides || {};
  const safeCompletedDuties = completedDuties || {};
  const safeBaselineDate = baselineDate || BASELINE_DATE;
  const activeDuties = (Array.isArray(customDuties) && customDuties.length > 0) ? customDuties : DUTY_DEFINITIONS;

  const activeStudents = safeStudents.filter(s => !s.isAway);
  // Fallback to all students if everyone is away
  const pool = activeStudents.length > 0 ? activeStudents : safeStudents;
  const poolNames = pool.map(s => s.name);
  const daysDiff = getDaysDiff(targetDate, safeBaselineDate);

  const result = {} as Record<DutyId, DayDutyStatus>;

  for (const duty of activeDuties) {
    const isCompleted = safeCompletedDuties[targetDate]?.includes(duty.id) ?? false;
    const dayOverride = safeOverrides[targetDate]?.[duty.id];

    // If there is an explicit override for this day, use it
    if (dayOverride?.assignedStudents && dayOverride.assignedStudents.length > 0) {
      result[duty.id] = {
        dutyId: duty.id,
        assignedStudents: dayOverride.assignedStudents,
        isCompleted: dayOverride.isCompleted ?? isCompleted,
        isSkipped: dayOverride.isSkipped ?? false,
        hasRepeatPenalty: dayOverride.hasRepeatPenalty ?? false,
        customNotes: dayOverride.customNotes,
      };
      continue;
    }

    let assigned: string[] = [];
    const baseIndex1 = poolNames.indexOf(duty.baseNames[0]);
    const startIndex1 = baseIndex1 !== -1 ? baseIndex1 : 0;
    const baseIndex2 = duty.baseNames[1] ? poolNames.indexOf(duty.baseNames[1]) : modulo(startIndex1 + 1, poolNames.length);
    const startIndex2 = baseIndex2 !== -1 ? baseIndex2 : modulo(startIndex1 + 1, poolNames.length);

    // Calculate completions prior to targetDate
    let completionsPrior = 0;
    for (const [dStr, completedIds] of Object.entries(safeCompletedDuties)) {
      if (dStr < targetDate && Array.isArray(completedIds) && completedIds.includes(duty.id)) {
        completionsPrior++;
      }
    }

    const N = Math.max(1, typeof duty.memberCount === 'number' && duty.memberCount > 0 ? duty.memberCount : 1);

    // Active repeat penalty check:
    const activePenalty = safePenalties.find(
      p => p.active && p.dutyId === duty.id && p.repeatCount > p.completedCount
    );

    // If an active repeat penalty exists for this duty:
    if (activePenalty) {
      if (N === 1) {
        assigned = [activePenalty.studentName];
      } else if (N === 2) {
        // 2-member duty pairing with penalty student without duplicate names
        const partnerOffset = completionsPrior * 2 * (duty.direction === 'forward' ? 1 : -1);
        let partnerIdx = modulo(startIndex2 + partnerOffset, poolNames.length);
        if (poolNames[partnerIdx] === activePenalty.studentName && poolNames.length > 1) {
          partnerIdx = modulo(partnerIdx + 1, poolNames.length);
        }
        assigned = [activePenalty.studentName, poolNames[partnerIdx]];
      } else {
        // N > 2: Penalty resident is placed in slot 0, remaining N-1 slots filled with rotating cycle members
        assigned = [activePenalty.studentName];
        const step = completionsPrior * N * (duty.direction === 'forward' ? 1 : -1);
        for (let k = 1; k < N; k++) {
          const baseName = duty.baseNames && duty.baseNames[k];
          const startIdx = baseName && poolNames.indexOf(baseName) !== -1
            ? poolNames.indexOf(baseName)
            : modulo(startIndex1 + k, poolNames.length);
          let pIdx = modulo(startIdx + step, poolNames.length);
          let attempts = 0;
          while (assigned.includes(poolNames[pIdx]) && assigned.length < poolNames.length && attempts < poolNames.length) {
            pIdx = modulo(pIdx + 1, poolNames.length);
            attempts++;
          }
          if (!assigned.includes(poolNames[pIdx])) {
            assigned.push(poolNames[pIdx]);
          }
        }
      }

      result[duty.id] = {
        dutyId: duty.id,
        assignedStudents: assigned,
        isCompleted,
        hasRepeatPenalty: true,
        customNotes: `Repeat penalty (${activePenalty.completedCount + 1}/${activePenalty.repeatCount})`,
      };
      continue;
    }

    // Completion-authoritative cyclic progression with chronological date fallback:
    // Duty advances when marked done, and past/future dates show previous/next turns accordingly
    const daysFromBaseline = getDaysDiff(targetDate, safeBaselineDate);
    const turnCount = completionsPrior > 0 ? completionsPrior : daysFromBaseline;
    const directionMultiplier = duty.direction === 'forward' ? 1 : -1;
    const stepOffset = turnCount * directionMultiplier;

    if (N === 1) {
      const currentIndex = modulo(startIndex1 + stepOffset, poolNames.length);
      assigned = [poolNames[currentIndex]];
    } else if (N === 2) {
      // 2 members (e.g. Prayer Hall): Each completed turn assigns TWO residents
      let idx1 = modulo(startIndex1 + stepOffset * 2, poolNames.length);
      let idx2 = modulo(startIndex2 + stepOffset * 2, poolNames.length);

      // Ensure no duplicate member if pool count collides
      if (idx1 === idx2 && poolNames.length > 1) {
        idx2 = modulo(idx2 + 1, poolNames.length);
      }

      // Maintain user's requested pair presentation
      if (turnCount === 0) {
        assigned = [poolNames[idx1], poolNames[idx2]];
      } else {
        assigned = [poolNames[idx2], poolNames[idx1]];
      }
    } else {
      // General arbitrary N members per turn:
      // Collect starting indices for each of the N positions
      const startIndices: number[] = [];
      for (let k = 0; k < N; k++) {
        const baseName = duty.baseNames && duty.baseNames[k];
        const foundIdx = baseName ? poolNames.indexOf(baseName) : -1;
        if (foundIdx !== -1) {
          startIndices.push(foundIdx);
        } else if (k === 0) {
          startIndices.push(startIndex1);
        } else {
          startIndices.push(modulo(startIndex1 + k, poolNames.length));
        }
      }

      const shift = stepOffset * N;
      const pickedIndices: number[] = [];
      for (let k = 0; k < N; k++) {
        let candidate = modulo(startIndices[k] + shift, poolNames.length);
        let attempts = 0;
        while (pickedIndices.includes(candidate) && pickedIndices.length < poolNames.length && attempts < poolNames.length) {
          candidate = modulo(candidate + 1, poolNames.length);
          attempts++;
        }
        pickedIndices.push(candidate);
      }
      assigned = pickedIndices.map(i => poolNames[i]).filter(Boolean);
    }

    result[duty.id] = {
      dutyId: duty.id,
      assignedStudents: assigned,
      isCompleted,
      isSkipped: false,
      hasRepeatPenalty: false,
    };
  }

  return result;
}

/**
 * Generates an upcoming schedule for a specific student for the next N days
 */
export function getUpcomingDutiesForStudent(
  studentName: string,
  startDateStr: string,
  daysAhead: number = 30,
  students: Student[],
  penalties: RepeatPenalty[],
  overrides: Record<string, Record<DutyId, Partial<DayDutyStatus>>>,
  completedDuties: Record<string, DutyId[]>,
  baselineDate: string = BASELINE_DATE,
  customDuties?: DutyDefinition[]
): Array<{ date: string; duty: DutyDefinition; isPartner?: boolean }> {
  const activeDuties = (Array.isArray(customDuties) && customDuties.length > 0) ? customDuties : DUTY_DEFINITIONS;
  const upcoming: Array<{ date: string; duty: DutyDefinition; isPartner?: boolean }> = [];
  const [sY, sM, sD] = startDateStr.split('-').map(Number);
  const baseDate = new Date(Date.UTC(sY, sM - 1, sD));

  // Build projected completions: start with actual completions, and simulate daily completion for unrecorded days so students can see upcoming projected turns
  const simulatedCompletions: Record<string, DutyId[]> = { ...completedDuties };
  const allDutyIds = activeDuties.map(d => d.id);

  for (let i = 0; i < daysAhead; i++) {
    const curDate = new Date(baseDate);
    curDate.setUTCDate(baseDate.getUTCDate() + i);
    const dateStr = curDate.toISOString().split('T')[0];

    const roster = calculateRosterForDate(
      dateStr,
      students,
      penalties,
      overrides,
      simulatedCompletions,
      baselineDate,
      activeDuties
    );

    // After evaluating dateStr, project it as completed for future day projections if not already recorded
    if (!simulatedCompletions[dateStr]) {
      simulatedCompletions[dateStr] = allDutyIds;
    }

    for (const duty of activeDuties) {
      const status = roster[duty.id];
      if (status && status.assignedStudents.includes(studentName)) {
        upcoming.push({
          date: dateStr,
          duty,
          isPartner: (duty.memberCount || 1) > 1 && status.assignedStudents.indexOf(studentName) > 0,
        });
      }
    }
  }

  return upcoming;
}

/**
 * Computes the sequenced list of students for a specific cycle based on its direction
 * and starting resident(s), so the admin can clearly see who follows whom in each cycle!
 */
export function getCycleStudentOrder(duty: DutyDefinition, students: Student[]): string[] {
  const activeStudents = students.filter(s => !s.isAway);
  const pool = activeStudents.length > 0 ? activeStudents : students;
  const poolNames = pool.map(s => s.name);
  if (poolNames.length === 0) return [];

  const baseName = duty.baseNames[0];
  let startIdx = poolNames.indexOf(baseName);
  if (startIdx === -1) startIdx = 0;

  const ordered: string[] = [];
  const n = poolNames.length;
  for (let i = 0; i < n; i++) {
    const idx = duty.direction === 'forward'
      ? (startIdx + i) % n
      : ((startIdx - i) % n + n) % n;
    ordered.push(poolNames[idx]);
  }
  return ordered;
}


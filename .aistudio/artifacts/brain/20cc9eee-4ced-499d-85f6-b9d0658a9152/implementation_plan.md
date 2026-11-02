# Hostel Duty Roster - Completion-Authoritative Rotation & Direction Updates

## User Review & Critical Decisions

> [!IMPORTANT]
> The progression model is transitioning from pure calendar-date shifting to **Admin Completion-Authoritative Progression**: a student stays on duty until their work is completed. Only when the Admin marks that specific work as "Done" does that duty advance to the next resident in the cycle.

- **Confirmed Decision 1 (Progress on Done Only)**: If a resident does not complete their work on a given day, they remain assigned the next day. Marking a duty "Done" increments that duty's cycle step to the next resident.
- **Confirmed Decision 2 (Updated Forward/Reverse Directions)**:
  - **Forward Cycle (1 → 17)**:
    1. **Prayer Hall** (2 members, advances by 1 member upon each completion)
    2. **Hallu Mosaru / Milk and Curd** (1 member)
    3. **10 Turn (Bathroom cleaning)** (1 member)
  - **Reverse Cycle (17 → 1)**:
    4. **Veg Turn** (1 member)
    5. **Majjige Turn** (1 member)
    6. **Gante (Bell)** (1 member)
- **Confirmed Decision 3 (Prayer Hall 2-New-Residents Turn Advance)**: Prayer Hall assigns two distinct residents `[Student X, Student Y]` and advances by 2 students upon each completion (two completely new residents every turn, with no person repeating on consecutive turns, e.g. `[Tharun, Sheersha] → [Sanjay, Hemanth] → [Abhay, Vikas] ...`).
- **Confirmed Decision 4 (Active Baseline Anchors)**:
  - **Prayer Hall**: Tharun & Sheersha
  - **Veg Turn**: Sheersha
  - **Milk and Curd (Hallu Mosaru)**: Bhargav
  - **Majjige Turn**: Sudarshan
  - **10 Turn**: Shreyas
  - **Gante**: Sheersha

---

## 1. Overview & Core Concept

- **What It Does**: Shifts the roster from passive calendar calculation to an active duty management cycle. Each duty maintains its current active turn and queue position. When an administrator marks a duty done, the duty permanently completes for that day and advances to the next student in the forward/reverse cycle.
- **Resident Experience**: When students open the roster tomorrow, anyone whose duty was not marked done remains on that duty. Students always know their actual current turn regardless of date skips.
- **Admin Workflow**: Admin marks duty done → duty immediately stamps completion date and advances cycle to the next student. Admin can also undo completion, skip an absent student, or log repeat penalties.

---

## 2. Technical Architecture & State Strategy

### Architecture Diagram

```
┌────────────────────────────────────────────────────────┐
│                      Hostel Roster                     │
├────────────────────────────────────────────────────────┤
│ Active Duty State Store (DutyProgress):                │
│  - 10 Turn:       cycleIndex (Forward)   -> Shreyas    │
│  - Milk & Curd:   cycleIndex (Forward)   -> Bhargav    │
│  - Prayer Hall:   cycleIndex (Forward)   -> Tharun &   │
│                                              Sheersha  │
│  - Veg Turn:      cycleIndex (Reverse)   -> Sheersha   │
│  - Majjige Turn:  cycleIndex (Reverse)   -> Sudarshan  │
│  - Gante:         cycleIndex (Reverse)   -> Sheersha   │
├────────────────────────────────────────────────────────┤
│ State Transition Rules:                                │
│  [Mark Done] -> Duty cycle index moves +1 (or -1)      │
│  [Not Done]  -> Current student stays on duty next day │
│  [Skip Home] -> Cycles forward to next present student │
│  [Repeat N]  -> Requires student to complete N times   │
│                 before cycle advances                  │
└────────────────────────────────────────────────────────┘
```

### Key Data Model Updates

```typescript
interface DutyCycleState {
  currentStudentIndex: number; // Index in student roster
  partnerStudentIndex?: number; // Second person for Prayer Hall
  completedOnDate?: string;
  isDoneToday: boolean;
  history: Array<{ date: string; studentNames: string[]; completedAt: string }>;
}
```

---

## 3. Implementation Steps

1. **Cycle Engine Updates (`src/utils/cycleEngine.ts`)**:
   - Update `DUTY_DEFINITIONS` so that **10 Turn**, **Milk and Curd**, and **Prayer Hall** follow `direction: 'forward'`, while **Veg Turn**, **Majjige Turn**, and **Gante** follow `direction: 'reverse'`.
   - Update Prayer Hall pairing logic to advance by 1 student at a time upon completion.
   - Anchor current starting baseline with Tharun & Sheersha (Prayer Hall), Sheersha (Veg), Bhargav (Milk & Curd), Sudarshan (Majjige), Shreyas (10 Turn), and Sheersha (Gante).
2. **Duty Progression & Completion Handling (`src/App.tsx` & Storage)**:
   - Duty assignments stay anchored to the active resident until the Admin clicks **"Mark Done"**.
   - Clicking "Mark Done" advances that specific duty to the next student in line (accounting for home absences and repeat penalties).
   - "Undo Done" button allows reverting an accidental completion.
3. **Admin Controls Verification**:
   - Retain full Admin password protection, home leave skips, $N$-times repeat penalties, and instant "Reset Admin Actions" undo.

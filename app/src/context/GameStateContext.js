import React, { createContext, useContext, useRef, useState } from 'react';
import { CREW } from '../data/crew';
import RHYMES from '../data/rhymes.json';

const MOOD_LEVELS = ['loyal', 'irritated', 'angry', 'furious', 'mutinous'];

export const MOOD_THRESHOLDS = {
  loyal: 0,
  irritated: 3,
  angry: 6,
  furious: 9,
  mutinous: 12,
};

export const MAX_INCIDENTS = 14;

export function getMood(incidents) {
  if (incidents >= 12) return 'mutinous';
  if (incidents >= 9) return 'furious';
  if (incidents >= 6) return 'angry';
  if (incidents >= 3) return 'irritated';
  return 'loyal';
}

export function getMoodIndex(mood) {
  return MOOD_LEVELS.indexOf(mood);
}

export function getPrevLevelStart(incidents) {
  if (incidents <= 3)  return 0;
  if (incidents <= 6)  return 3;
  if (incidents <= 9)  return 6;
  if (incidents <= 12) return 9;
  return 12;
}

// Heists a crew member goes AWOL when first crossing each mood threshold
export const AWOL_HEISTS = {
  irritated: 1,
  angry:     2,
  furious:   3,
  mutinous:  4,
};

// Derive a crew member's current status string.
// 'ready' | 'vacation' | 'laying_low' | 'gone_awol' | 'cover_blown'
export function getCrewStatus(state, levelId) {
  if (state.levelBusts.includes(levelId)) return 'cover_blown';
  if (state.absenceType === 'gone_awol'  && state.absenceHeists > 0) return 'gone_awol';
  if (state.absenceType === 'vacation'   && state.absenceHeists > 0) return 'vacation';
  if (state.absenceType === 'laying_low' && state.absenceHeists > 0) return 'laying_low';
  return 'ready';
}

const initialCrew = CREW.map(m => ({
  id: m.id,
  incidents: 0,
  absenceHeists: 0,
  absenceType: null,   // 'vacation' | 'laying_low' | null
  levelBusts: [],      // level IDs where cover is blown
  loyalty: 0,          // clean heists banked at 0 incidents
  // ── Lifetime stats ──────────────────────────────────────────────────
  heistsParticipated: 0,   // heists where this member was selected
  abilityUses: 0,           // total ability activations
  essentialUses: 0,         // ability used AND heist succeeded
  essentialHeists: [],      // level IDs where ability was used on a successful heist
}));

const GameStateContext = createContext(null);

export function GameStateProvider({ children }) {
  const [crewState, setCrewState] = useState(initialCrew);
  const [completedHeists, setCompletedHeists] = useState({});
  const [totalXp, setTotalXp] = useState(0);

  // Crimes committed per lock difficulty tier (accumulates forever, including failed heists)
  const [criminalRecord, setCriminalRecord] = useState({
    misdemeanor: 0,
    felony: 0,
    'most-wanted': 0,
    'public-enemy': 0,
  });

  // Partial heist progress: how many locks have already had their crimes recorded.
  // { [levelId]: { solvedCount: number } }
  const [partialHeists, setPartialHeists] = useState({});

  // Last crew selection made by the player — persisted across heists
  const [lastCrewSelection, setLastCrewSelection] = useState([]);

  function saveCrewSelection(ids) {
    setLastCrewSelection([...ids]);
  }

  // ── Rhyme assignment ───────────────────────────────────────────────────────
  // Refs only — nothing renders from these values, so no state needed.
  // usedRhymeIds: IDs consumed by completed heists (never reused)
  // heistRhymeAssignments: active assignments for in-progress heists
  const heistRhymeAssignmentsRef = useRef({});
  const usedRhymeIdsRef = useRef(new Set());

  function getOrAssignRhymes(level) {
    // Return existing assignment if one already exists for this heist
    if (heistRhymeAssignmentsRef.current[level.id]) {
      return heistRhymeAssignmentsRef.current[level.id];
    }

    // Build the set of IDs that are off-limits:
    // permanently used + currently assigned to other in-progress heists
    const blocked = new Set(usedRhymeIdsRef.current);
    for (const [id, rhymes] of Object.entries(heistRhymeAssignmentsRef.current)) {
      if (id !== level.id) rhymes.forEach(r => blocked.add(r.id));
    }

    // Pick one random rhyme per lock slot, matching syllables + difficulty.
    // Falls back progressively if the exact pool is empty:
    //   1. Same syllables + difficulty, ignoring blocked
    //   2. Same syllables only (any difficulty), ignoring blocked
    //   3. Any rhyme at all
    const picked = [];
    for (const slot of level.locks) {
      const exactFresh = RHYMES.filter(
        r => r.syllables === slot.syllables &&
             r.difficulty === slot.difficulty &&
             !blocked.has(r.id)
      );
      const exactAll = RHYMES.filter(
        r => r.syllables === slot.syllables && r.difficulty === slot.difficulty
      );
      const sylOnly = RHYMES.filter(r => r.syllables === slot.syllables);
      const anyRhyme = RHYMES;

      const candidates = exactFresh.length > 0 ? exactFresh
                       : exactAll.length   > 0 ? exactAll
                       : sylOnly.length    > 0 ? sylOnly
                       : anyRhyme;

      if (candidates.length === 0) continue; // no rhymes at all — skip lock

      const pick = candidates[Math.floor(Math.random() * candidates.length)];
      picked.push({ ...pick, answer: [pick.word1, pick.word2] });
      blocked.add(pick.id);
    }

    heistRhymeAssignmentsRef.current = {
      ...heistRhymeAssignmentsRef.current,
      [level.id]: picked,
    };
    return picked;
  }

  // Called on failure/abort — clears the assignment so the next attempt gets
  // fresh random rhymes, but does NOT add IDs to usedRhymeIds.
  function clearRhymeAssignment(levelId) {
    const next = { ...heistRhymeAssignmentsRef.current };
    delete next[levelId];
    heistRhymeAssignmentsRef.current = next;
  }

  function markRhymesUsed(levelId) {
    const assigned = heistRhymeAssignmentsRef.current[levelId];
    if (!assigned) return;
    const newUsed = new Set([...usedRhymeIdsRef.current, ...assigned.map(r => r.id)]);
    usedRhymeIdsRef.current = newUsed;
    const next = { ...heistRhymeAssignmentsRef.current };
    delete next[levelId];
    heistRhymeAssignmentsRef.current = next;
  }

  function _buildMember(staticMember, state, levelId) {
    const status = getCrewStatus(state, levelId);
    return {
      ...staticMember,
      incidents: state.incidents,
      mood: getMood(state.incidents),
      absenceHeists: state.absenceHeists,
      absenceType: state.absenceType,
      levelBusts: state.levelBusts,
      loyalty: state.loyalty,
      status,
      ready: status === 'ready',
      available: status === 'ready',  // backward compat alias
      coverBlown: status === 'cover_blown',
      onVacation: status === 'vacation',
      layingLow: status === 'laying_low',
    };
  }

  function getCrewForLevel(levelId) {
    return CREW.map(staticMember => {
      const state = crewState.find(s => s.id === staticMember.id);
      return _buildMember(staticMember, state, levelId);
    });
  }

  function getAllCrew() {
    return CREW.map(staticMember => {
      const state = crewState.find(s => s.id === staticMember.id);
      // For global view, use a dummy levelId that won't match any bust
      return _buildMember(staticMember, state, '__global__');
    });
  }

  // During gameplay: mark a crew member as Cover Blown for this level.
  // abilityUsedIds: prioritize crew who already used their ability.
  // Returns the busted member's id, or null if no candidates.
  function recordCoverBlown(levelId, bustableIds, abilityUsedIds = []) {
    if (bustableIds.length === 0) return null;

    const prioritized = bustableIds.filter(id => abilityUsedIds.includes(id));
    const pool = prioritized.length > 0 ? prioritized : bustableIds;
    const targetId = pool[Math.floor(Math.random() * pool.length)];

    setCrewState(prev =>
      prev.map(m => {
        if (m.id !== targetId) return m;
        return {
          ...m,
          levelBusts: m.levelBusts.includes(levelId)
            ? m.levelBusts
            : [...m.levelBusts, levelId],
          loyalty: 0,
        };
      })
    );

    return targetId;
  }

  // At heist end: set Laying Low (1 heist) for crew who were Cover Blown.
  // Called regardless of heist success or failure.
  function applyLayingLow(crewIds) {
    if (!crewIds || crewIds.length === 0) return;
    setCrewState(prev =>
      prev.map(m => {
        if (!crewIds.includes(m.id)) return m;
        return {
          ...m,
          absenceHeists: 1,
          absenceType: 'laying_low',
        };
      })
    );
  }

  // At heist end (success only): set Vacation (1 heist) for crew who used abilities
  // and were NOT Cover Blown (Cover Blown takes priority → Laying Low instead).
  function applyVacation(crewIds) {
    if (!crewIds || crewIds.length === 0) return;
    setCrewState(prev =>
      prev.map(m => {
        if (!crewIds.includes(m.id)) return m;
        return {
          ...m,
          absenceHeists: 1,
          absenceType: 'vacation',
        };
      })
    );
  }

  // Apply grievance to present (non-cover-blown) crew.
  // amount: number of incidents to add (1 for plain failure, 2 when abilities were used).
  // If a mood threshold is crossed, the crew member goes AWOL for N successful heists.
  function recordGrievance(presentCrewIds, amount = 1) {
    if (!presentCrewIds || presentCrewIds.length === 0) return;
    setCrewState(prev =>
      prev.map(m => {
        if (!presentCrewIds.includes(m.id)) return m;
        const oldMood = getMood(m.incidents);
        const newIncidents = Math.min(m.incidents + amount, MAX_INCIDENTS);
        const newMood = getMood(newIncidents);
        const loyaltyWiped = newIncidents >= MOOD_THRESHOLDS.irritated;
        const crossedThreshold = getMoodIndex(newMood) > getMoodIndex(oldMood);

        // When a threshold is crossed, crew member goes AWOL for N successful heists
        if (crossedThreshold) {
          const awolHeists = AWOL_HEISTS[newMood] ?? 1;
          return {
            ...m,
            incidents: newIncidents,
            loyalty: loyaltyWiped ? 0 : m.loyalty,
            absenceType: 'gone_awol',
            absenceHeists: Math.max(m.absenceHeists, awolHeists),
          };
        }

        return {
          ...m,
          incidents: newIncidents,
          loyalty: loyaltyWiped ? 0 : m.loyalty,
        };
      })
    );
  }

  // Successful heist: improve incidents for present crew.
  // Also ticks down AWOL counters for ALL crew (present or absent) — a win earns goodwill.
  function recordSuccess(presentCrewIds) {
    setCrewState(prev =>
      prev.map(m => {
        const isPresent = presentCrewIds?.includes(m.id);

        // Tick AWOL down for everyone on a success
        let absenceHeists = m.absenceHeists;
        let absenceType = m.absenceType;
        if (absenceType === 'gone_awol' && absenceHeists > 0) {
          absenceHeists = absenceHeists - 1;
          if (absenceHeists === 0) absenceType = null;
        }

        if (!isPresent) {
          return { ...m, absenceHeists, absenceType };
        }

        const newIncidents = getPrevLevelStart(m.incidents);
        const earnLoyalty = newIncidents === 0;
        return {
          ...m,
          incidents: newIncidents,
          loyalty: earnLoyalty ? m.loyalty + 1 : m.loyalty,
          absenceHeists,
          absenceType,
        };
      })
    );
  }

  // Called from HeistBriefingScreen when the player begins a heist.
  // Ticks down vacation and laying_low counters only — AWOL only counts down on success.
  function tickHeist() {
    setCrewState(prev =>
      prev.map(m => {
        if (m.absenceHeists <= 0) return m;
        if (m.absenceType === 'gone_awol') return m; // AWOL only ticks on successful heists
        const newAbsence = m.absenceHeists - 1;
        return {
          ...m,
          absenceHeists: newAbsence,
          absenceType: newAbsence === 0 ? null : m.absenceType,
        };
      })
    );
  }

  // Spend loyalty to clear a crew member's blown cover on a specific level.
  function spendLoyalty(crewId, levelId) {
    setCrewState(prev =>
      prev.map(m => {
        if (m.id !== crewId) return m;
        return {
          ...m,
          loyalty: 0,
          levelBusts: m.levelBusts.filter(id => id !== levelId),
        };
      })
    );
  }

  // Record a single Rhyme Lock crime by difficulty tier.
  // Only call this for locks that haven't been recorded yet (caller is responsible).
  function recordLockCrime(difficulty) {
    setCriminalRecord(prev => ({
      ...prev,
      [difficulty]: (prev[difficulty] ?? 0) + 1,
    }));
  }

  // Save how many locks have had their crimes recorded for a level.
  // Called when a heist ends (whether by failure or completion).
  function updatePartialHeist(levelId, solvedCount) {
    if (solvedCount <= 0) return;
    setPartialHeists(prev => ({
      ...prev,
      [levelId]: { solvedCount },
    }));
  }

  // Record heist participation stats.
  // Call at every heist end (success or failure, including abort).
  // participantIds — all selected crew ids (including those who got cover blown)
  // abilityUsedIds — ids of crew whose ability fired this heist
  // success        — whether the heist succeeded
  // levelId        — id of the heist level
  function recordCrewHeistStats(participantIds, abilityUsedIds, success, levelId) {
    if (!participantIds || participantIds.length === 0) return;
    setCrewState(prev =>
      prev.map(m => {
        const participated = participantIds.includes(m.id);
        const usedAbility  = abilityUsedIds.includes(m.id);
        if (!participated && !usedAbility) return m;
        const isEssential = usedAbility && success;
        return {
          ...m,
          heistsParticipated: participated ? m.heistsParticipated + 1 : m.heistsParticipated,
          abilityUses:        usedAbility  ? m.abilityUses + 1        : m.abilityUses,
          essentialUses:      isEssential  ? m.essentialUses + 1      : m.essentialUses,
          essentialHeists:    isEssential && levelId && !m.essentialHeists.includes(levelId)
                                ? [...m.essentialHeists, levelId]
                                : m.essentialHeists,
        };
      })
    );
  }

  function resetAllState() {
    setCrewState(initialCrew);
    setCompletedHeists({});
    setTotalXp(0);
    setCriminalRecord({ misdemeanor: 0, felony: 0, 'most-wanted': 0, 'public-enemy': 0 });
    setPartialHeists({});
    setLastCrewSelection([]);
    usedRhymeIdsRef.current = new Set();
    heistRhymeAssignmentsRef.current = {};
  }

  function recordHeistCompletion(levelId, xpGained, performance) {
    setCompletedHeists(prev => ({ ...prev, [levelId]: { xpGained, performance } }));
    setTotalXp(prev => prev + xpGained);
    setPartialHeists(prev => {
      const next = { ...prev };
      delete next[levelId];
      return next;
    });
    markRhymesUsed(levelId);
  }

  return (
    <GameStateContext.Provider
      value={{
        crewState,
        completedHeists,
        totalXp,
        criminalRecord,
        partialHeists,
        lastCrewSelection,
        saveCrewSelection,
        getOrAssignRhymes,
        clearRhymeAssignment,
        getCrewForLevel,
        getAllCrew,
        recordCoverBlown,
        applyLayingLow,
        applyVacation,
        recordGrievance,
        recordSuccess,
        tickHeist,
        spendLoyalty,
        recordLockCrime,
        updatePartialHeist,
        recordHeistCompletion,
        recordCrewHeistStats,
        resetAllState,
      }}
    >
      {children}
    </GameStateContext.Provider>
  );
}

export function useGameState() {
  return useContext(GameStateContext);
}

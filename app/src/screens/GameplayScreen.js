import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Animated,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';
import { DIFFICULTY_LABELS, DIFFICULTY_COLORS } from '../data/levels';
import { CREW } from '../data/crew';
import {
  useGameState,
  getMood,
  getMoodIndex,
  getPrevLevelStart,
  MAX_INCIDENTS,
} from '../context/GameStateContext';
import { BASE_XP, calculateXPFromBase, getPerformanceTitle } from '../constants/xp';
import * as Haptics from 'expo-haptics';
import CrewCard from '../components/CrewCard';
import CrewPortrait from '../components/CrewPortrait';
import RhymeLockKeyboard from '../components/RhymeLockKeyboard';
import HeistImage from '../components/HeistImage';
import ThermometerBar from '../components/ThermometerBar';

function getLevelDuration(syllables) {
  if (syllables === 1) return 30;
  if (syllables === 2) return 60;
  if (syllables === 3) return 90;
  return 120;
}

const EGRESS_RIDDLES = [
  { riddle: 'A picture of a hot bread-making device', word1: 'toaster', word2: 'poster' },
  { riddle: 'A rude female monarch', word1: 'mean', word2: 'queen' },
  { riddle: 'A cunning government agent', word1: 'sly', word2: 'spy' },
  { riddle: 'An unhurried male companion', word1: 'mellow', word2: 'fellow' },
  { riddle: 'A slippery deception', word1: 'slick', word2: 'trick' },
  { riddle: 'Amusing currency', word1: 'funny', word2: 'money' },
  { riddle: 'A damp domestic animal', word1: 'wet', word2: 'pet' },
];

function getEgressRiddle(levelId) {
  const hash = [...levelId].reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return EGRESS_RIDDLES[hash % EGRESS_RIDDLES.length];
}

const DEFINITIONS = {
  mean: 'unkind, cruel, or unpleasant in character',
  queen: 'a woman who rules a kingdom',
  toaster: 'a small electrical appliance used to brown slices of bread',
  poster: 'a large printed image or notice displayed publicly',
  wet: 'covered with or saturated by liquid',
  pet: 'a domesticated animal kept for companionship',
  snail: 'a slow-moving mollusk that carries a coiled shell on its back',
  trail: 'a path or track made across terrain, or a mark left behind',
  slick: 'smooth and clever; effortlessly skillful',
  trick: 'a cunning act intended to deceive or outwit',
  funny: 'causing laughter or amusement; strange or peculiar',
  money: 'a current medium of exchange in the form of coins or banknotes',
  sly: 'cunning and secretive in a smooth, understated way',
  spy: 'a person employed to gather secret intelligence on an enemy',
  mellow: 'pleasantly smooth and free from harshness; unhurried',
  fellow: 'a man or boy; an informal companion or associate',
  vacation: 'a period of recreation, especially one spent away from home or work',
  location: 'a particular place or position; a site',
  submarine: 'operating or existing below the surface of the sea',
  magazine: 'a periodical publication containing articles, images, and features',
  topical: 'relating to or dealing with current affairs and events of the moment',
  tropical: 'of or typical of the tropics; hot and humid',
  alligator: 'a large semiaquatic reptile found chiefly in freshwater habitats',
  elevator: 'a platform or enclosed compartment housed in a shaft for raising people between floors',
};

const RECORD_LABELS = {
  misdemeanor: 'Misdemeanors',
  felony: 'Felonies',
  'most-wanted': 'Most Wanted',
  'public-enemy': 'Public Enemy',
};

const MOOD_LABELS = {
  loyal: 'Loyal',
  irritated: 'Irritated',
  angry: 'Angry',
  furious: 'Furious',
  mutinous: 'Mutinous',
};

function MoodBar({ memberId, emoji, name, fromMood, toMood, fromIncidents, toIncidents }) {
  const improving = toIncidents < fromIncidents;
  const moodChangeLabel = fromMood === toMood
    ? MOOD_LABELS[toMood]
    : `${MOOD_LABELS[fromMood]} → ${MOOD_LABELS[toMood]}`;

  return (
    <View style={moodBarStyles.row}>
      <CrewPortrait memberId={memberId} emoji={emoji} size={26} style={moodBarStyles.portrait} />
      <View style={moodBarStyles.body}>
        <View style={moodBarStyles.nameRow}>
          <Text style={moodBarStyles.name}>{name}</Text>
          <Text style={[
            moodBarStyles.moodChange,
            { color: improving ? COLORS.greenSafe : fromMood === toMood ? COLORS.muted : COLORS.redThreat },
          ]}>
            {moodChangeLabel}
          </Text>
        </View>
        <ThermometerBar
          fromIncidents={fromIncidents}
          toIncidents={toIncidents}
          delay={300}
          animDuration={800}
          bgColor={COLORS.cardBg}
          showLabels
        />
      </View>
    </View>
  );
}

const moodBarStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 8,
  },
  portrait: { width: 26, textAlign: 'center' },
  body: { flex: 1, gap: 4 },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    fontFamily: FONTS.label,
    fontSize: 12,
    color: COLORS.cream,
    letterSpacing: 0.5,
  },
  moodChange: {
    fontFamily: FONTS.mono,
    fontSize: 12,
    fontStyle: 'italic',
  },
});

export default function GameplayScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { level, selectedCrewIds = [] } = route.params;
  const {
    getCrewForLevel,
    recordCoverBlown,
    applyLayingLow,
    applyVacation,
    recordGrievance,
    recordSuccess,
    recordHeistCompletion,
    recordCrewHeistStats,
    recordLockCrime,
    updatePartialHeist,
    partialHeists,
    totalXp,
    criminalRecord,
    getOrAssignRhymes,
    clearRhymeAssignment,
  } = useGameState();

  // Assign rhymes for this heist (stable — same rhymes returned on retry)
  const assignedRhymes = getOrAssignRhymes(level);
  // Enrich lock slots with riddle + answer from the random assignment
  const activeLocks = level.locks.map((slot, i) => ({
    ...slot,
    riddle: assignedRhymes[i]?.riddle ?? '',
    answer: assignedRhymes[i]?.answer ?? ['', ''],
  }));

  const criminalRecordAtStartRef = useRef({ ...criminalRecord });
  const xpAtStartRef = useRef(totalXp);

  const totalLocks = activeLocks.length;
  const alreadyCrimeRecorded = useRef(partialHeists[level.id]?.solvedCount ?? 0).current;

  const [currentLockIndex, setCurrentLockIndex] = useState(0);
  // 'playing' | 'advancing' | 'done'
  const [status, setStatus] = useState('playing');
  // Which locks are visually cracked (drives collapsed green state in UI)
  const [crackedLocks, setCrackedLocks] = useState(new Set());

  const currentLock = activeLocks[currentLockIndex];

  const [answer, setAnswer] = useState('');
  const [wrongGuesses, setWrongGuesses] = useState([]);
  const [eliminatedKeys, setEliminatedKeys] = useState(new Set());
  const [highlightedKeys, setHighlightedKeys] = useState(new Set());

  const [hints, setHints] = useState([]);
  const [hintsCount, setHintsCount] = useState(0);
  const [coverBlowns, setCoverBlowns] = useState([]);
  const [abilitiesUsed, setAbilitiesUsed] = useState([]);
  const [coverBlownIds, setCoverBlownIds] = useState(new Set());
  const [abilityUsedIds, setAbilityUsedIds] = useState(new Set());
  const [paused, setPaused] = useState(false);

  const totalWrongRef = useRef(0);
  const locksSolvedNewRef = useRef(0);
  const answerRef = useRef(null);
  const guessScaleAnim = useRef(new Animated.Value(1)).current;
  const pendingResultRef = useRef(null);

  // 0 = hidden, 1–4 = which result step is shown
  const [resultStep, setResultStep] = useState(0);

  // Step 2 animation state
  const [displayXp, setDisplayXp] = useState(0);
  const [displayRecord, setDisplayRecord] = useState({
    misdemeanor: 0,
    felony: 0,
    'most-wanted': 0,
    'public-enemy': 0,
  });
  const lockResultsRef = useRef(
    activeLocks.map((lock, i) => ({ lockIndex: i, lock, cracked: false }))
  );

  const [timeLeft, setTimeLeft] = useState(getLevelDuration(currentLock.syllables));
  const timerOpacity = useRef(new Animated.Value(1)).current;
  const handlerPulseAnim = useRef(new Animated.Value(1)).current;
  const handlerPulseLoopRef = useRef(null);
  // Frozen snapshot shown when handler absent — updates only at quarter-minute marks and ≤3s
  const [frozenTime, setFrozenTime] = useState(getLevelDuration(currentLock.syllables));
  const [distractionActive, setDistractionActive] = useState(false);
  const [distractionTimeLeft, setDistractionTimeLeft] = useState(0);
  const [distractionModal, setDistractionModal] = useState(null); // { message, extraSeconds, countdown }
  const distractionModalRef = useRef(null);

  // Egress riddle phase — appears after all locks solved when Courier is absent
  const [egressPhase, setEgressPhase] = useState(false);
  const [egressIntroVisible, setEgressIntroVisible] = useState(false);
  const [egressTimeLeft, setEgressTimeLeft] = useState(15);
  const [egressAnswer, setEgressAnswer] = useState('');
  const egressRiddleRef = useRef(null);

  const isDone = status === 'done';
  const isAdvancing = status === 'advancing';

  const maxGuesses = 2 * totalLocks + selectedCrewIds.length;
  const crew = getCrewForLevel(level.id);

  const presentCrew = crew.filter(
    m => selectedCrewIds.includes(m.id) && !coverBlownIds.has(m.id)
  );
  const presentCrewIds = presentCrew.map(m => m.id);

  const handler = crew.find(m => m.id === 'handler');
  const handlerPresent = selectedCrewIds.includes('handler') && !coverBlownIds.has('handler');
  const handlerAvailable = handlerPresent && (handler?.status === 'ready' || handler?.ready);

  const courierPresent = selectedCrewIds.includes('courier') && !coverBlownIds.has('courier');

  // ── Timer ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isDone || isAdvancing || paused || distractionActive || distractionModal || egressPhase) return;
    if (timeLeft <= 0) { handleFailure('timer'); return; }
    const interval = setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => clearInterval(interval);
  }, [isDone, isAdvancing, paused, distractionActive, distractionModal, egressPhase, timeLeft]);

  // ── Distraction countdown ─────────────────────────────────────────────────
  useEffect(() => {
    if (!distractionActive) return;
    if (distractionTimeLeft <= 0) {
      setDistractionActive(false);
      return;
    }
    const interval = setInterval(() => setDistractionTimeLeft(t => t - 1), 1000);
    return () => clearInterval(interval);
  }, [distractionActive, distractionTimeLeft]);

  // ── Distraction modal auto-dismiss countdown ──────────────────────────────
  useEffect(() => {
    if (!distractionModal) return;
    if (distractionModal.countdown <= 0) {
      const extra = distractionModal.extraSeconds;
      setDistractionModal(null);
      setDistractionActive(true);
      setDistractionTimeLeft(extra);
      return;
    }
    const t = setTimeout(() => {
      setDistractionModal(m => m ? { ...m, countdown: m.countdown - 1 } : null);
    }, 1000);
    return () => clearTimeout(t);
  }, [distractionModal]);

  // ── Egress countdown ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!egressPhase || egressIntroVisible || isDone) return;
    if (egressTimeLeft <= 0) {
      handleFailure('egress');
      return;
    }
    const interval = setInterval(() => setEgressTimeLeft(t => t - 1), 1000);
    return () => clearInterval(interval);
  }, [egressPhase, egressIntroVisible, egressTimeLeft, isDone]);

  // Rhythmic light pulses when timer is running low (≤10s) and handler is present
  useEffect(() => {
    if (isDone || isAdvancing || paused || !handlerAvailable) return;
    if (timeLeft > 10 || timeLeft <= 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [timeLeft]);

  // ── Timer display when Handler absent — frozen snapshot + pulse ──────────
  useEffect(() => {
    if (handlerAvailable) {
      // Handler present — stop pulsing, show full opacity
      if (handlerPulseLoopRef.current) { handlerPulseLoopRef.current.stop(); handlerPulseLoopRef.current = null; }
      handlerPulseAnim.setValue(1);
      return;
    }

    // Handler absent — update frozen snapshot at quarter-minute marks and final 3s
    const isFinalCountdown = timeLeft <= 3 && timeLeft > 0;
    const isSnapMoment =
      timeLeft % 60 === 45 ||
      timeLeft % 60 === 30 ||
      timeLeft % 60 === 15 ||
      (timeLeft % 60 === 0 && timeLeft > 0) ||
      isFinalCountdown;

    if (isSnapMoment) {
      setFrozenTime(timeLeft);
    }

    // Start pulse loop if not already running
    if (!handlerPulseLoopRef.current) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(handlerPulseAnim, { toValue: 0.25, duration: 800, useNativeDriver: true }),
          Animated.timing(handlerPulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      );
      loop.start();
      handlerPulseLoopRef.current = loop;
    }
  }, [handlerAvailable, timeLeft]);

  // ── Auto-focus answer field ────────────────────────────────────────────────
  useEffect(() => {
    if (status !== 'playing' || isDone) return;
    const t = setTimeout(() => answerRef.current?.focus(), 150);
    return () => clearTimeout(t);
  }, [currentLockIndex, status]);

  // ── Guess badge pulse ──────────────────────────────────────────────────────
  useEffect(() => {
    if (wrongGuesses.length === 0) return;
    Animated.sequence([
      Animated.spring(guessScaleAnim, { toValue: 1.18, useNativeDriver: true, speed: 40, bounciness: 10 }),
      Animated.spring(guessScaleAnim, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 4 }),
    ]).start();
  }, [wrongGuesses.length]);

  // ── Grievance helpers ──────────────────────────────────────────────────────
  const buildGrievanceChanges = (presentIds, amount) =>
    presentIds.map(id => {
      const member = crew.find(m => m.id === id);
      const fromMood = getMood(member.incidents);
      const toIncidents = Math.min(member.incidents + amount, MAX_INCIDENTS);
      const toMood = getMood(toIncidents);
      return { id, name: member.name, emoji: member.emoji, fromMood, toMood, fromIncidents: member.incidents, toIncidents };
    });

  const buildMoodImprovements = (presentIds) =>
    presentIds.map(id => {
      const member = crew.find(m => m.id === id);
      const fromMood = getMood(member.incidents);
      const toIncidents = getPrevLevelStart(member.incidents);
      const toMood = getMood(toIncidents);
      return { id, name: member.name, emoji: member.emoji, fromMood, toMood, fromIncidents: member.incidents, toIncidents };
    });

  // ── Failure ────────────────────────────────────────────────────────────────
  const handleFailure = (reason, finalWrongGuesses) => {
    if (isDone || isAdvancing) return;
    setStatus('done');

    const finalPresentIds = selectedCrewIds.filter(id => !coverBlownIds.has(id));
    const abilityUsedPresentIds = finalPresentIds.filter(id => abilityUsedIds.has(id));
    const regularPresentIds = finalPresentIds.filter(id => !abilityUsedIds.has(id));

    const grievanceChanges = [
      ...buildGrievanceChanges(abilityUsedPresentIds, 2),
      ...buildGrievanceChanges(regularPresentIds, 1),
    ];

    if (abilityUsedPresentIds.length > 0) recordGrievance(abilityUsedPresentIds, 2);
    if (regularPresentIds.length > 0) recordGrievance(regularPresentIds, 1);
    applyLayingLow([...coverBlownIds]);
    recordCrewHeistStats(selectedCrewIds, [...abilityUsedIds], false, level.id);

    const totalCrimed = alreadyCrimeRecorded + locksSolvedNewRef.current;
    updatePartialHeist(level.id, totalCrimed);

    // Compute criminal record after — failure means only already-cracked locks count
    const criminalRecordBefore = { ...criminalRecordAtStartRef.current };
    const criminalRecordAfter = { ...criminalRecordBefore };
    lockResultsRef.current.forEach((r, i) => {
      if (r.cracked && i >= alreadyCrimeRecorded) {
        const diff = r.lock?.difficulty ?? activeLocks[i]?.difficulty;
        if (diff) criminalRecordAfter[diff] = (criminalRecordAfter[diff] ?? 0) + 1;
      }
    });

    const resultParams = {
      level,
      result: {
        status: 'failed',
        failureReason: reason,
        wrongGuesses: finalWrongGuesses ?? wrongGuesses,
        coverBlowns,
        abilitiesUsed,
        grievanceChanges,
        moodImprovements: [],
        xpGained: 0,
        performance: null,
        abilitiesUsedOnFailure: abilityUsedIds.size > 0,
        lockResults: lockResultsRef.current,
        totalLocks,
        locksAlreadyCounted: alreadyCrimeRecorded,
        xpBefore: xpAtStartRef.current,
        criminalRecordBefore,
        criminalRecordAfter,
      },
    };

    clearRhymeAssignment(level.id);
    pendingResultRef.current = resultParams;
    setResultStep(1);
  };

  const handleAbort = () => {
    Alert.alert(
      'ABORT HEIST?',
      'The crew will not be happy about this.',
      [
        { text: 'Keep trying', style: 'cancel' },
        { text: 'Abort', style: 'destructive', onPress: () => handleFailure('abort') },
      ]
    );
  };

  // ── Lock solved ────────────────────────────────────────────────────────────
  const handleLockSolved = () => {
    // Single medium impact — clean, like a lock clicking open
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Mark cracked in UI state (triggers green collapsed card immediately)
    setCrackedLocks(prev => new Set([...prev, currentLockIndex]));

    // Update result ref for result screen
    lockResultsRef.current = lockResultsRef.current.map((r, i) =>
      i === currentLockIndex ? { ...r, cracked: true } : r
    );

    // Record crime if new
    if (currentLockIndex >= alreadyCrimeRecorded) {
      recordLockCrime(currentLock.difficulty);
      locksSolvedNewRef.current += 1;
    }

    const nextIndex = currentLockIndex + 1;
    const attemptsUsed = totalWrongRef.current + locksSolvedNewRef.current;

    if (nextIndex >= totalLocks) {
      if (courierPresent) {
        handleHeistSuccess();
      } else {
        // No Courier — player must crack the exit lock themselves
        const riddle = getEgressRiddle(level.id);
        const revealedIndex = Math.round(Math.random()); // 0 or 1
        egressRiddleRef.current = {
          riddle: riddle.riddle,
          word1: riddle.word1,
          word2: riddle.word2,
          revealedIndex,
          revealedWord: revealedIndex === 0 ? riddle.word1 : riddle.word2,
          answerWord: revealedIndex === 0 ? riddle.word2 : riddle.word1,
        };
        setEgressPhase(true);
        setEgressIntroVisible(true);
        setEgressTimeLeft(15);
        setEgressAnswer('');
        setEliminatedKeys(new Set());
        setHighlightedKeys(new Set());
      }
    } else if (maxGuesses - attemptsUsed <= 0) {
      // Correct guess used the last remaining guess — can't attempt next lock
      handleFailure('guesses');
    } else {
      // Brief pause then advance — UI stays fully visible throughout
      setStatus('advancing');
      setAnswer('');
      setTimeout(() => {
        setCurrentLockIndex(nextIndex);
        setTimeLeft(getLevelDuration(activeLocks[nextIndex].syllables) + timeLeft);
        setEliminatedKeys(new Set());
        setHighlightedKeys(new Set());
        setStatus('playing');
      }, 500);
    }
  };

  // ── Success ────────────────────────────────────────────────────────────────
  const handleHeistSuccess = () => {
    setStatus('done');

    const finalPresentIds = selectedCrewIds.filter(id => !coverBlownIds.has(id));
    const moodImprovements = buildMoodImprovements(finalPresentIds);
    const totalBaseXP = activeLocks.reduce((sum, lock) => sum + (BASE_XP[lock.difficulty] ?? 10), 0);
    const xpGained = calculateXPFromBase(totalBaseXP, totalWrongRef.current, hintsCount);
    const performance = getPerformanceTitle(totalWrongRef.current, hintsCount, coverBlowns.length > 0);

    if (performance === 'Ghost') {
      // Triple light tap — rare and special
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light), 130);
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light), 260);
    } else {
      // Double light tap — celebratory, like a safe swinging open
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light), 150);
    }

    const vacationIds = [...abilityUsedIds].filter(id => !coverBlownIds.has(id));
    const layingLowIds = [...coverBlownIds];

    const awolBefore = crew
      .filter(m => m.status === 'gone_awol' && m.absenceHeists > 0)
      .map(m => ({ id: m.id, name: m.name, emoji: m.emoji, before: m.absenceHeists }));

    applyVacation(vacationIds);
    applyLayingLow(layingLowIds);
    recordSuccess(finalPresentIds);
    recordHeistCompletion(level.id, xpGained, performance);
    recordCrewHeistStats(selectedCrewIds, [...abilityUsedIds], true, level.id);

    const awolUpdates = awolBefore.map(m => ({ id: m.id, name: m.name, emoji: m.emoji, after: m.before - 1 }));

    // Compute criminal record after — add newly cracked locks to baseline
    const criminalRecordBefore = { ...criminalRecordAtStartRef.current };
    const criminalRecordAfter = { ...criminalRecordBefore };
    lockResultsRef.current.forEach((r, i) => {
      if (r.cracked && i >= alreadyCrimeRecorded) {
        const diff = r.lock?.difficulty ?? activeLocks[i]?.difficulty;
        if (diff) criminalRecordAfter[diff] = (criminalRecordAfter[diff] ?? 0) + 1;
      }
    });

    pendingResultRef.current = {
      level,
      result: {
        status: 'success',
        failureReason: null,
        wrongGuesses,
        coverBlowns,
        abilitiesUsed,
        vacations: vacationIds.map(id => {
          const m = CREW.find(c => c.id === id);
          return { id, name: m.name, emoji: m.emoji };
        }),
        awolUpdates,
        grievanceChanges: [],
        moodImprovements,
        xpGained,
        performance,
        abilitiesUsedOnFailure: false,
        lockResults: lockResultsRef.current,
        totalLocks,
        locksAlreadyCounted: alreadyCrimeRecorded,
        xpBefore: xpAtStartRef.current,
        criminalRecordBefore,
        criminalRecordAfter,
      },
    };
    setResultStep(1);
  };

  // ── Crack It ───────────────────────────────────────────────────────────────
  const handleCrackIt = () => {
    const trimmed = answer.trim();
    const spaceIdx = trimmed.indexOf(' ');
    if (spaceIdx === -1) return;
    const w1 = trimmed.slice(0, spaceIdx).toLowerCase();
    const w2 = trimmed.slice(spaceIdx + 1).trim().toLowerCase();
    if (!w1 || !w2) return;

    if (w1 === currentLock.answer[0] && w2 === currentLock.answer[1]) {
      handleLockSolved();
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    totalWrongRef.current += 1;
    const entry = { guess: trimmed, lockIndex: currentLockIndex };
    setWrongGuesses(prev => {
      const next = [...prev, entry];

      const bustable = presentCrewIds.filter(id => id !== 'handler' && id !== 'courier');
      if (bustable.length > 0) {
        const targetId = recordCoverBlown(level.id, bustable, [...abilityUsedIds]);
        const target = CREW.find(m => m.id === targetId);
        if (target) {
          setCoverBlowns(prev2 => [...prev2, { id: targetId, name: target.name, emoji: target.emoji }]);
          setCoverBlownIds(prev2 => new Set([...prev2, targetId]));
          setHints(prev2 => [...prev2, { memberId: targetId, source: target.emoji, text: target.bustMessage }]);
        }
      }

      if (next.length + locksSolvedNewRef.current >= maxGuesses) {
        setTimeout(() => handleFailure('guesses', next), 0);
      }

      return next;
    });

    setAnswer('');
    setTimeout(() => answerRef.current?.focus(), 50);
  };

  // ── Egress submit ─────────────────────────────────────────────────────────
  const handleEgressSubmit = () => {
    if (!egressRiddleRef.current || isDone) return;
    const trimmed = egressAnswer.trim().toLowerCase();
    if (trimmed === egressRiddleRef.current.answerWord) {
      setEgressPhase(false);
      handleHeistSuccess();
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      setEgressAnswer('');
    }
  };

  // ── Crew ability ───────────────────────────────────────────────────────────
  const handleCrewAbility = (member) => {
    if (!selectedCrewIds.includes(member.id)) return;
    if (coverBlownIds.has(member.id)) return;
    if (member.status !== 'ready') return;
    if (member.id === 'handler' || member.id === 'courier') return;
    if (abilityUsedIds.has(member.id)) return;

    let message = '';
    switch (member.id) {
      case 'fingers': {
        const [a1, a2] = currentLock.answer;
        const l1 = a1[0].toUpperCase();
        const l2 = a2[0].toUpperCase();
        setHighlightedKeys(new Set([l1, l2]));
        message = `Got what I needed. Your two starting letters are marked.`;
        break;
      }
      case 'linguist': {
        const wordIndex = Math.random() < 0.5 ? 0 : 1;
        const word = currentLock.answer[wordIndex];
        const def = DEFINITIONS[word] ?? 'a word in the English language. Draw your own conclusions.';
        message = `Partial decrypt secured. One word: ${def} — I'm billing for this.`;
        break;
      }
      case 'rico': {
        const answerLetters = new Set(
          [...currentLock.answer[0], ...currentLock.answer[1]].map(c => c.toUpperCase())
        );
        const candidates = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').filter(l => !answerLetters.has(l));
        // Seeded-ish shuffle — good enough for this, not cryptographic
        for (let i = candidates.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
        }
        const elim = candidates.slice(0, 3);
        setEliminatedKeys(new Set(elim));
        message = `Spoke to the guy who services these locks. Says they never use ${elim.join(', ')} in this building's system.`;
        break;
      }
      case 'distractor': {
        const distractionMessages = [
          "Fire alarm. Fourth floor. Every guard in the building is moving that way.",
          "She walked up to the front desk and asked to speak to a manager. About everything. Guards are occupied.",
          "Someone just started crying very loudly in the lobby. It's her. She's fine.",
          "A very suspicious package has been reported at the service entrance. She dropped it there herself.",
          "The security team is dealing with a woman who says she's a health inspector. She is not.",
          "She pulled the sprinklers. Building's in chaos. Don't ask how she got into the plant room.",
          "Three guards just ran to the east stairwell. Something about a domestic disturbance. It's her.",
          "She told the receptionist she was there for a casting call. There is no casting call.",
          "Someone just drove a moped through the revolving door. Deliberately.",
          "She's arguing with security about a parking ticket that doesn't exist.",
          "A birthday flash mob has broken out in the atrium. She organised it this morning. Nobody knows why.",
        ];
        const extraSeconds = Math.floor(Math.random() * 11) + 15; // 15–25
        message = distractionMessages[Math.floor(Math.random() * distractionMessages.length)];
        setDistractionModal({ message, extraSeconds, countdown: 5 });
        break;
      }
    }

    if (message) setHints(prev => [...prev, { memberId: member.id, source: member.emoji, text: message }]);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAbilityUsedIds(prev => new Set([...prev, member.id]));
    setAbilitiesUsed(prev => [...prev, { name: member.name, emoji: member.emoji }]);
    setHintsCount(prev => prev + 1);
  };

  // ── Custom keyboard ────────────────────────────────────────────────────────
  const handleKeyPress = (key) => {
    if (isDone || isAdvancing) return;
    if (egressPhase) {
      // Egress riddle — single word only, no spaces
      if (key === 'BACKSPACE') {
        setEgressAnswer(a => a.slice(0, -1));
      } else if (key === 'ENTER') {
        handleEgressSubmit();
      } else if (key !== 'SPACE') {
        setEgressAnswer(a => a + key.toLowerCase());
      }
      return;
    }
    if (key === 'BACKSPACE') {
      setAnswer(a => a.slice(0, -1));
    } else if (key === 'SPACE') {
      // Only one space allowed — separates adjective from noun
      setAnswer(a => (a.length === 0 || a.includes(' ') ? a : a + ' '));
    } else if (key === 'ENTER') {
      handleCrackIt();
    } else {
      setAnswer(a => a + key.toLowerCase());
    }
  };

  // ── Step 2 XP + record animation ──────────────────────────────────────────
  useEffect(() => {
    if (resultStep !== 2 || !pendingResultRef.current) return;
    const { xpBefore, criminalRecordBefore, criminalRecordAfter, xpGained } = pendingResultRef.current.result;
    const xpAfter = (xpBefore ?? 0) + (xpGained ?? 0);

    setDisplayXp(xpBefore ?? 0);
    setDisplayRecord({ ...criminalRecordBefore });

    const duration = 1000;
    const tickMs = 40;
    const totalTicks = duration / tickMs;
    let tick = 0;
    const timer = setInterval(() => {
      tick++;
      const t = Math.min(tick / totalTicks, 1);
      setDisplayXp(Math.round((xpBefore ?? 0) + (xpAfter - (xpBefore ?? 0)) * t));
      setDisplayRecord({
        misdemeanor: Math.round((criminalRecordBefore?.misdemeanor ?? 0) + ((criminalRecordAfter?.misdemeanor ?? 0) - (criminalRecordBefore?.misdemeanor ?? 0)) * t),
        felony: Math.round((criminalRecordBefore?.felony ?? 0) + ((criminalRecordAfter?.felony ?? 0) - (criminalRecordBefore?.felony ?? 0)) * t),
        'most-wanted': Math.round((criminalRecordBefore?.['most-wanted'] ?? 0) + ((criminalRecordAfter?.['most-wanted'] ?? 0) - (criminalRecordBefore?.['most-wanted'] ?? 0)) * t),
        'public-enemy': Math.round((criminalRecordBefore?.['public-enemy'] ?? 0) + ((criminalRecordAfter?.['public-enemy'] ?? 0) - (criminalRecordBefore?.['public-enemy'] ?? 0)) * t),
      });
      if (tick >= totalTicks) clearInterval(timer);
    }, tickMs);
    return () => clearInterval(timer);
  }, [resultStep]);

  // ── Result step navigation helpers ────────────────────────────────────────
  const hasDebrief = (result) => {
    if (!result) return false;
    const { wrongGuesses: wg = [], coverBlowns: cb = [], vacations: vac = [], awolUpdates: awol = [] } = result;
    return wg.length > 0 || cb.length > 0 || vac.length > 0 || awol.length > 0;
  };

  const handleStep1Ok = () => {
    const result = pendingResultRef.current?.result;
    if (result?.status === 'success') {
      setResultStep(2);
    } else {
      setResultStep(hasDebrief(result) ? 3 : 4);
    }
  };
  const handleStep2Ok = () => {
    const result = pendingResultRef.current?.result;
    setResultStep(hasDebrief(result) ? 3 : 4);
  };
  const handleStep3Ok = () => setResultStep(4);

  // ── Derived values ─────────────────────────────────────────────────────────
  const totalDuration = getLevelDuration(currentLock.syllables);
  const threatLevel = Math.min(wrongGuesses.length / maxGuesses, 1);
  const pctLeft = timeLeft / totalDuration;
  const timerColor = pctLeft < 0.33 ? COLORS.redThreat : pctLeft < 0.6 ? COLORS.gold : COLORS.greenSafe;
  const formatTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  const answerTrimmed = answer.trim();
  const answerSpaceIdx = answerTrimmed.indexOf(' ');
  const canSubmit = answerSpaceIdx > 0 && answerTrimmed.slice(answerSpaceIdx + 1).trim().length > 0 && !isDone && !isAdvancing;
  const guessesLeft = maxGuesses - wrongGuesses.length - locksSolvedNewRef.current;
  const remainingLocks = totalLocks - crackedLocks.size;
  const guessBadgeColor =
    guessesLeft <= remainingLocks * 2
      ? COLORS.redThreat
      : guessesLeft <= remainingLocks * 2 + 2
        ? COLORS.gold
        : COLORS.greenSafe;

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={{ flex: 1 }}>

        {/* ── Top bar — always visible ── */}
        <View style={styles.topBar}>
          <View style={styles.heistInfo}>
            <Text style={styles.heistCity}>{level.city}</Text>
            <Text style={styles.heistLocation}>{level.location}</Text>
          </View>
          <View style={styles.topBarActions}>
            <TouchableOpacity
              style={styles.devUnlockButton}
              onPress={handleLockSolved}
              disabled={isDone || isAdvancing}
            >
              <Text style={styles.devUnlockButtonText}>🔓 UNLOCK</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.pauseButton, paused && styles.pauseButtonActive]}
              onPress={() => setPaused(p => !p)}
            >
              <Text style={[styles.pauseButtonText, paused && styles.pauseButtonTextActive]}>
                {paused ? '▶  RESUME' : '⏸  PAUSE'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.abortButton} onPress={handleAbort}>
              <Text style={styles.abortButtonText}>ABORT</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Timer strip — always visible ── */}
        <Animated.View style={[
          styles.timerStrip,
          { borderBottomColor: timerColor + '55' },
          !handlerAvailable && { opacity: handlerPulseAnim },
        ]}>
          <Text style={styles.timerLabel}>TIME</Text>
          <Text
            style={[styles.timerTime, { color: distractionActive ? COLORS.muted : timerColor }]}
            numberOfLines={1}
          >
            {handlerAvailable ? formatTime(timeLeft) : formatTime(frozenTime)}
          </Text>
          <View style={styles.timerTrack}>
            <View style={[styles.timerFill, { width: `${pctLeft * 100}%`, backgroundColor: distractionActive ? COLORS.muted : timerColor }]} />
          </View>
          {distractionActive ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <CrewPortrait memberId="distractor" emoji="💃" size={20} />
              <Text style={[styles.timerTime, { color: '#4FC3F7', width: 'auto', minWidth: 28 }]} numberOfLines={1}>{distractionTimeLeft}s</Text>
            </View>
          ) : null}
        </Animated.View>

        {/* ── Scrollable content ── */}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── All locks ── */}
          {activeLocks.map((lock, i) => {
            const isSolved = crackedLocks.has(i);
            const isActive = i === currentLockIndex && !isSolved;
            const lockColor = isSolved
              ? COLORS.greenSafe
              : isActive
                ? DIFFICULTY_COLORS[lock.difficulty]
                : COLORS.border;
            const labelColor = isSolved
              ? COLORS.greenSafe
              : isActive
                ? DIFFICULTY_COLORS[lock.difficulty]
                : COLORS.muted;

            return (
              <View
                key={i}
                style={[
                  styles.lockCard,
                  { borderColor: lockColor },
                  isSolved && styles.lockCardSolved,
                ]}
              >
                {/* Lock header — always visible */}
                <View style={styles.lockCardHeader}>
                  <View style={[styles.lockNumBadge, { borderColor: lockColor }]}>
                    <Text style={[styles.lockNumText, { color: labelColor }]}>
                      {isSolved ? '✓' : i + 1}
                    </Text>
                  </View>
                  <View style={styles.lockCardTitleBlock}>
                    <Text style={[styles.lockCardTitle, { color: labelColor }]}>
                      LOCK {i + 1} — {DIFFICULTY_LABELS[lock.difficulty]}
                    </Text>
                    {isSolved && (
                      <Text style={styles.lockCardAnswer}>
                        {lock.answer[0].toUpperCase()} · {lock.answer[1].toUpperCase()}
                      </Text>
                    )}
                  </View>
                  {isSolved && <Text style={styles.lockCrackedIcon}>🔓</Text>}
                </View>

                {/* Expanded body — active lock only */}
                {isActive && (
                  <View style={styles.lockCardBody}>
                    <Text style={styles.riddle}>{lock.riddle}</Text>
                    <View style={styles.syllableRow}>
                      {Array.from({ length: lock.syllables }).map((_, j) => (
                        <View key={j} style={styles.syllableDot} />
                      ))}
                      <Text style={styles.syllableLabel}>
                        {lock.syllables === 1 ? '1 SYLLABLE EACH' : `${lock.syllables} SYLLABLES EACH`}
                      </Text>
                      <Animated.View style={[styles.guessBadge, { borderColor: guessBadgeColor, backgroundColor: guessBadgeColor + '18', transform: [{ scale: guessScaleAnim }] }]}>
                        <Text style={[styles.guessBadgeNumber, { color: guessBadgeColor }]}>{guessesLeft}</Text>
                        <Text style={[styles.guessBadgeLabel, { color: guessBadgeColor }]}>GUESSES</Text>
                      </Animated.View>
                    </View>

                    <TextInput
                      ref={answerRef}
                      style={styles.input}
                      placeholder="adjective  noun"
                      placeholderTextColor={COLORS.muted}
                      value={answer}
                      onChangeText={setAnswer}
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!isDone && !isAdvancing}
                      showSoftInputOnFocus={false}
                      caretHidden={false}
                    />

                    <TouchableOpacity
                      style={[styles.crackButton, !canSubmit && styles.crackButtonDisabled]}
                      onPress={handleCrackIt}
                      disabled={!canSubmit}
                    >
                      <Text style={styles.crackButtonText}>CRACK IT</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })}

          {/* ── Egress riddle ── */}
          {egressPhase && !egressIntroVisible && egressRiddleRef.current && (
            <View style={[styles.lockCard, styles.egressCard]}>
              <View style={styles.lockCardHeader}>
                <View style={[styles.lockNumBadge, { borderColor: COLORS.gold }]}>
                  <Text style={[styles.lockNumText, { color: COLORS.gold }]}>🚪</Text>
                </View>
                <View style={styles.lockCardTitleBlock}>
                  <Text style={[styles.lockCardTitle, { color: COLORS.gold }]}>EXIT LOCK</Text>
                  <Text style={styles.heistLocation}>The Courier isn't here. You crack it yourself.</Text>
                </View>
                <Text style={[styles.timerTime, {
                  color: egressTimeLeft <= 5 ? COLORS.redThreat : COLORS.gold,
                  width: 'auto',
                  fontSize: 18,
                }]}>
                  {egressTimeLeft}s
                </Text>
              </View>
              <View style={styles.lockCardBody}>
                <Text style={styles.riddle}>{egressRiddleRef.current.riddle}</Text>
                <View style={styles.egressWordRow}>
                  {egressRiddleRef.current.revealedIndex === 0 ? (
                    <>
                      <View style={styles.egressRevealedPill}>
                        <Text style={styles.egressRevealedText}>
                          {egressRiddleRef.current.revealedWord.toUpperCase()}
                        </Text>
                      </View>
                      <Text style={styles.egressSeparator}>+</Text>
                      <View style={styles.egressAnswerPill}>
                        <Text style={[styles.egressAnswerText, !egressAnswer && styles.egressPlaceholder]}>
                          {egressAnswer.toUpperCase() || '?'}
                        </Text>
                      </View>
                    </>
                  ) : (
                    <>
                      <View style={styles.egressAnswerPill}>
                        <Text style={[styles.egressAnswerText, !egressAnswer && styles.egressPlaceholder]}>
                          {egressAnswer.toUpperCase() || '?'}
                        </Text>
                      </View>
                      <Text style={styles.egressSeparator}>+</Text>
                      <View style={styles.egressRevealedPill}>
                        <Text style={styles.egressRevealedText}>
                          {egressRiddleRef.current.revealedWord.toUpperCase()}
                        </Text>
                      </View>
                    </>
                  )}
                </View>
                <TouchableOpacity
                  style={[styles.crackButton, !egressAnswer.trim() && styles.crackButtonDisabled]}
                  onPress={handleEgressSubmit}
                  disabled={!egressAnswer.trim() || isDone}
                >
                  <Text style={styles.crackButtonText}>ESCAPE</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ── Wrong guesses ── */}
          {wrongGuesses.length > 0 && (
            <View style={styles.wrongGuessSection}>
              <Text style={styles.wrongGuessLabel}>PREVIOUS ATTEMPTS</Text>
              <View style={styles.wrongGuessList}>
                {wrongGuesses.map((g, i) => (
                  <View key={i} style={styles.wrongGuessPill}>
                    <Text style={styles.wrongGuessText}>{g.guess.toUpperCase()}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* ── Intel ── */}
          {hints.length > 0 && (
            <View style={styles.hintsSection}>
              <Text style={styles.hintsLabel}>INTEL</Text>
              {hints.map((h, i) => (
                <View key={i} style={styles.hintRow}>
                  <CrewPortrait memberId={h.memberId} emoji={h.source} size={22} />
                  <Text style={styles.hintText}>{h.text}</Text>
                </View>
              ))}
            </View>
          )}

        </ScrollView>

        {/* ── Crew strip — fixed, always visible above keyboard ── */}
        {selectedCrewIds.length > 0 && (
          <View style={styles.crewStrip}>
            {crew
              .filter(m => selectedCrewIds.includes(m.id))
              .map(member => {
                const isBlownThisSession = coverBlownIds.has(member.id);
                const isExpended = abilityUsedIds.has(member.id);
                const displayStatus = isBlownThisSession ? 'cover_blown'
                  : isExpended ? 'expended'
                  : member.status;
                return (
                  <CrewCard
                    key={member.id}
                    member={{ ...member, status: displayStatus }}
                    onUse={handleCrewAbility}
                    coverBlownThisHeist={isBlownThisSession}
                    hideStats
                  />
                );
              })}
          </View>
        )}

        {/* ── Custom keyboard — always visible, replaces system keyboard ── */}
        {!isDone && (
          <RhymeLockKeyboard
            onKeyPress={handleKeyPress}
            eliminatedKeys={eliminatedKeys}
            highlightedKeys={highlightedKeys}
            disabled={isAdvancing}
          />
        )}

      </View>

      {/* ── Distraction modal ── */}
      <Modal visible={!!distractionModal} transparent animationType="fade">
        <View style={styles.outcomeOverlay}>
          <View style={styles.outcomeCard}>
            <CrewPortrait memberId="distractor" emoji="💃" size={56} style={styles.distractionModalPortrait} />
            <Text style={[styles.outcomeTitle, { color: '#4FC3F7', marginBottom: 12 }]}>DISTRACTION</Text>
            <Text style={styles.distractionModalMessage}>{distractionModal?.message}</Text>
            <Text style={styles.distractionModalExtra}>+{distractionModal?.extraSeconds}s on the clock.</Text>
            <Text style={styles.distractionModalCountdown}>
              Resuming in {distractionModal?.countdown}…
            </Text>
          </View>
        </View>
      </Modal>

      {/* ── Egress intro modal ── */}
      <Modal visible={egressIntroVisible} transparent animationType="fade">
        <View style={styles.outcomeOverlay}>
          <View style={styles.outcomeCard}>
            <View style={styles.egressIntroPortrait}>
              <Text style={styles.egressIntroEmoji}>📦</Text>
            </View>
            <Text style={[styles.outcomeTitle, { color: COLORS.muted, marginBottom: 12 }]}>
              EXIT LOCK
            </Text>
            <Text style={styles.egressIntroMessage}>
              The Courier is not here. You will have to escape with your loot on your own.
            </Text>
            <TouchableOpacity
              style={styles.egressIntroButton}
              onPress={() => setEgressIntroVisible(false)}
            >
              <Text style={styles.egressIntroButtonText}>CRACK THE EXIT LOCK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Result Step 1 — Outcome ── */}
      {resultStep === 1 && (
        <View style={[styles.resultPage, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          <ScrollView contentContainerStyle={[styles.resultPageContent, { justifyContent: 'center' }]} showsVerticalScrollIndicator={false}>
            {pendingResultRef.current?.result?.status === 'success' ? (
              <>
                <View style={styles.resultHeistImageWrap}>
                  <HeistImage target={level.target} style={{ width: '100%', height: 200 }} />
                </View>
                <Text style={[styles.outcomeTitle, { color: COLORS.gold, marginTop: 24 }]}>HEIST COMPLETE</Text>
                {activeLocks.map((lock, i) => (
                  <View key={i} style={styles.resultLockAnswerRow}>
                    {activeLocks.length > 1 && (
                      <Text style={[styles.resultLockAnswerLabel, { color: DIFFICULTY_COLORS[lock.difficulty] }]}>
                        LOCK {i + 1}
                      </Text>
                    )}
                    <Text style={styles.resultLockAnswer}>
                      {lock.answer[0].toUpperCase()} {lock.answer[1].toUpperCase()}
                    </Text>
                  </View>
                ))}
                <Text style={styles.resultTargetLine}>{level.target} acquired</Text>
                {pendingResultRef.current?.result?.performance ? (
                  <View style={[
                    styles.resultPerformancePill,
                    { borderColor: pendingResultRef.current.result.performance === 'Ghost' ? COLORS.gold : COLORS.muted },
                  ]}>
                    <Text style={[
                      styles.resultPerformanceText,
                      { color: pendingResultRef.current.result.performance === 'Ghost' ? COLORS.goldLight : COLORS.muted },
                    ]}>
                      {pendingResultRef.current.result.performance.toUpperCase()}
                    </Text>
                  </View>
                ) : null}
              </>
            ) : (
              <>
                <View style={[styles.resultHeistImageWrap, styles.resultHeistImageFailed]}>
                  <HeistImage target={level.target} style={{ width: '100%', height: 200 }} />
                  <View style={styles.resultFailureImageOverlay} />
                </View>
                <Text style={[styles.outcomeTitle, { color: COLORS.redThreat, marginTop: 24 }]}>HEIST FAILED</Text>
                <Text style={styles.outcomeMessage}>
                  {pendingResultRef.current?.result?.failureReason === 'timer'
                    ? 'Time expired. The Kid called the abort.'
                    : pendingResultRef.current?.result?.failureReason === 'guesses'
                      ? 'All guesses exhausted. The lock held.'
                      : pendingResultRef.current?.result?.failureReason === 'egress'
                        ? 'Failed to solve the exit lock. Could not escape with the loot.'
                        : 'Heist aborted on your order.'}
                </Text>
                <Text style={styles.resultFailureSecurityLine}>
                  Security detected your presence and changed the locks.
                </Text>
              </>
            )}
          </ScrollView>
          <View style={styles.resultPageFooter}>
            <TouchableOpacity style={styles.outcomeButton} onPress={handleStep1Ok}>
              <Text style={styles.outcomeButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── Result Step 2 — XP & Criminal Record ── */}
      {resultStep === 2 && (
        <View style={[styles.resultPage, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          <ScrollView contentContainerStyle={[styles.resultPageContent, { justifyContent: 'center' }]} showsVerticalScrollIndicator={false}>
            <Text style={[styles.outcomeTitle, { color: COLORS.cream, marginBottom: 24 }]}>CRIMINAL RECORD</Text>
            <Text style={styles.resultXpLabel}>TOTAL XP</Text>
            <Text style={styles.resultXpValue}>{displayXp}</Text>
            {(pendingResultRef.current?.result?.xpGained ?? 0) > 0 && (
              <Text style={styles.resultXpGained}>
                +{pendingResultRef.current?.result?.xpGained} this heist
              </Text>
            )}
            <View style={styles.resultRecordRow}>
              {Object.keys(RECORD_LABELS).map(key => (
                <View key={key} style={styles.resultRecordCard}>
                  <Text style={styles.resultRecordCount}>{displayRecord[key] ?? 0}</Text>
                  <Text style={styles.resultRecordLabel}>{RECORD_LABELS[key].toUpperCase()}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
          <View style={styles.resultPageFooter}>
            <TouchableOpacity style={styles.outcomeButton} onPress={handleStep2Ok}>
              <Text style={styles.outcomeButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── Result Step 3 — Debrief ── */}
      {resultStep === 3 && (
        <View style={[styles.resultPage, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.resultDebriefContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.resultPageTitle}>DEBRIEF</Text>
            {(() => {
              const result = pendingResultRef.current?.result;
              if (!result) return null;
              const { wrongGuesses: wg = [], coverBlowns: cb = [], vacations: vac = [], awolUpdates: awol = [], lockResults = [] } = result;

              // Group wrong guesses by lock, only for locks that were never cracked
              const unsolvedLockIndices = lockResults
                .filter(r => !r.cracked)
                .map(r => r.lockIndex);
              const wgByLock = {};
              wg.forEach(g => {
                const lockIdx = typeof g === 'string' ? 0 : g.lockIndex;
                if (unsolvedLockIndices.includes(lockIdx)) {
                  if (!wgByLock[lockIdx]) wgByLock[lockIdx] = [];
                  wgByLock[lockIdx].push(typeof g === 'string' ? g : g.guess);
                }
              });
              const locksWithWrongGuesses = Object.keys(wgByLock).map(Number).sort((a, b) => a - b);

              return (
                <View style={styles.resultDebriefList}>
                  {locksWithWrongGuesses.map(lockIdx => {
                    const lock = activeLocks[lockIdx];
                    const guesses = wgByLock[lockIdx];
                    return (
                      <View key={`lock-${lockIdx}`} style={styles.resultDebriefGroup}>
                        <Text style={styles.resultDebriefGroupRiddle}>{lock?.riddle}</Text>
                        {guesses.map((guessText, i) => (
                          <View key={i} style={styles.resultDebriefRow}>
                            <Text style={styles.resultDebriefEmoji}>✗</Text>
                            <Text style={styles.resultDebriefText}>{guessText.toUpperCase()}</Text>
                          </View>
                        ))}
                      </View>
                    );
                  })}
                  {cb.map((b, i) => (
                    <View key={`cb-${i}`} style={styles.resultDebriefRow}>
                      <CrewPortrait memberId={b.id} emoji={b.emoji} size={22} />
                      <Text style={styles.resultDebriefText}>{b.name} — cover blown, laying low 1 heist</Text>
                    </View>
                  ))}
                  {vac.map((v, i) => (
                    <View key={`vac-${i}`} style={styles.resultDebriefRow}>
                      <CrewPortrait memberId={v.id} emoji={v.emoji} size={22} />
                      <Text style={styles.resultDebriefText}>{v.name} — taking a vacation, out 1 heist</Text>
                      <Text style={[styles.resultDebriefDetail, { color: COLORS.goldLight }]}>VACATION</Text>
                    </View>
                  ))}
                  {awol.map((a, i) => (
                    <View key={`awol-${i}`} style={styles.resultDebriefRow}>
                      <CrewPortrait memberId={a.id} emoji={a.emoji} size={22} />
                      <Text style={styles.resultDebriefText}>
                        {a.after === 0
                          ? `${a.name} heard it went well — they're back`
                          : `${a.name} still tilted — ${a.after} successful heist${a.after !== 1 ? 's' : ''} to return`}
                      </Text>
                      <Text style={[styles.resultDebriefDetail, { color: a.after === 0 ? COLORS.greenSafe : '#E8824A' }]}>
                        {a.after === 0 ? 'BACK' : `${a.after} LEFT`}
                      </Text>
                    </View>
                  ))}
                </View>
              );
            })()}
          </ScrollView>
          <View style={styles.resultPageFooter}>
            <TouchableOpacity style={styles.outcomeButton} onPress={handleStep3Ok}>
              <Text style={styles.outcomeButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── Result Step 4 — Crew Mood + Navigation ── */}
      {resultStep === 4 && (
        <View style={[styles.resultPage, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          {(() => {
            const result = pendingResultRef.current?.result;
            const grievanceChanges = result?.grievanceChanges ?? [];
            const moodImprovements = result?.moodImprovements ?? [];
            const hasMoodChanges = grievanceChanges.length > 0 || moodImprovements.length > 0;
            const isSuccess = result?.status === 'success';
            return (
              <>
                {hasMoodChanges ? (
                  <>
                    <Text style={[styles.resultPageTitle, { paddingHorizontal: 24 }]}>CREW MOOD</Text>
                    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 16 }} showsVerticalScrollIndicator={false}>
                      {grievanceChanges.map((g, i) => (
                        <MoodBar
                          key={`griev-${i}`}
                          memberId={g.id}
                          emoji={g.emoji}
                          name={g.name}
                          fromMood={g.fromMood}
                          toMood={g.toMood}
                          fromIncidents={g.fromIncidents}
                          toIncidents={g.toIncidents}
                        />
                      ))}
                      {moodImprovements.map((m, i) => (
                        <MoodBar
                          key={`mood-${i}`}
                          memberId={m.id}
                          emoji={m.emoji}
                          name={m.name}
                          fromMood={m.fromMood}
                          toMood={m.toMood}
                          fromIncidents={m.fromIncidents}
                          toIncidents={m.toIncidents}
                        />
                      ))}
                    </ScrollView>
                    <View style={styles.resultPageFooter}>
                      {!isSuccess && (
                        <TouchableOpacity
                          style={styles.outcomeButton}
                          onPress={() => navigation.replace('HeistBriefing', { level })}
                        >
                          <Text style={styles.outcomeButtonText}>RETRY HEIST</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        style={styles.resultBackButton}
                        onPress={() => navigation.navigate('Map')}
                      >
                        <Text style={styles.resultBackButtonText}>BACK TO HEISTS</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                ) : (
                  <View style={styles.resultStep4Centered}>
                    {!isSuccess && (
                      <TouchableOpacity
                        style={styles.outcomeButton}
                        onPress={() => navigation.replace('HeistBriefing', { level })}
                      >
                        <Text style={styles.outcomeButtonText}>RETRY HEIST</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={styles.resultBackButton}
                      onPress={() => navigation.navigate('Map')}
                    >
                      <Text style={styles.resultBackButtonText}>BACK TO HEISTS</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            );
          })()}
        </View>
      )}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 16 },

  // ── Top bar ──────────────────────────────────────────────────────────────
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  heistInfo: { gap: 2 },
  heistCity: {
    fontFamily: FONTS.label,
    fontSize: 14,
    color: COLORS.cream,
    letterSpacing: 1,
  },
  heistLocation: {
    fontFamily: FONTS.mono,
    fontSize: 12,
    color: COLORS.muted,
    fontStyle: 'italic',
  },
  topBarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  devUnlockButton: {
    borderWidth: 1,
    borderColor: COLORS.greenSafe,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: COLORS.greenSafe + '18',
  },
  devUnlockButtonText: {
    fontFamily: FONTS.label,
    fontSize: 12,
    color: COLORS.greenSafe,
    letterSpacing: 1,
  },
  pauseButton: {
    borderWidth: 1,
    borderColor: COLORS.muted,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pauseButtonActive: {
    borderColor: COLORS.gold,
    backgroundColor: COLORS.gold + '22',
  },
  pauseButtonText: {
    fontFamily: FONTS.label,
    fontSize: 12,
    color: COLORS.muted,
    letterSpacing: 1,
  },
  pauseButtonTextActive: { color: COLORS.gold },
  abortButton: {
    borderWidth: 1,
    borderColor: COLORS.redThreat,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  abortButtonText: {
    fontFamily: FONTS.label,
    fontSize: 12,
    color: COLORS.redThreat,
    letterSpacing: 1,
  },

  // ── Timer ────────────────────────────────────────────────────────────────
  timerStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  timerLabel: {
    fontFamily: FONTS.label,
    fontSize: 10,
    color: COLORS.muted,
    letterSpacing: 2,
    width: 36,
  },
  timerTime: {
    fontFamily: FONTS.monoBold,
    fontSize: 22,
    letterSpacing: 1,
    lineHeight: 26,
    width: 72,
  },
  timerTrack: {
    flex: 1,
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  timerFill: { height: '100%', borderRadius: 2 },
  timerDarkText: {
    fontFamily: FONTS.label,
    fontSize: 9,
    letterSpacing: 1.5,
  },
  timerBlindText: {
    fontFamily: FONTS.label,
    fontSize: 11,
    color: COLORS.muted,
    letterSpacing: 2,
  },
  pausedBanner: {
    backgroundColor: COLORS.gold + '22',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.gold,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 10,
    alignItems: 'center',
  },
  pausedBannerText: {
    fontFamily: FONTS.label,
    fontSize: 13,
    color: COLORS.gold,
    letterSpacing: 2,
  },

  // ── Threat bar ───────────────────────────────────────────────────────────
  threatBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  threatLabel: {
    fontFamily: FONTS.label,
    fontSize: 11,
    color: COLORS.redThreat,
    letterSpacing: 1,
    width: 50,
  },
  threatTrack: {
    flex: 1,
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  threatFill: { height: '100%', backgroundColor: COLORS.redThreat, borderRadius: 2 },

  // ── Lock cards ───────────────────────────────────────────────────────────
  lockCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
    overflow: 'hidden',
  },
  lockCardSolved: {
    backgroundColor: COLORS.greenSafe + '0D',
  },
  lockCardActive: {
    // border color is set inline
  },
  lockCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 10,
  },
  lockNumBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockNumText: {
    fontFamily: FONTS.monoBold,
    fontSize: 13,
  },
  lockCardTitleBlock: { flex: 1, gap: 2 },
  lockCardTitle: {
    fontFamily: FONTS.label,
    fontSize: 12,
    letterSpacing: 1,
  },
  lockCardAnswer: {
    fontFamily: FONTS.monoBold,
    fontSize: 14,
    color: COLORS.greenSafe,
    letterSpacing: 1,
  },
  lockCrackedIcon: { fontSize: 18 },

  lockCardBody: {
    paddingHorizontal: 14,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 12,
    gap: 0,
  },
  riddle: {
    fontFamily: FONTS.display,
    fontSize: 20,
    color: COLORS.cream,
    lineHeight: 27,
    marginBottom: 10,
  },
  syllableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  syllableDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.gold,
  },
  syllableLabel: {
    fontFamily: FONTS.label,
    fontSize: 11,
    color: COLORS.goldLight,
    letterSpacing: 1,
    flex: 1,
  },
  guessBadge: {
    backgroundColor: COLORS.gold + '18',
    borderWidth: 1,
    borderColor: COLORS.gold,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignItems: 'center',
    minWidth: 52,
  },
  guessBadgeNumber: {
    fontFamily: FONTS.displayHeavy,
    fontSize: 18,
    color: COLORS.goldLight,
    lineHeight: 20,
  },
  guessBadgeLabel: {
    fontFamily: FONTS.label,
    fontSize: 8,
    color: COLORS.gold,
    letterSpacing: 1,
  },
  input: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontFamily: FONTS.mono,
    fontSize: 17,
    color: COLORS.cream,
    letterSpacing: 1,
  },
  crackButton: {
    backgroundColor: COLORS.gold,
    borderRadius: 8,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 8,
  },
  crackButtonDisabled: { backgroundColor: COLORS.muted },
  crackButtonText: {
    fontFamily: FONTS.label,
    fontSize: 17,
    color: COLORS.primaryDark,
    letterSpacing: 3,
  },

  // ── Intel ────────────────────────────────────────────────────────────────
  hintsSection: {
    backgroundColor: COLORS.primaryDark,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.gold,
    padding: 12,
    marginBottom: 14,
    gap: 8,
  },
  hintsLabel: {
    fontFamily: FONTS.label,
    fontSize: 11,
    color: COLORS.muted,
    letterSpacing: 2,
    marginBottom: 2,
  },
  hintRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  hintText: {
    flex: 1,
    fontFamily: FONTS.mono,
    fontSize: 13,
    color: COLORS.cream,
    lineHeight: 18,
    fontStyle: 'italic',
  },

  // ── Wrong guesses ────────────────────────────────────────────────────────
  wrongGuessSection: { marginBottom: 16 },
  wrongGuessLabel: {
    fontFamily: FONTS.label,
    fontSize: 11,
    color: COLORS.muted,
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  wrongGuessList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  wrongGuessPill: {
    borderWidth: 1,
    borderColor: COLORS.redThreat,
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 5,
    alignSelf: 'flex-start',
  },
  wrongGuessText: {
    fontFamily: FONTS.mono,
    fontSize: 14,
    color: COLORS.redThreat,
    textDecorationLine: 'line-through',
    letterSpacing: 1,
  },

  // ── Crew strip ───────────────────────────────────────────────────────────
  crewStrip: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: COLORS.cardBg,
  },

  // ── Distraction modal ────────────────────────────────────────────────────
  distractionModalPortrait: {
    marginBottom: 14,
  },
  distractionModalMessage: {
    fontFamily: FONTS.mono,
    fontSize: 15,
    color: COLORS.cream,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 14,
    fontStyle: 'italic',
  },
  distractionModalExtra: {
    fontFamily: FONTS.label,
    fontSize: 18,
    color: '#4FC3F7',
    letterSpacing: 1,
    marginBottom: 16,
  },
  distractionModalCountdown: {
    fontFamily: FONTS.mono,
    fontSize: 13,
    color: COLORS.muted,
    letterSpacing: 1,
  },

  // ── Egress intro modal ───────────────────────────────────────────────────
  egressIntroPortrait: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    opacity: 0.5,
  },
  egressIntroEmoji: {
    fontSize: 40,
  },
  egressIntroMessage: {
    fontFamily: FONTS.mono,
    fontSize: 15,
    color: COLORS.muted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    fontStyle: 'italic',
  },
  egressIntroButton: {
    backgroundColor: COLORS.gold,
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    width: '100%',
  },
  egressIntroButtonText: {
    fontFamily: FONTS.label,
    fontSize: 13,
    color: COLORS.primaryDark,
    letterSpacing: 2,
  },

  // ── Egress riddle card ────────────────────────────────────────────────────
  egressCard: {
    borderColor: COLORS.gold,
    backgroundColor: COLORS.gold + '0A',
  },
  egressWordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    marginTop: 4,
  },
  egressRevealedPill: {
    borderWidth: 1,
    borderColor: COLORS.greenSafe,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  egressRevealedText: {
    fontFamily: FONTS.monoBold,
    fontSize: 16,
    color: COLORS.greenSafe,
    letterSpacing: 1,
  },
  egressAnswerPill: {
    borderWidth: 1,
    borderColor: COLORS.gold,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 60,
    alignItems: 'center',
  },
  egressAnswerText: {
    fontFamily: FONTS.monoBold,
    fontSize: 16,
    color: COLORS.gold,
    letterSpacing: 1,
  },
  egressPlaceholder: {
    color: COLORS.muted,
  },
  egressSeparator: {
    fontFamily: FONTS.label,
    fontSize: 14,
    color: COLORS.muted,
  },

  // ── Result pages (full-screen, replaces modal) ────────────────────────────
  resultPage: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.background,
    zIndex: 10,
  },
  resultPageTitle: {
    fontFamily: FONTS.label,
    fontSize: 18,
    letterSpacing: 3,
    color: COLORS.cream,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 20,
  },
  resultPageContent: {
    alignItems: 'center',
    padding: 24,
    paddingBottom: 16,
    flexGrow: 1,
  },
  resultPageFooter: {
    padding: 24,
    paddingTop: 12,
    gap: 10,
    width: '100%',
  },
  resultDebriefContent: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    flexGrow: 1,
    justifyContent: 'center',
  },
  resultDebriefList: {
    width: '100%',
  },
  resultStep4Centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 12,
  },

  // ── Outcome modal ─────────────────────────────────────────────────────────
  outcomeOverlay: {
    flex: 1,
    backgroundColor: 'rgba(4,4,10,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  resultModalScroll: {
    width: '100%',
  },
  resultCardContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  outcomeCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 28,
    alignItems: 'center',
    width: '100%',
  },
  outcomeIcon: {
    fontSize: 52,
    marginBottom: 16,
  },
  outcomeTitle: {
    fontFamily: FONTS.label,
    fontSize: 18,
    letterSpacing: 3,
    marginBottom: 10,
    textAlign: 'center',
  },
  outcomeMessage: {
    fontFamily: FONTS.mono,
    fontSize: 15,
    color: COLORS.muted,
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 12,
  },
  outcomeButton: {
    backgroundColor: COLORS.gold,
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  outcomeButtonText: {
    fontFamily: FONTS.label,
    fontSize: 14,
    color: COLORS.primaryDark,
    letterSpacing: 2,
  },

  // ── Result Step 1 — Outcome ───────────────────────────────────────────────
  resultHeistImageWrap: {
    width: '100%',
    height: 140,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: COLORS.background,
  },
  resultHeistImageFailed: {
    position: 'relative',
  },
  resultFailureImageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(4,4,10,0.75)',
  },
  resultLockAnswerRow: {
    alignItems: 'center',
    marginBottom: 4,
  },
  resultLockAnswerLabel: {
    fontFamily: FONTS.label,
    fontSize: 10,
    letterSpacing: 2,
    marginBottom: 2,
  },
  resultLockAnswer: {
    fontFamily: FONTS.displayHeavy,
    fontSize: 26,
    color: COLORS.cream,
    textAlign: 'center',
    letterSpacing: 1,
  },
  resultTargetLine: {
    fontFamily: FONTS.mono,
    fontSize: 14,
    color: COLORS.muted,
    fontStyle: 'italic',
    marginTop: 8,
    marginBottom: 12,
    textAlign: 'center',
  },
  resultPerformancePill: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 4,
  },
  resultPerformanceText: {
    fontFamily: FONTS.label,
    fontSize: 12,
    letterSpacing: 2,
  },
  resultFailureSecurityLine: {
    fontFamily: FONTS.mono,
    fontSize: 13,
    color: COLORS.muted,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 4,
  },

  // ── Result Step 2 — XP & Criminal Record ──────────────────────────────────
  resultXpLabel: {
    fontFamily: FONTS.label,
    fontSize: 11,
    color: COLORS.muted,
    letterSpacing: 2,
    marginBottom: 4,
  },
  resultXpValue: {
    fontFamily: FONTS.displayHeavy,
    fontSize: 52,
    color: COLORS.goldLight,
    lineHeight: 56,
  },
  resultXpGained: {
    fontFamily: FONTS.mono,
    fontSize: 13,
    color: COLORS.gold,
    fontStyle: 'italic',
    marginBottom: 20,
    marginTop: 2,
  },
  resultRecordRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    width: '100%',
  },
  resultRecordCard: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
    minWidth: 64,
  },
  resultRecordCount: {
    fontFamily: FONTS.displayHeavy,
    fontSize: 28,
    color: COLORS.cream,
    lineHeight: 32,
  },
  resultRecordLabel: {
    fontFamily: FONTS.label,
    fontSize: 8,
    color: COLORS.muted,
    letterSpacing: 1,
    textAlign: 'center',
    marginTop: 2,
  },

  // ── Result Step 3 — Debrief ───────────────────────────────────────────────
  resultDebriefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 8,
    width: '100%',
  },
  resultDebriefEmoji: {
    fontFamily: FONTS.mono,
    fontSize: 14,
    color: COLORS.redThreat,
    width: 22,
    textAlign: 'center',
  },
  resultDebriefGroup: {
    width: '100%',
    marginBottom: 16,
  },
  resultDebriefGroupRiddle: {
    fontFamily: FONTS.mono,
    fontSize: 12,
    color: COLORS.muted,
    fontStyle: 'italic',
    marginBottom: 6,
  },
  resultDebriefText: {
    fontFamily: FONTS.mono,
    fontSize: 13,
    color: COLORS.cream,
    lineHeight: 18,
  },
  resultDebriefDetail: {
    fontFamily: FONTS.label,
    fontSize: 11,
    color: COLORS.muted,
    letterSpacing: 0.5,
    textAlign: 'right',
  },

  // ── Result Step 4 — Crew Mood + Navigation ────────────────────────────────
  resultNavButtons: {
    width: '100%',
    gap: 10,
    marginTop: 20,
  },
  resultBackButton: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  resultBackButtonText: {
    fontFamily: FONTS.label,
    fontSize: 12,
    color: COLORS.muted,
    letterSpacing: 2,
  },
});

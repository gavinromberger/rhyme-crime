import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Animated,
  PanResponder,
  Dimensions,
} from 'react-native';

const SCREEN_WIDTH = Dimensions.get('window').width;

import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';
import {
  DIFFICULTY_LABELS,
  DIFFICULTY_COLORS,
  COUNTRY_GROUPS,
  getHeistTotalSyllables,
  getHeistDifficultyColor,
} from '../data/levels';
import { BASE_XP } from '../constants/xp';
import { useGameState, getMood } from '../context/GameStateContext';
import CrewPortrait from '../components/CrewPortrait';
import HeistImage from '../components/HeistImage';

const MOOD_COLORS = {
  loyal: COLORS.greenSafe,
  irritated: COLORS.goldLight,
  angry: COLORS.gold,
  furious: '#E8824A',
  mutinous: COLORS.redThreat,
};

const STATUS_CONFIG = {
  ready:       { label: 'READY',        color: COLORS.greenSafe, selectable: true },
  vacation:    { label: 'VACATION',     color: '#E8C97A',         selectable: false },
  laying_low:  { label: 'LAYING LOW',   color: '#E8824A',         selectable: false },
  cover_blown: { label: 'COVER BLOWN',  color: '#E84040',         selectable: false },
  gone_awol:   { label: 'TILTED',       color: COLORS.redThreat,  selectable: false },
};

function getDifficultyTier(totalSyllables) {
  if (totalSyllables <= 3) return 1;
  if (totalSyllables <= 6) return 2;
  if (totalSyllables <= 9) return 3;
  return 4;
}

function isLevelLocked(level, countryLevels, completedHeists) {
  const thisTier = getDifficultyTier(getHeistTotalSyllables(level));
  if (thisTier === 1) return false;
  return countryLevels.some(l => {
    const lTier = getDifficultyTier(getHeistTotalSyllables(l));
    return lTier < thisTier && !completedHeists[l.id];
  });
}

function getDefaultSelectedIds(crew) {
  const ids = new Set(crew.filter(m => m.status === 'ready').map(m => m.id));
  if (ids.has('handler') && ids.has('courier')) ids.delete('courier');
  return ids;
}

export default function HeistBriefingScreen({ route, navigation }) {
  const [activeLevel, setActiveLevel] = useState(route.params.level);
  const { getCrewForLevel, spendLoyalty, tickHeist, partialHeists, completedHeists, lastCrewSelection, saveCrewSelection } = useGameState();

  const crew = getCrewForLevel(activeLevel.id);

  function getInitialSelectedIds(crew) {
    if (lastCrewSelection.length > 0) {
      const readyIds = new Set(crew.filter(m => m.status === 'ready').map(m => m.id));
      const restored = new Set(lastCrewSelection.filter(id => readyIds.has(id)));
      if (restored.size > 0) return restored;
    }
    return getDefaultSelectedIds(crew);
  }

  const [selectedIds, setSelectedIds] = useState(() => getInitialSelectedIds(crew));

  // When active level changes, restore last selection filtered to available crew
  useEffect(() => {
    const levelCrew = getCrewForLevel(activeLevel.id);
    const readyIds = new Set(levelCrew.filter(m => m.status === 'ready').map(m => m.id));
    if (lastCrewSelection.length > 0) {
      const restored = new Set(lastCrewSelection.filter(id => readyIds.has(id)));
      if (restored.size > 0) {
        setSelectedIds(restored);
        return;
      }
    }
    setSelectedIds(getDefaultSelectedIds(levelCrew));
  }, [activeLevel.id]);

  const totalSyllables = getHeistTotalSyllables(activeLevel);
  const difficultyColor = getHeistDifficultyColor(totalSyllables);
  const totalLocks = activeLevel.locks.length;
  const selectedCount = selectedIds.size;
  const maxGuesses = 2 * totalLocks + selectedCount;
  const guessBadgeColor =
    maxGuesses <= totalLocks * 2
      ? COLORS.redThreat
      : maxGuesses <= totalLocks * 2 + 2
        ? COLORS.gold
        : COLORS.greenSafe;

  // Ordered list of unlocked, uncompleted heists
  const swipeableLevels = COUNTRY_GROUPS.flatMap(g =>
    g.levels.filter(l => !completedHeists[l.id] && !isLevelLocked(l, g.levels, completedHeists))
  );
  const currentSwipeIndex = swipeableLevels.findIndex(l => l.id === activeLevel.id);
  const prevLevel = swipeableLevels[currentSwipeIndex - 1] ?? null;
  const nextLevel = swipeableLevels[currentSwipeIndex + 1] ?? null;

  // Refs for stable access inside PanResponder callbacks
  const prevLevelRef = useRef(prevLevel);
  const nextLevelRef = useRef(nextLevel);
  useEffect(() => { prevLevelRef.current = prevLevel; }, [prevLevel]);
  useEffect(() => { nextLevelRef.current = nextLevel; }, [nextLevel]);

  // Animated position. -SCREEN_WIDTH = center panel visible.
  const panelX = useRef(new Animated.Value(-SCREEN_WIDTH)).current;

  // Prevents the "old level flash" on commit.
  // When we spring to panel 0 (prev) or panel 2 (next), the React re-render
  // would update that panel's content before panelX resets, causing a 1-frame
  // flash of wrong content. We freeze that slot's content to match what just
  // slid in, so both the slot AND the center panel show the same level until
  // after the panelX reset is applied.
  const [frozenSlot, setFrozenSlot] = useState(null); // { level, side: 'left'|'right' }

  // After a swipe commits, we freeze the content then wait one rAF frame before
  // resetting panelX. This gives the Image in the center panel time to paint its
  // cached source before we snap back to showing it, eliminating the image flash.
  useLayoutEffect(() => {
    if (frozenSlot === null) return;
    const id = requestAnimationFrame(() => {
      panelX.setValue(-SCREEN_WIDTH);
      setFrozenSlot(null);
    });
    return () => cancelAnimationFrame(id);
  }, [frozenSlot]);

  // Which level to show in the left/right slots (may be frozen during a transition).
  const leftPanelLevel = frozenSlot?.side === 'left' ? frozenSlot.level : prevLevel;
  const rightPanelLevel = frozenSlot?.side === 'right' ? frozenSlot.level : nextLevel;
  // When frozen, show the frozen level in the center panel too so its Image source
  // doesn't change (avoiding a flash while the new image re-renders from cache).
  const centerPanelLevel = frozenSlot ? frozenSlot.level : activeLevel;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy) * 2,
      onPanResponderMove: (_, g) => {
        let dx = g.dx;
        if (dx > 0 && !prevLevelRef.current) dx *= 0.15;
        if (dx < 0 && !nextLevelRef.current) dx *= 0.15;
        panelX.setValue(-SCREEN_WIDTH + dx);
      },
      onPanResponderRelease: (_, g) => {
        const threshold = SCREEN_WIDTH * 0.3;
        if (g.dx > threshold && prevLevelRef.current) {
          Animated.spring(panelX, { toValue: 0, useNativeDriver: true, tension: 80, friction: 12 }).start(() => {
            const target = prevLevelRef.current;
            setFrozenSlot({ level: target, side: 'left' });
            setActiveLevel(target);
          });
        } else if (g.dx < -threshold && nextLevelRef.current) {
          Animated.spring(panelX, { toValue: -2 * SCREEN_WIDTH, useNativeDriver: true, tension: 80, friction: 12 }).start(() => {
            const target = nextLevelRef.current;
            setFrozenSlot({ level: target, side: 'right' });
            setActiveLevel(target);
          });
        } else {
          Animated.spring(panelX, { toValue: -SCREEN_WIDTH, useNativeDriver: true, tension: 80, friction: 12 }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(panelX, { toValue: -SCREEN_WIDTH, useNativeDriver: true, tension: 80, friction: 12 }).start();
      },
    })
  ).current;

  const guessScaleAnim = useRef(new Animated.Value(1)).current;
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    Animated.sequence([
      Animated.spring(guessScaleAnim, { toValue: 1.18, useNativeDriver: true, speed: 40, bounciness: 10 }),
      Animated.spring(guessScaleAnim, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 4 }),
    ]).start();
  }, [maxGuesses]);

  const toggleMember = (memberId) => {
    const isPassive = memberId === 'handler' || memberId === 'courier';
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(memberId)) {
        next.delete(memberId);
      } else {
        if (isPassive) { next.delete('handler'); next.delete('courier'); }
        next.add(memberId);
      }
      return next;
    });
  };

  const handleSpendLoyalty = (member) => {
    Alert.alert(
      `Use ${member.name}'s Loyalty?`,
      `${member.name} has ${member.loyalty} clean job${member.loyalty !== 1 ? 's' : ''} banked. Spending it all hires the Master of Disguise to clear their cover at ${activeLevel.location}.\n\nLoyalty resets to zero. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Hire Master of Disguise', onPress: () => spendLoyalty(member.id, activeLevel.id) },
      ]
    );
  };

  const handleBeginHeist = () => {
    saveCrewSelection([...selectedIds]);
    tickHeist();
    navigation.navigate('Gameplay', { level: activeLevel, selectedCrewIds: [...selectedIds] });
  };

  // Renders a single crew row. isInteractive=false for side panels.
  const renderCrewRow = (member, panelSelectedIds, isInteractive, levelForAlert) => {
    const mood = getMood(member.incidents);
    const moodColor = MOOD_COLORS[mood] ?? COLORS.muted;
    const statusCfg = STATUS_CONFIG[member.status] ?? STATUS_CONFIG.ready;
    const isSelected = panelSelectedIds.has(member.id);
    const isSelectable = statusCfg.selectable && isInteractive;
    const canSpendLoyalty = member.coverBlown && member.loyalty > 0 && isInteractive;

    const statusDetail = () => {
      if (member.status === 'gone_awol') return `Tilted — back after ${member.absenceHeists} successful heist${member.absenceHeists !== 1 ? 's' : ''}`;
      if (member.status === 'vacation') return `Vacation — ${member.absenceHeists} heist${member.absenceHeists !== 1 ? 's' : ''} remaining`;
      if (member.status === 'laying_low') return `Laying low — ${member.absenceHeists} heist${member.absenceHeists !== 1 ? 's' : ''} remaining`;
      if (member.status === 'cover_blown') return 'Cover blown at this location';
      if (mood === 'loyal' && member.loyalty > 0) return `${member.loyalty} loyalty banked`;
      return mood.charAt(0).toUpperCase() + mood.slice(1);
    };

    return (
      <TouchableOpacity
        key={member.id}
        activeOpacity={isSelectable ? 0.7 : 1}
        onPress={isSelectable ? () => toggleMember(member.id) : undefined}
        style={[
          styles.crewRow,
          !statusCfg.selectable && styles.crewRowUnavailable,
          statusCfg.selectable && isSelected && styles.crewRowSelected,
          statusCfg.selectable && !isSelected && styles.crewRowDeselected,
        ]}
      >
        {statusCfg.selectable && (
          <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
            {isSelected && <Text style={styles.checkmark}>✓</Text>}
          </View>
        )}
        <CrewPortrait memberId={member.id} emoji={member.emoji} size={36} />
        <View style={styles.crewInfo}>
          <View style={styles.crewNameRow}>
            <Text style={styles.crewName}>{member.name}</Text>
            {member.status === 'ready' && (
              <View style={[styles.moodDot, { backgroundColor: moodColor }]} />
            )}
          </View>
          <Text style={styles.crewStatus}>{statusDetail()}</Text>
        </View>
        <View style={styles.crewRight}>
          {member.status === 'cover_blown' ? (
            canSpendLoyalty ? (
              <TouchableOpacity style={styles.loyaltyButton} onPress={() => handleSpendLoyalty(member)}>
                <Text style={styles.loyaltyButtonTop}>LOYALTY</Text>
                <Text style={styles.loyaltyButtonCount}>{member.loyalty}</Text>
              </TouchableOpacity>
            ) : (
              <View style={[styles.statusBadge, { borderColor: '#E84040' }]}>
                <Text style={[styles.statusBadgeText, { color: '#E84040' }]}>BLOWN</Text>
              </View>
            )
          ) : (
            <View style={[styles.statusBadge, { borderColor: statusCfg.color }]}>
              <Text style={[styles.statusBadgeText, { color: statusCfg.color }]}>
                {statusCfg.label}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // Renders the full briefing content for any level.
  // panelSelectedIds: Set of selected crew IDs (for display)
  // isInteractive: whether crew rows respond to taps
  const renderBriefingPanel = (lvl, panelSelectedIds, isInteractive) => {
    if (!lvl) return <View style={styles.panel} />;

    const panelCrew = getCrewForLevel(lvl.id);
    const panelPassiveCrew = panelCrew.filter(m => m.id === 'handler' || m.id === 'courier');
    const panelActiveCrew = panelCrew.filter(m => m.id !== 'handler' && m.id !== 'courier');

    const panelTotalSyllables = getHeistTotalSyllables(lvl);
    const panelDifficultyColor = getHeistDifficultyColor(panelTotalSyllables);
    const panelTotalLocks = lvl.locks.length;
    const panelTotalBaseXP = lvl.locks.reduce((sum, lock) => sum + (BASE_XP[lock.difficulty] ?? 10), 0);
    const panelSelectedCount = panelSelectedIds.size;
    const panelMaxGuesses = 2 * panelTotalLocks + panelSelectedCount;
    const panelPreviouslySolvedCount = partialHeists[lvl.id]?.solvedCount ?? 0;
    const panelGuessBadgeColor =
      panelMaxGuesses <= panelTotalLocks * 2
        ? COLORS.redThreat
        : panelMaxGuesses <= panelTotalLocks * 2 + 2
          ? COLORS.gold
          : COLORS.greenSafe;

    return (
      <View style={styles.panel} pointerEvents={isInteractive ? 'auto' : 'none'}>
        <ScrollView contentContainerStyle={styles.scrollContent}>

          <View style={styles.heroImageContainer}>
            <HeistImage target={lvl.target} />
          </View>

          <View style={styles.scrollPadding}>
            <Text style={styles.eyebrow}>HEIST BRIEFING</Text>
            <Text style={styles.title}>{lvl.target}</Text>
            <Text style={styles.location}>{lvl.location}, {lvl.city}</Text>

            <View style={styles.badgeRow}>
              <View style={[styles.difficultyBadge, { borderColor: panelDifficultyColor }]}>
                <Text style={[styles.difficultyNumber, { color: panelDifficultyColor }]} numberOfLines={1} adjustsFontSizeToFit>{panelTotalSyllables}</Text>
                <Text style={styles.badgeLabel} numberOfLines={1}>DIFFICULTY</Text>
              </View>
              <View style={styles.lockCountBadge}>
                <Text style={styles.lockCountNumber} numberOfLines={1} adjustsFontSizeToFit>{panelTotalLocks}</Text>
                <Text style={styles.badgeLabel} numberOfLines={1}>
                  {panelTotalLocks === 1 ? 'RHYME LOCK' : 'RHYME LOCKS'}
                </Text>
              </View>
              <View style={styles.xpBadge}>
                <Text style={styles.xpBadgeNumber} numberOfLines={1} adjustsFontSizeToFit>{panelTotalBaseXP}</Text>
                <Text style={styles.badgeLabel} numberOfLines={1}>BASE XP</Text>
              </View>
            </View>

            <View style={styles.locksCard}>
              <Text style={styles.locksCardLabel}>LOCK SEQUENCE</Text>
              {lvl.locks.map((lock, i) => {
                const lockColor = DIFFICULTY_COLORS[lock.difficulty];
                return (
                  <View key={i} style={styles.lockRow}>
                    <View style={[styles.lockIndexBadge, { borderColor: lockColor }]}>
                      <Text style={[styles.lockIndexText, { color: lockColor }]}>{i + 1}</Text>
                    </View>
                    <View style={styles.lockInfo}>
                      <Text style={[styles.lockDifficulty, { color: lockColor }]}>
                        {DIFFICULTY_LABELS[lock.difficulty]}
                      </Text>
                      <View style={styles.lockSyllableRow}>
                        {Array.from({ length: lock.syllables }).map((_, j) => (
                          <View key={j} style={[styles.syllableDot, { backgroundColor: lockColor }]} />
                        ))}
                        <Text style={styles.lockSyllableLabel}>
                          {lock.syllables === 1 ? '1 syllable each' : `${lock.syllables} syllables each`}
                        </Text>
                      </View>
                    </View>
                    {i < panelPreviouslySolvedCount && (
                      <View style={styles.previouslySolvedBadge}>
                        <Text style={styles.previouslySolvedText}>CRACKED</Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>

            <View style={styles.divider} />

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>CREW SELECTION</Text>
              {isInteractive ? (
                <Animated.View style={[styles.guessBadge, { borderColor: guessBadgeColor, backgroundColor: guessBadgeColor + '18', transform: [{ scale: guessScaleAnim }] }]}>
                  <Text style={[styles.guessBadgeNumber, { color: guessBadgeColor }]}>{maxGuesses}</Text>
                  <Text style={[styles.guessBadgeLabel, { color: guessBadgeColor }]}>GUESSES</Text>
                </Animated.View>
              ) : (
                <View style={[styles.guessBadge, { borderColor: panelGuessBadgeColor, backgroundColor: panelGuessBadgeColor + '18' }]}>
                  <Text style={[styles.guessBadgeNumber, { color: panelGuessBadgeColor }]}>{panelMaxGuesses}</Text>
                  <Text style={[styles.guessBadgeLabel, { color: panelGuessBadgeColor }]}>GUESSES</Text>
                </View>
              )}
            </View>
            <Text style={styles.sectionHint}>Choose 1 passive operator.</Text>

            {panelPassiveCrew.map(m => renderCrewRow(m, panelSelectedIds, isInteractive, lvl))}

            <View style={styles.divider} />

            {panelActiveCrew.map(m => renderCrewRow(m, panelSelectedIds, isInteractive, lvl))}

            <View style={[styles.divider, { marginTop: 8 }]} />
          </View>
        </ScrollView>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.pagerContainer} {...panResponder.panHandlers}>
        <Animated.View style={[styles.pager, { transform: [{ translateX: panelX }] }]}>
          {renderBriefingPanel(leftPanelLevel, leftPanelLevel ? getDefaultSelectedIds(getCrewForLevel(leftPanelLevel.id)) : new Set(), false)}
          {renderBriefingPanel(centerPanelLevel, selectedIds, true)}
          {renderBriefingPanel(rightPanelLevel, rightPanelLevel ? getDefaultSelectedIds(getCrewForLevel(rightPanelLevel.id)) : new Set(), false)}
        </Animated.View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.beginButton} onPress={handleBeginHeist}>
          <Text style={styles.beginButtonText}>
            {selectedCount === 0 ? 'BEGIN HEIST — SOLO' : `BEGIN HEIST — ${selectedCount} CREW`}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.navigate('Map')}>
          <Text style={styles.backButtonText}>BACK TO HEISTS</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  pagerContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  pager: {
    flexDirection: 'row',
    width: SCREEN_WIDTH * 3,
    flex: 1,
  },
  panel: {
    width: SCREEN_WIDTH,
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  heroImageContainer: {
    width: '100%',
    height: 180,
    backgroundColor: COLORS.primaryDark,
    marginBottom: 20,
  },
  scrollPadding: {
    paddingHorizontal: 20,
  },
  eyebrow: {
    fontFamily: FONTS.label,
    fontSize: 11,
    color: COLORS.muted,
    letterSpacing: 2,
    marginBottom: 8,
    marginTop: 8,
  },
  title: {
    fontFamily: FONTS.displayHeavy,
    fontSize: 31,
    color: COLORS.cream,
    marginBottom: 4,
  },
  location: {
    fontFamily: FONTS.mono,
    fontSize: 14,
    color: COLORS.muted,
    fontStyle: 'italic',
    marginBottom: 16,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  difficultyBadge: {
    flex: 1,
    minWidth: 0,
    backgroundColor: COLORS.cardBg,
    borderRadius: 8,
    borderWidth: 1,
    padding: 14,
    alignItems: 'center',
  },
  difficultyNumber: {
    fontFamily: FONTS.displayHeavy,
    fontSize: 34,
    lineHeight: 36,
  },
  badgeLabel: {
    fontFamily: FONTS.label,
    fontSize: 9,
    color: COLORS.muted,
    letterSpacing: 0.5,
    marginTop: 3,
  },
  lockCountBadge: {
    flex: 1,
    minWidth: 0,
    backgroundColor: COLORS.cardBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    alignItems: 'center',
  },
  lockCountNumber: {
    fontFamily: FONTS.displayHeavy,
    fontSize: 34,
    color: COLORS.cream,
    lineHeight: 36,
  },
  xpBadge: {
    flex: 1,
    minWidth: 0,
    backgroundColor: COLORS.cardBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    alignItems: 'center',
  },
  xpBadgeNumber: {
    fontFamily: FONTS.displayHeavy,
    fontSize: 34,
    color: COLORS.goldLight,
    lineHeight: 36,
  },
  locksCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginBottom: 14,
    gap: 12,
  },
  locksCardLabel: {
    fontFamily: FONTS.label,
    fontSize: 10,
    color: COLORS.muted,
    letterSpacing: 2,
    marginBottom: 2,
  },
  lockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  lockIndexBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockIndexText: {
    fontFamily: FONTS.monoBold,
    fontSize: 13,
  },
  lockInfo: {
    flex: 1,
    gap: 4,
  },
  lockDifficulty: {
    fontFamily: FONTS.label,
    fontSize: 11,
    letterSpacing: 1,
  },
  lockSyllableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  syllableDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  lockSyllableLabel: {
    fontFamily: FONTS.mono,
    fontSize: 12,
    color: COLORS.muted,
  },
  previouslySolvedBadge: {
    backgroundColor: COLORS.greenSafe + '22',
    borderWidth: 1,
    borderColor: COLORS.greenSafe,
    borderRadius: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  previouslySolvedText: {
    fontFamily: FONTS.label,
    fontSize: 10,
    color: COLORS.greenSafe,
    letterSpacing: 1,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sectionLabel: {
    fontFamily: FONTS.label,
    fontSize: 11,
    color: COLORS.muted,
    letterSpacing: 2,
  },
  guessBadge: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
    alignItems: 'center',
    minWidth: 64,
  },
  guessBadgeNumber: {
    fontFamily: FONTS.displayHeavy,
    fontSize: 24,
    lineHeight: 26,
  },
  guessBadgeLabel: {
    fontFamily: FONTS.label,
    fontSize: 9,
    letterSpacing: 1,
    marginTop: 1,
  },
  sectionHint: {
    fontFamily: FONTS.mono,
    fontSize: 12,
    color: COLORS.muted,
    fontStyle: 'italic',
    marginBottom: 12,
  },
  crewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginBottom: 8,
    gap: 10,
  },
  crewRowSelected: { borderColor: COLORS.gold },
  crewRowDeselected: { opacity: 0.5 },
  crewRowUnavailable: { opacity: 0.4 },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: COLORS.gold,
    borderColor: COLORS.gold,
  },
  checkmark: {
    fontFamily: FONTS.label,
    fontSize: 12,
    color: COLORS.primaryDark,
    lineHeight: 14,
  },
  crewInfo: { flex: 1, gap: 3 },
  crewNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  crewName: {
    fontFamily: FONTS.label,
    fontSize: 13,
    color: COLORS.cream,
    letterSpacing: 0.5,
  },
  moodDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  crewStatus: {
    fontFamily: FONTS.mono,
    fontSize: 13,
    color: COLORS.muted,
    fontStyle: 'italic',
  },
  crewRight: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadge: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusBadgeText: {
    fontFamily: FONTS.label,
    fontSize: 10,
    letterSpacing: 1,
  },
  loyaltyButton: {
    backgroundColor: COLORS.gold,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignItems: 'center',
  },
  loyaltyButtonTop: {
    fontFamily: FONTS.label,
    fontSize: 9,
    color: COLORS.primaryDark,
    letterSpacing: 1,
  },
  loyaltyButtonCount: {
    fontFamily: FONTS.monoBold,
    fontSize: 15,
    color: COLORS.primaryDark,
  },
  footer: {
    padding: 16,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.primaryDark,
    gap: 10,
  },
  beginButton: {
    backgroundColor: COLORS.gold,
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
  },
  beginButtonText: {
    fontFamily: FONTS.label,
    fontSize: 15,
    color: COLORS.primaryDark,
    letterSpacing: 2,
  },
  backButton: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  backButtonText: {
    fontFamily: FONTS.label,
    fontSize: 12,
    color: COLORS.muted,
    letterSpacing: 2,
  },
});

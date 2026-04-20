import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';
import {
  LEVELS,
  COUNTRY_GROUPS,
  getHeistTotalSyllables,
  getHeistDifficultyColor,
} from '../data/levels';
import { useGameState } from '../context/GameStateContext';
import CrewPortrait from '../components/CrewPortrait';
import HeistImage from '../components/HeistImage';

// Maps total syllable count to a numeric tier (mirrors getHeistDifficultyColor thresholds).
function getDifficultyTier(totalSyllables) {
  if (totalSyllables <= 3) return 1; // green
  if (totalSyllables <= 6) return 2; // orange
  if (totalSyllables <= 9) return 3; // red
  return 4;                          // purple
}

// A heist is locked when any lower-tier heist in the same country is incomplete.
function isLevelLocked(level, countryLevels, completedHeists) {
  const thisTier = getDifficultyTier(getHeistTotalSyllables(level));
  if (thisTier === 1) return false; // first tier is always open
  return countryLevels.some(l => {
    const lTier = getDifficultyTier(getHeistTotalSyllables(l));
    return lTier < thisTier && !completedHeists[l.id];
  });
}

export default function MapScreen({ navigation }) {
  const { completedHeists, getAllCrew, resetAllState } = useGameState();
  const allCrew = getAllCrew();

  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'cleared'

  // Collapsed state per country slug. Completed countries start collapsed.
  const [collapsed, setCollapsed] = useState(() => {
    const init = {};
    COUNTRY_GROUPS.forEach(g => {
      if (g.levels.every(l => completedHeists[l.id])) {
        init[g.slug] = true;
      }
    });
    return init;
  });

  const toggleCollapsed = (slug) =>
    setCollapsed(prev => ({ ...prev, [slug]: !prev[slug] }));

  const handleDevReset = () => {
    Alert.alert(
      'DEV RESET',
      'Wipe all progress and return to initial state?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset', style: 'destructive', onPress: resetAllState },
      ]
    );
  };

  const totalHeists = LEVELS.length;
  const totalCompleted = LEVELS.filter(l => completedHeists[l.id]).length;
  const totalRemaining = totalHeists - totalCompleted;

  const activeGroups = COUNTRY_GROUPS.filter(
    g => !g.levels.every(l => completedHeists[l.id])
  );
  const clearedGroups = COUNTRY_GROUPS.filter(
    g => g.levels.every(l => completedHeists[l.id])
  );

  const renderCountryGroup = (group, isCleared) => {
    const isCollapsed = !!collapsed[group.slug];
    const doneCount = group.levels.filter(l => completedHeists[l.id]).length;
    const allDone = doneCount === group.levels.length;

    return (
      <View key={group.slug} style={styles.countrySection}>
        <TouchableOpacity
          style={styles.countryHeader}
          onPress={() => toggleCollapsed(group.slug)}
          activeOpacity={0.7}
        >
          <View style={styles.countryPin}>
            <Text style={styles.countryPinIcon}>{isCleared ? '✓' : '📍'}</Text>
          </View>
          <View style={styles.countryInfo}>
            <Text style={[styles.countryName, isCleared && styles.countryNameCleared]}>
              {group.countryName}
            </Text>
            <Text style={styles.countryCity}>{group.city}</Text>
          </View>
          <View style={styles.countryHeaderRight}>
            <Text style={[styles.countryProgress, allDone && styles.countryProgressDone]}>
              {doneCount}/{group.levels.length}
            </Text>
            <Text style={[styles.chevron, !isCollapsed && styles.chevronOpen]}>›</Text>
          </View>
        </TouchableOpacity>

        {!isCollapsed && group.levels.map(level => {
          const totalSyl = getHeistTotalSyllables(level);
          const diffColor = getHeistDifficultyColor(totalSyl);
          const lockCount = level.locks.length;
          const blownCrew = allCrew.filter(m => m.levelBusts.includes(level.id));
          const isDone = !!completedHeists[level.id];
          const isLocked = !isDone && isLevelLocked(level, group.levels, completedHeists);

          return (
            <TouchableOpacity
              key={level.id}
              style={[
                styles.heistCard,
                isDone && styles.heistCardDone,
                isLocked && styles.heistCardLocked,
              ]}
              onPress={
                isLocked ? undefined
                : isDone ? () => navigation.navigate('VaultTab', { levelId: level.id })
                : () => navigation.navigate('HeistBriefing', { level })
              }
              activeOpacity={isLocked ? 1 : 0.75}
              disabled={isLocked}
            >
              {/* Image — left column */}
              <View style={[styles.heistThumb, isLocked && { opacity: 0.2 }]}>
                <HeistImage target={level.target} />
              </View>

              {/* Text — right column */}
              <View style={styles.heistCardLeft}>
                <View style={styles.diffBadgeRow}>
                  <View style={[
                    styles.diffBadge,
                    { backgroundColor: diffColor + (isLocked ? '11' : '22'), borderColor: diffColor + (isLocked ? '55' : 'ff') },
                  ]}>
                    <Text style={[styles.diffBadgeText, { color: diffColor + (isLocked ? '88' : 'ff') }]}>
                      DIFFICULTY {totalSyl}
                    </Text>
                  </View>
                  {lockCount > 1 && (
                    <View style={styles.lockCountPill}>
                      <Text style={styles.lockCountPillText}>{lockCount} LOCKS</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.heistTarget, isLocked && styles.heistTargetLocked]}>
                  {level.target}
                </Text>
                <Text style={styles.heistLocation}>{level.location}</Text>
                {!isLocked && blownCrew.length > 0 && (
                  <View style={styles.blownRow}>
                    {blownCrew.map(m => (
                      <CrewPortrait key={m.id} memberId={m.id} emoji={m.emoji} size={18} />
                    ))}
                    <Text style={styles.blownLabel}>cover blown</Text>
                  </View>
                )}
              </View>

              {/* Status indicator — far right */}
              <View style={styles.heistCardRight}>
                {isDone && (
                  <View style={styles.doneBadge}>
                    <Text style={styles.doneText}>DONE</Text>
                  </View>
                )}
                {isLocked && <Text style={styles.lockedIcon}>🔒</Text>}
                {!isDone && !isLocked && <Text style={styles.heistArrow}>›</Text>}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Heists</Text>
          <TouchableOpacity style={styles.devResetButton} onPress={handleDevReset}>
            <Text style={styles.devResetText}>DEV RESET</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.headerEyebrow}>
          {totalCompleted === 0
            ? `${totalHeists} heists available`
            : totalCompleted === totalHeists
              ? 'All heists completed'
              : `${totalCompleted} completed · ${totalRemaining} remaining`}
        </Text>
      </View>

      {/* ── Tab bar ── */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'active' && styles.tabActive]}
          onPress={() => setActiveTab('active')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'active' && styles.tabTextActive]}>
            ACTIVE
          </Text>
          {activeGroups.length > 0 && (
            <View style={[styles.tabBadge, activeTab === 'active' && styles.tabBadgeActive]}>
              <Text style={[styles.tabBadgeText, activeTab === 'active' && styles.tabBadgeTextActive]}>
                {activeGroups.length}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'cleared' && styles.tabActive]}
          onPress={() => setActiveTab('cleared')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'cleared' && styles.tabTextActive]}>
            CLEARED
          </Text>
          {clearedGroups.length > 0 && (
            <View style={[styles.tabBadge, activeTab === 'cleared' && styles.tabBadgeActive]}>
              <Text style={[styles.tabBadgeText, activeTab === 'cleared' && styles.tabBadgeTextActive]}>
                {clearedGroups.length}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* ── Content ── */}
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {activeTab === 'active' ? (
          activeGroups.map(g => renderCountryGroup(g, false))
        ) : (
          clearedGroups.length > 0
            ? clearedGroups.map(g => renderCountryGroup(g, true))
            : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateIcon}>🔒</Text>
                <Text style={styles.emptyStateTitle}>NO COUNTRIES CLEARED</Text>
                <Text style={styles.emptyStateBody}>
                  Complete all four heists in a country to clear it.
                </Text>
              </View>
            )
        )}
      </ScrollView>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // ── Header ──
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  headerTitle: {
    fontFamily: FONTS.display,
    fontSize: 29,
    color: COLORS.cream,
  },
  devResetButton: {
    borderWidth: 1,
    borderColor: COLORS.redThreat,
    borderRadius: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: COLORS.redThreat + '18',
  },
  devResetText: {
    fontFamily: FONTS.label,
    fontSize: 10,
    color: COLORS.redThreat,
    letterSpacing: 1.5,
  },
  headerEyebrow: {
    fontFamily: FONTS.label,
    fontSize: 11,
    color: COLORS.muted,
    letterSpacing: 1,
  },

  // ── Tab bar ──
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: COLORS.gold,
  },
  tabText: {
    fontFamily: FONTS.label,
    fontSize: 11,
    color: COLORS.muted,
    letterSpacing: 2,
  },
  tabTextActive: {
    color: COLORS.cream,
  },
  tabBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  tabBadgeActive: {
    backgroundColor: COLORS.gold + '33',
  },
  tabBadgeText: {
    fontFamily: FONTS.label,
    fontSize: 10,
    color: COLORS.muted,
  },
  tabBadgeTextActive: {
    color: COLORS.gold,
  },

  // ── Scroll ──
  scroll: { flex: 1 },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    flexGrow: 1,
  },

  // ── Empty state ──
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: 12,
  },
  emptyStateIcon: {
    fontSize: 36,
    marginBottom: 4,
  },
  emptyStateTitle: {
    fontFamily: FONTS.label,
    fontSize: 13,
    color: COLORS.muted,
    letterSpacing: 2,
  },
  emptyStateBody: {
    fontFamily: FONTS.mono,
    fontSize: 13,
    color: COLORS.muted,
    textAlign: 'center',
    opacity: 0.6,
    maxWidth: 240,
  },

  // ── Country section ──
  countrySection: {
    marginBottom: 20,
  },
  countryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 10,
  },
  countryPin: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.gold,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countryPinIcon: {
    fontSize: 15,
  },
  countryInfo: {
    flex: 1,
  },
  countryName: {
    fontFamily: FONTS.label,
    fontSize: 15,
    color: COLORS.cream,
    letterSpacing: 1,
  },
  countryNameCleared: {
    color: COLORS.gold,
  },
  countryCity: {
    fontFamily: FONTS.mono,
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 1,
  },
  countryHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  countryProgress: {
    fontFamily: FONTS.monoBold,
    fontSize: 13,
    color: COLORS.muted,
  },
  countryProgressDone: {
    color: COLORS.gold,
  },
  chevron: {
    fontFamily: FONTS.mono,
    fontSize: 20,
    color: COLORS.gold,
    transform: [{ rotate: '0deg' }],
  },
  chevronOpen: {
    transform: [{ rotate: '90deg' }],
  },

  // ── Heist cards ──
  heistCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginBottom: 8,
    marginLeft: 44,
    flexDirection: 'row',
    alignItems: 'center',
  },
  heistCardDone: {
    opacity: 0.45,
  },
  heistCardLocked: {
    opacity: 0.4,
    borderStyle: 'dashed',
  },
  heistCardLeft: {
    flex: 1,
    gap: 5,
    marginLeft: 12,
  },
  diffBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
    flexWrap: 'wrap',
  },
  diffBadge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  diffBadgeText: {
    fontFamily: FONTS.label,
    fontSize: 10,
    letterSpacing: 1,
  },
  lockCountPill: {
    borderWidth: 1,
    borderRadius: 4,
    borderColor: COLORS.border,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  lockCountPillText: {
    fontFamily: FONTS.label,
    fontSize: 10,
    color: COLORS.muted,
    letterSpacing: 1,
  },
  heistTarget: {
    fontFamily: FONTS.label,
    fontSize: 14,
    color: COLORS.cream,
    letterSpacing: 0.5,
  },
  heistTargetLocked: {
    color: COLORS.muted,
  },
  lockedIcon: {
    fontSize: 16,
  },
  heistLocation: {
    fontFamily: FONTS.mono,
    fontSize: 12,
    color: COLORS.muted,
    fontStyle: 'italic',
  },
  blownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  blownEmoji: { fontSize: 13 },
  blownLabel: {
    fontFamily: FONTS.label,
    fontSize: 10,
    color: COLORS.redThreat,
    letterSpacing: 0.5,
  },
  heistThumb: {
    width: 64,
    height: 64,
  },
  heistCardRight: {
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heistArrow: {
    fontFamily: FONTS.mono,
    fontSize: 25,
    color: COLORS.gold,
  },
  doneBadge: {
    borderWidth: 2,
    borderColor: COLORS.gold,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    transform: [{ rotate: '-8deg' }],
  },
  doneText: {
    fontFamily: FONTS.label,
    fontSize: 12,
    color: COLORS.gold,
    letterSpacing: 2,
  },
});

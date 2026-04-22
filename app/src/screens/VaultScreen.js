import React, { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';
import { LEVELS, DIFFICULTY_LABELS, DIFFICULTY_COLORS } from '../data/levels';
import { useGameState } from '../context/GameStateContext';
import HeistImage from '../components/HeistImage';

const RECORD_LABELS = {
  misdemeanor: 'Misdemeanors',
  felony: 'Felonies',
  'most-wanted': 'Most Wanted',
  'public-enemy': 'Public Enemy',
};

export default function VaultScreen({ route }) {
  const { completedHeists, totalXp, criminalRecord, partialHeists } = useGameState();
  const [selectedLevel, setSelectedLevel] = useState(null);

  // Every time the screen is focused, check for a levelId param and open the modal
  useFocusEffect(useCallback(() => {
    const levelId = route?.params?.levelId;
    if (levelId && completedHeists[levelId]) {
      const level = LEVELS.find(l => l.id === levelId);
      if (level) {
        setSelectedLevel(level);
        route.params.levelId = undefined;
      }
    }
  }, [route?.params?.levelId]));

  const completedLevelsList = LEVELS.filter(l => completedHeists[l.id]);
  const totalLevels = LEVELS.length;
  const progressPct = totalLevels > 0 ? completedLevelsList.length / totalLevels : 0;

  const selectedRecord = selectedLevel ? completedHeists[selectedLevel.id] : null;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerEyebrow}>YOUR COLLECTION</Text>
        <Text style={styles.headerTitle}>The Vault</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>

        {/* XP Card */}
        <View style={styles.xpCard}>
          <Text style={styles.xpLabel}>TOTAL XP</Text>
          <Text style={styles.xpValue}>{totalXp}</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressPct * 100}%` }]} />
          </View>
          <Text style={styles.progressText}>
            {completedLevelsList.length} of {totalLevels} heists complete
          </Text>
        </View>

        {/* Criminal Record */}
        <View style={styles.recordSection}>
          <Text style={styles.sectionLabel}>CRIMINAL RECORD</Text>
          <View style={styles.recordRow}>
            {Object.entries(RECORD_LABELS).map(([key, label]) => {
              const count = criminalRecord[key] ?? 0;
              if (count === 0 && key === 'public-enemy') return null; // hide if none committed
              return (
                <View key={key} style={[styles.recordItem, key === 'public-enemy' && styles.recordItemPublicEnemy]}>
                  <Text style={[styles.recordCount, key === 'public-enemy' && { color: DIFFICULTY_COLORS['public-enemy'] }]}>
                    {count}
                  </Text>
                  <Text style={styles.recordLabel}>{label}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Acquisitions */}
        <Text style={styles.sectionLabel}>ACQUISITIONS</Text>
        <View style={styles.pedestalGrid}>
          {LEVELS.map((level) => {
            const record = completedHeists[level.id];
            const partial = partialHeists[level.id];
            const solvedCount = partial?.solvedCount ?? 0;
            const isPartial = !record && solvedCount > 0;

            return (
              <TouchableOpacity
                key={level.id}
                style={[
                  styles.pedestal,
                  record && styles.pedestalActive,
                  isPartial && styles.pedestalPartial,
                ]}
                onPress={record ? () => setSelectedLevel(level) : undefined}
                activeOpacity={record ? 0.7 : 1}
              >
                {record ? (
                  <>
                    <View style={styles.pedestalImageContainer}>
                      <HeistImage target={level.target} resizeMode="contain" />
                    </View>
                    <Text style={styles.pedestalTarget}>{level.target}</Text>
                    <Text style={styles.pedestalXp}>+{record.xpGained} XP</Text>
                    {record.performance === 'GHOST' && (
                      <Text style={styles.ghostStamp}>👻</Text>
                    )}
                  </>
                ) : isPartial ? (
                  <>
                    <Text style={styles.pedestalIconPartial}>🔓</Text>
                    <Text style={styles.pedestalTarget}>{level.target}</Text>
                    <Text style={styles.pedestalPartialLabel}>
                      {solvedCount}/{level.locks.length} LOCKS CRACKED
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.pedestalIconLocked}>?</Text>
                    <Text style={styles.pedestalTargetLocked}>{level.city}</Text>
                    <Text style={styles.pedestalLocationLocked}>{level.location}</Text>
                  </>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Acquisition detail modal */}
      <Modal
        visible={!!selectedLevel}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedLevel(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSelectedLevel(null)}
        >
          <View style={styles.modalCard}>
            {selectedLevel && selectedRecord && (
              <>
                <View style={styles.modalImageContainer}>
                  <HeistImage target={selectedLevel.target} resizeMode="contain" />
                </View>
                <Text style={styles.modalTarget}>{selectedLevel.target}</Text>
                <Text style={styles.modalLocation}>
                  {selectedLevel.location}, {selectedLevel.city}
                </Text>

                <View style={styles.modalDivider} />

                {(selectedRecord.locks ?? []).map((lock, i) => (
                  <View key={i} style={styles.modalLockRow}>
                    <Text style={styles.modalSectionLabel}>
                      {(selectedRecord.locks ?? []).length > 1 ? `LOCK ${i + 1} — ` : ''}
                      {DIFFICULTY_LABELS[lock.difficulty]}
                    </Text>
                    <Text style={styles.modalRiddle}>{lock.riddle}</Text>
                    <Text style={[styles.modalAnswer, { color: DIFFICULTY_COLORS[lock.difficulty] }]}>
                      {lock.answer[0].toUpperCase()} {lock.answer[1].toUpperCase()}
                    </Text>
                    {i < (selectedRecord.locks ?? []).length - 1 && (
                      <View style={styles.modalDivider} />
                    )}
                  </View>
                ))}

                <View style={styles.modalDivider} />

                <View style={styles.modalXpRow}>
                  <Text style={styles.modalXpLabel}>XP EARNED</Text>
                  <Text style={styles.modalXpValue}>+{selectedRecord.xpGained}</Text>
                </View>
                {selectedRecord.performance && (
                  <Text style={styles.modalPerformance}>{selectedRecord.performance}</Text>
                )}

                <TouchableOpacity style={styles.modalCloseButton} onPress={() => setSelectedLevel(null)}>
                  <Text style={styles.modalCloseText}>CLOSE</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerEyebrow: {
    fontFamily: FONTS.label,
    fontSize: 11,
    color: COLORS.muted,
    letterSpacing: 2,
    marginBottom: 4,
  },
  headerTitle: {
    fontFamily: FONTS.display,
    fontSize: 29,
    color: COLORS.cream,
  },
  scroll: { flex: 1 },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  xpCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.gold,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
  },
  xpLabel: {
    fontFamily: FONTS.label,
    fontSize: 11,
    color: COLORS.muted,
    letterSpacing: 2,
    marginBottom: 8,
  },
  xpValue: {
    fontFamily: FONTS.displayHeavy,
    fontSize: 48,
    color: COLORS.goldLight,
    marginBottom: 16,
  },
  progressTrack: {
    width: '100%',
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.gold,
    borderRadius: 2,
  },
  progressText: {
    fontFamily: FONTS.mono,
    fontSize: 13,
    color: COLORS.muted,
  },
  recordSection: { marginBottom: 24 },
  sectionLabel: {
    fontFamily: FONTS.label,
    fontSize: 11,
    color: COLORS.muted,
    letterSpacing: 2,
    marginBottom: 12,
  },
  recordRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  recordItem: {
    flex: 1,
    minWidth: '28%',
    backgroundColor: COLORS.cardBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    alignItems: 'center',
  },
  recordItemPublicEnemy: {
    borderColor: DIFFICULTY_COLORS['public-enemy'],
  },
  recordCount: {
    fontFamily: FONTS.displayHeavy,
    fontSize: 29,
    color: COLORS.cream,
    marginBottom: 4,
  },
  recordLabel: {
    fontFamily: FONTS.label,
    fontSize: 10,
    color: COLORS.muted,
    letterSpacing: 1,
    textAlign: 'center',
  },
  pedestalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  pedestal: {
    width: '47%',
    backgroundColor: COLORS.cardBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    alignItems: 'center',
    minHeight: 120,
    justifyContent: 'center',
  },
  pedestalActive: {
    borderColor: COLORS.gold,
  },
  pedestalPartial: {
    borderColor: COLORS.greenSafe + '88',
  },
  pedestalImageContainer: {
    width: '100%',
    height: 72,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: COLORS.primaryDark,
    marginBottom: 6,
  },
  pedestalIcon: { fontSize: 29, marginBottom: 6 },
  pedestalIconPartial: { fontSize: 29, marginBottom: 6 },
  pedestalTarget: {
    fontFamily: FONTS.label,
    fontSize: 11,
    color: COLORS.cream,
    textAlign: 'center',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  pedestalPartialLabel: {
    fontFamily: FONTS.label,
    fontSize: 10,
    color: COLORS.greenSafe,
    letterSpacing: 0.5,
    textAlign: 'center',
    marginTop: 2,
  },
  pedestalXp: {
    fontFamily: FONTS.label,
    fontSize: 10,
    color: COLORS.gold,
    letterSpacing: 1,
  },
  ghostStamp: {
    fontSize: 13,
    marginTop: 3,
  },
  pedestalIconLocked: {
    fontFamily: FONTS.displayHeavy,
    fontSize: 29,
    color: COLORS.muted,
    marginBottom: 6,
  },
  pedestalTargetLocked: {
    fontFamily: FONTS.label,
    fontSize: 11,
    color: COLORS.muted,
    textAlign: 'center',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  pedestalLocationLocked: {
    fontFamily: FONTS.mono,
    fontSize: 11,
    color: COLORS.muted,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.gold,
    padding: 24,
    width: '100%',
    alignItems: 'center',
  },
  modalImageContainer: {
    width: '100%',
    height: 140,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: COLORS.primaryDark,
    marginBottom: 14,
  },
  modalIcon: { fontSize: 36, marginBottom: 10 },
  modalTarget: {
    fontFamily: FONTS.label,
    fontSize: 15,
    color: COLORS.cream,
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: 4,
  },
  modalLocation: {
    fontFamily: FONTS.mono,
    fontSize: 13,
    color: COLORS.muted,
    fontStyle: 'italic',
    marginBottom: 4,
  },
  modalDivider: {
    width: '100%',
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 14,
  },
  modalLockRow: {
    width: '100%',
    alignItems: 'flex-start',
  },
  modalSectionLabel: {
    fontFamily: FONTS.label,
    fontSize: 10,
    color: COLORS.muted,
    letterSpacing: 2,
    marginBottom: 6,
  },
  modalRiddle: {
    fontFamily: FONTS.display,
    fontSize: 16,
    color: COLORS.cream,
    lineHeight: 22,
    marginBottom: 8,
  },
  modalAnswer: {
    fontFamily: FONTS.displayHeavy,
    fontSize: 22,
    textAlign: 'left',
  },
  modalXpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  modalXpLabel: {
    fontFamily: FONTS.label,
    fontSize: 11,
    color: COLORS.muted,
    letterSpacing: 2,
  },
  modalXpValue: {
    fontFamily: FONTS.displayHeavy,
    fontSize: 25,
    color: COLORS.goldLight,
  },
  modalPerformance: {
    fontFamily: FONTS.label,
    fontSize: 11,
    color: COLORS.gold,
    letterSpacing: 2,
    marginBottom: 4,
  },
  modalCloseButton: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  modalCloseText: {
    fontFamily: FONTS.label,
    fontSize: 13,
    color: COLORS.muted,
    letterSpacing: 2,
  },
});

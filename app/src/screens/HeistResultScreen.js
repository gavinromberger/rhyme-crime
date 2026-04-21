import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';
import { DIFFICULTY_LABELS, DIFFICULTY_COLORS } from '../data/levels';
import ThermometerBar from '../components/ThermometerBar';
import CrewPortrait from '../components/CrewPortrait';

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

function SynopsisRow({ memberId, emoji, label, detail, detailColor }) {
  return (
    <View style={synStyles.row}>
      <CrewPortrait memberId={memberId} emoji={emoji} size={22} style={synStyles.portrait} />
      <Text style={synStyles.label}>{label}</Text>
      {detail ? (
        <Text style={[synStyles.detail, detailColor && { color: detailColor }]}>{detail}</Text>
      ) : null}
    </View>
  );
}

const synStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 8,
  },
  portrait: { width: 24, textAlign: 'center' },
  label: {
    flex: 1,
    fontFamily: FONTS.mono,
    fontSize: 13,
    color: COLORS.cream,
    lineHeight: 18,
  },
  detail: {
    fontFamily: FONTS.label,
    fontSize: 11,
    color: COLORS.muted,
    letterSpacing: 0.5,
    textAlign: 'right',
  },
});

export default function HeistResultScreen({ route, navigation }) {
  const { level, result } = route.params;
  const {
    status,
    failureReason,
    wrongGuesses,
    coverBlowns = [],
    abilitiesUsed = [],
    vacations = [],
    awolUpdates = [],
    grievanceChanges = [],
    moodImprovements = [],
    xpGained,
    performance,
    abilitiesUsedOnFailure = false,
    lockResults = [],
    totalLocks = 1,
    locksAlreadyCounted = 0,
  } = result;

  const success = status === 'success';
  const locksNewlyCracked = lockResults.filter((r, i) => r.cracked && i >= locksAlreadyCounted).length;
  const totalCracked = lockResults.filter(r => r.cracked).length;

  const failureMessage =
    failureReason === 'timer'
      ? 'Time expired. The heist is blown.'
      : failureReason === 'guesses'
        ? 'All guesses exhausted. The lock held.'
        : failureReason === 'egress'
          ? 'Failed to solve the exit lock. Could not escape with the loot.'
          : 'You called the abort. The crew pulled out.';

  const hasMoodChanges = grievanceChanges.length > 0 || moodImprovements.length > 0;
  const isMultiLock = totalLocks > 1;

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>

        {/* Hero */}
        <View style={[styles.heroCard, { borderColor: success ? COLORS.gold : COLORS.redThreat }]}>
          <Text style={styles.heroIcon}>{success ? '🔓' : '🚨'}</Text>
          <Text style={[styles.heroTitle, { color: success ? COLORS.gold : COLORS.redThreat }]}>
            {success
              ? (isMultiLock ? 'ALL LOCKS CRACKED' : 'LOCK CRACKED')
              : (isMultiLock && totalCracked > 0
                  ? `${totalCracked} OF ${totalLocks} LOCKS CRACKED`
                  : 'PRESENCE DETECTED')}
          </Text>

          {success ? (
            <>
              {/* Show answers for all locks */}
              {level.locks.map((lock, i) => (
                <View key={i} style={styles.lockAnswerRow}>
                  {isMultiLock && (
                    <Text style={[styles.lockAnswerLabel, { color: DIFFICULTY_COLORS[lock.difficulty] }]}>
                      LOCK {i + 1}
                    </Text>
                  )}
                  <Text style={styles.heroAnswer}>
                    {lock.answer[0].toUpperCase()} {lock.answer[1].toUpperCase()}
                  </Text>
                </View>
              ))}
              <Text style={styles.heroTarget}>{level.target} acquired</Text>
              <View style={styles.xpRow}>
                <Text style={styles.xpLabel}>XP EARNED</Text>
                <Text style={styles.xpValue}>+{xpGained}</Text>
              </View>
              {performance && (
                <View style={[styles.performancePill, { borderColor: xpGained >= 20 ? COLORS.gold : COLORS.muted }]}>
                  <Text style={[styles.performanceText, { color: xpGained >= 20 ? COLORS.goldLight : COLORS.muted }]}>
                    {performance}
                  </Text>
                </View>
              )}
            </>
          ) : (
            <>
              <Text style={styles.failureMessage}>{failureMessage}</Text>
              {isMultiLock && totalCracked > 0 && (
                <Text style={styles.partialNote}>
                  {locksNewlyCracked > 0
                    ? `${locksNewlyCracked} crime${locksNewlyCracked !== 1 ? 's' : ''} added to your record.`
                    : 'No new crimes added to your record this run.'}
                </Text>
              )}
            </>
          )}
        </View>

        {/* Lock results (multi-lock only) */}
        {isMultiLock && (
          <>
            <Text style={styles.sectionLabel}>LOCK RESULTS</Text>
            <View style={styles.synopsisCard}>
              {lockResults.map((r, i) => {
                const lock = level.locks[i];
                const lockColor = DIFFICULTY_COLORS[lock.difficulty];
                const wasAlreadyCounted = i < locksAlreadyCounted;
                return (
                  <SynopsisRow
                    key={i}
                    emoji={r.cracked ? '🔓' : '🔒'}
                    label={`Lock ${i + 1} — ${DIFFICULTY_LABELS[lock.difficulty]}`}
                    detail={
                      r.cracked
                        ? (wasAlreadyCounted ? 'PRIOR RUN' : 'CRACKED')
                        : 'HELD'
                    }
                    detailColor={
                      r.cracked
                        ? (wasAlreadyCounted ? COLORS.muted : COLORS.greenSafe)
                        : COLORS.redThreat
                    }
                  />
                );
              })}
            </View>
          </>
        )}

        {/* Debrief */}
        <Text style={styles.sectionLabel}>DEBRIEF</Text>
        <View style={styles.synopsisCard}>
          {wrongGuesses.length > 0 && (() => {
            const isMultiLockDebrief = totalLocks > 1;
            return wrongGuesses.map((g, i) => {
              const guessText = typeof g === 'string' ? g : g.guess;
              const lockIdx = typeof g === 'string' ? 0 : g.lockIndex;
              const lock = level.locks[lockIdx];
              const detail = isMultiLockDebrief
                ? `LOCK ${lockIdx + 1}`
                : undefined;
              const detailColor = isMultiLockDebrief
                ? DIFFICULTY_COLORS[lock?.difficulty]
                : undefined;
              return (
                <SynopsisRow
                  key={`guess-${i}`}
                  emoji="✗"
                  label={guessText.toUpperCase()}
                  detail={detail}
                  detailColor={detailColor}
                />
              );
            });
          })()}

          {coverBlowns.map((b, i) => (
            <SynopsisRow
              key={`blown-${i}`}
              memberId={b.id}
              emoji={b.emoji}
              label={`${b.name} — cover blown, laying low 1 heist`}
              detailColor={'#E8824A'}
            />
          ))}

          {success && vacations.map((v, i) => (
            <SynopsisRow
              key={`vac-${i}`}
              memberId={v.id}
              emoji={v.emoji}
              label={`${v.name} — taking a vacation, out 1 heist`}
              detail="VACATION"
              detailColor={'#E8C97A'}
            />
          ))}

          {awolUpdates.map((a, i) => (
            <SynopsisRow
              key={`awol-${i}`}
              memberId={a.id}
              emoji={a.emoji}
              label={
                a.after === 0
                  ? `${a.name} heard it went well — they're back`
                  : `${a.name} still tilted — ${a.after} successful heist${a.after !== 1 ? 's' : ''} to return`
              }
              detail={a.after === 0 ? 'BACK' : `${a.after} LEFT`}
              detailColor={a.after === 0 ? COLORS.greenSafe : '#E8824A'}
            />
          ))}
        </View>

        {/* Crew mood */}
        {hasMoodChanges && (
          <>
            <Text style={styles.sectionLabel}>CREW MOOD</Text>
            <View style={styles.synopsisCard}>
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
            </View>
          </>
        )}

      </ScrollView>

      <View style={styles.footer}>
        {!success && (
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.replace('HeistBriefing', { level })}
          >
            <Text style={styles.primaryButtonText}>RETRY HEIST</Text>
          </TouchableOpacity>
        )}
        {success && (
          <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate('Map')}>
            <Text style={styles.primaryButtonText}>BACK TO HEISTS</Text>
          </TouchableOpacity>
        )}
        {!success && (
          <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate('Map')}>
            <Text style={styles.secondaryButtonText}>BACK TO HEISTS</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 20,
  },
  heroCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 14,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
  },
  heroIcon: { fontSize: 44, marginBottom: 12 },
  heroTitle: {
    fontFamily: FONTS.label,
    fontSize: 14,
    letterSpacing: 3,
    marginBottom: 14,
    textAlign: 'center',
  },
  lockAnswerRow: {
    alignItems: 'center',
    marginBottom: 4,
  },
  lockAnswerLabel: {
    fontFamily: FONTS.label,
    fontSize: 10,
    letterSpacing: 2,
    marginBottom: 2,
  },
  heroAnswer: {
    fontFamily: FONTS.displayHeavy,
    fontSize: 28,
    color: COLORS.cream,
    textAlign: 'center',
  },
  heroTarget: {
    fontFamily: FONTS.mono,
    fontSize: 14,
    color: COLORS.muted,
    fontStyle: 'italic',
    marginBottom: 16,
    marginTop: 10,
  },
  xpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  xpLabel: {
    fontFamily: FONTS.label,
    fontSize: 11,
    color: COLORS.muted,
    letterSpacing: 2,
  },
  xpValue: {
    fontFamily: FONTS.displayHeavy,
    fontSize: 29,
    color: COLORS.goldLight,
  },
  performancePill: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  performanceText: {
    fontFamily: FONTS.label,
    fontSize: 12,
    letterSpacing: 2,
  },
  failureMessage: {
    fontFamily: FONTS.mono,
    fontSize: 15,
    color: COLORS.muted,
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 8,
  },
  partialNote: {
    fontFamily: FONTS.mono,
    fontSize: 13,
    color: COLORS.gold,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 6,
  },
  sectionLabel: {
    fontFamily: FONTS.label,
    fontSize: 11,
    color: COLORS.muted,
    letterSpacing: 2,
    marginBottom: 10,
  },
  synopsisCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingTop: 4,
    paddingBottom: 0,
    marginBottom: 24,
  },
  footer: {
    padding: 16,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.primaryDark,
    gap: 10,
  },
  primaryButton: {
    backgroundColor: COLORS.gold,
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontFamily: FONTS.label,
    fontSize: 15,
    color: COLORS.primaryDark,
    letterSpacing: 2,
  },
  secondaryButton: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  secondaryButtonText: {
    fontFamily: FONTS.label,
    fontSize: 12,
    color: COLORS.muted,
    letterSpacing: 2,
  },
});

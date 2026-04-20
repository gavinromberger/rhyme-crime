import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';
import ThermometerBar from './ThermometerBar';
import CrewPortrait from './CrewPortrait';

const MOOD_LABELS = {
  loyal: 'LOYAL',
  irritated: 'IRRITATED',
  angry: 'ANGRY',
  furious: 'FURIOUS',
  mutinous: 'MUTINOUS',
};

// status: 'ready' | 'vacation' | 'laying_low' | 'cover_blown'
// coverBlownThisHeist: bool — cover was blown during current heist session
export default function CrewCard({ member, onUse, coverBlownThisHeist, hideStats }) {
  const { id, shortName, emoji, abilityLabel, mood, incidents, status } = member;
  const isPassive = member.id === 'handler' || member.id === 'courier';
  const moodLabel = MOOD_LABELS[mood] ?? mood?.toUpperCase();

  let statusPill = null;
  if (status !== 'ready') {
    if (status === 'expended') {
      statusPill = (
        <View style={[styles.statusPill, styles.expendedPill]}>
          <Text style={[styles.statusText, styles.expendedText]}>EXPENDED</Text>
        </View>
      );
    } else if (coverBlownThisHeist || status === 'cover_blown') {
      statusPill = (
        <View style={[styles.statusPill, styles.blownPill]}>
          <Text style={[styles.statusText, styles.blownText]}>COVER BLOWN</Text>
        </View>
      );
    } else if (status === 'gone_awol') {
      statusPill = (
        <View style={[styles.statusPill, styles.awolPill]}>
          <Text style={[styles.statusText, styles.awolText]}>TILTED</Text>
        </View>
      );
    } else if (status === 'vacation') {
      statusPill = (
        <View style={[styles.statusPill, styles.vacationPill]}>
          <Text style={[styles.statusText, styles.vacationText]}>VACATION</Text>
        </View>
      );
    } else if (status === 'laying_low') {
      statusPill = (
        <View style={[styles.statusPill, styles.layingLowPill]}>
          <Text style={[styles.statusText, styles.layingLowText]}>LAYING LOW</Text>
        </View>
      );
    }
  }

  return (
    <View style={[styles.card, (status !== 'ready' || coverBlownThisHeist) && styles.cardUnavailable]}>
      <CrewPortrait memberId={id} emoji={emoji} size={44} style={styles.portrait} />
      <Text style={styles.name}>{shortName}</Text>

      {/* Compact step thermometer */}
      {!hideStats && (
        <View style={styles.barWrapper}>
          <ThermometerBar
            fromIncidents={0}
            toIncidents={incidents ?? 0}
            delay={150}
            animDuration={500}
            bgColor={COLORS.cardBg}
            compact
          />
        </View>
      )}

      {!hideStats && <Text style={styles.moodLabel}>{moodLabel}</Text>}

      <View style={styles.actionRow}>
        {status === 'ready' ? (
          isPassive ? (
            <View style={[styles.statusPill, styles.activePill]}>
              <Text style={[styles.statusText, styles.activeText]}>ACTIVE</Text>
            </View>
          ) : (
            <TouchableOpacity style={styles.abilityButton} onPress={() => onUse(member)}>
              <Text style={styles.abilityText}>{abilityLabel}</Text>
            </TouchableOpacity>
          )
        ) : statusPill}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: COLORS.cardBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 10,
    paddingHorizontal: 4,
    marginHorizontal: 3,
  },
  cardUnavailable: {
    opacity: 0.45,
  },
  portrait: {
    marginBottom: 4,
  },
  name: {
    fontFamily: FONTS.label,
    fontSize: 9,
    color: COLORS.cream,
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  barWrapper: {
    width: '88%',
    paddingHorizontal: 8,
  },
  moodLabel: {
    fontFamily: FONTS.label,
    fontSize: 8,
    color: COLORS.muted,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  actionRow: {
    alignItems: 'center',
  },
  abilityButton: {
    backgroundColor: COLORS.gold,
    borderRadius: 4,
    paddingVertical: 3,
    paddingHorizontal: 5,
  },
  abilityText: {
    fontFamily: FONTS.label,
    fontSize: 9,
    color: COLORS.primaryDark,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  statusPill: {
    borderRadius: 4,
    paddingVertical: 3,
    paddingHorizontal: 5,
    borderWidth: 1,
  },
  statusText: {
    fontFamily: FONTS.label,
    fontSize: 8,
    letterSpacing: 0.5,
  },
  activePill: { borderColor: COLORS.greenSafe },
  activeText: { color: COLORS.greenSafe },
  blownPill: { borderColor: '#E84040' },
  blownText: { color: '#E84040' },
  expendedPill: { borderColor: COLORS.gold },
  expendedText: { color: COLORS.gold },
  awolPill: { borderColor: '#E8824A' },
  awolText: { color: '#E8824A' },
  vacationPill: { borderColor: '#E8C97A' },
  vacationText: { color: '#E8C97A' },
  layingLowPill: { borderColor: '#E8824A' },
  layingLowText: { color: '#E8824A' },
});

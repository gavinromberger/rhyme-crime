import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';
import { CREW } from '../data/crew';
import { CREW_IMAGES } from '../data/crewImages';
import { LEVELS } from '../data/levels';
import { useGameState, getMood } from '../context/GameStateContext';

const SCREEN_WIDTH = Dimensions.get('window').width;

const MOOD_COLORS = {
  loyal:    COLORS.greenSafe,
  irritated: COLORS.goldLight,
  angry:    COLORS.gold,
  furious:  '#E8824A',
  mutinous: COLORS.redThreat,
};

const STATUS_LABELS = {
  ready:       { label: 'READY',       color: COLORS.greenSafe },
  vacation:    { label: 'VACATION',    color: '#E8C97A' },
  laying_low:  { label: 'LAYING LOW',  color: '#E8824A' },
  cover_blown: { label: 'COVER BLOWN', color: '#E84040' },
  gone_awol:   { label: 'TILTED',      color: COLORS.redThreat },
};

function StatRow({ label, value, sub }) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <View style={styles.statRight}>
        <Text style={styles.statValue}>{value}</Text>
        {sub ? <Text style={styles.statSub}>{sub}</Text> : null}
      </View>
    </View>
  );
}

function SectionCard({ title, children }) {
  return (
    <View style={styles.card}>
      {title ? <Text style={styles.cardTitle}>{title}</Text> : null}
      {children}
    </View>
  );
}

export default function CrewMemberDetailScreen({ route, navigation }) {
  const { memberId } = route.params;
  const { getAllCrew, crewState } = useGameState();

  const allCrew = getAllCrew();
  const member = allCrew.find(m => m.id === memberId);
  const staticMember = CREW.find(m => m.id === memberId);
  const state = crewState.find(s => s.id === memberId);

  if (!member || !staticMember) return null;

  const mood = getMood(member.incidents);
  const moodColor = MOOD_COLORS[mood] ?? COLORS.muted;
  const statusCfg = STATUS_LABELS[member.status] ?? STATUS_LABELS.ready;
  const isPassive = memberId === 'handler' || memberId === 'courier';

  const bustImage = CREW_IMAGES[memberId]?.bust;

  // Map blown level IDs to human-readable names
  const blownLocations = (state?.levelBusts ?? [])
    .map(levelId => {
      const level = LEVELS.find(l => l.id === levelId);
      return level ? `${level.city} — ${level.target}` : levelId;
    });

  const heistsParticipated = state?.heistsParticipated ?? 0;
  const abilityUses        = state?.abilityUses ?? 0;
  const essentialUses      = state?.essentialUses ?? 0;
  const essentialRate      = abilityUses > 0
    ? `${Math.round((essentialUses / abilityUses) * 100)}% success rate`
    : null;

  // Map essential heist IDs to city + target strings
  const accolades = (state?.essentialHeists ?? []).map(levelId => {
    const level = LEVELS.find(l => l.id === levelId);
    return level ? { city: level.city, target: level.target } : null;
  }).filter(Boolean);

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>

      {/* Back button */}
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Text style={styles.backButtonText}>← CREW</Text>
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.scroll}>

        {/* ── Portrait header ── */}
        <View style={styles.portraitContainer}>
          {bustImage ? (
            <Image
              source={bustImage}
              style={styles.bustImage}
              resizeMode="contain"
            />
          ) : (
            <Text style={styles.portraitEmoji}>{member.emoji}</Text>
          )}
        </View>

        {/* ── Name + status ── */}
        <View style={styles.nameBlock}>
          <Text style={styles.name}>{member.name}</Text>
          <View style={styles.badgeRow}>
            <View style={[styles.statusBadge, { borderColor: statusCfg.color }]}>
              <Text style={[styles.statusBadgeText, { color: statusCfg.color }]}>
                {statusCfg.label}
              </Text>
            </View>
            <View style={[styles.moodBadge, { borderColor: moodColor }]}>
              <View style={[styles.moodDot, { backgroundColor: moodColor }]} />
              <Text style={[styles.moodBadgeText, { color: moodColor }]}>
                {mood.toUpperCase()}
              </Text>
            </View>
          </View>
          {member.absenceHeists > 0 && (
            <Text style={styles.absenceNote}>
              {member.absenceHeists} heist{member.absenceHeists !== 1 ? 's' : ''} until return
            </Text>
          )}
        </View>

        {/* ── Bio ── */}
        <SectionCard title="BACKGROUND">
          <Text style={styles.bioText}>{staticMember.bio}</Text>
        </SectionCard>

        {/* ── Ability ── */}
        <SectionCard title="ABILITY">
          <Text style={styles.abilityName}>
            {isPassive ? 'PASSIVE' : staticMember.abilityLabel.toUpperCase()}
          </Text>
          {staticMember.abilitySubtitle && (
            <Text style={styles.abilitySubtitle}>{staticMember.abilitySubtitle}</Text>
          )}
          <Text style={styles.bioText}>{staticMember.abilityJustification}</Text>
        </SectionCard>

        {/* ── Stats ── */}
        <SectionCard title="RECORD">
          <StatRow label="Heists participated" value={heistsParticipated} />
          {!isPassive && (
            <>
              <StatRow
                label="Ability uses"
                value={abilityUses}
              />
              <StatRow
                label="Essential heists"
                value={essentialUses}
                sub={essentialRate}
              />
            </>
          )}
          <StatRow label="Loyalty banked" value={member.loyalty} />
          <StatRow label="Cover blown at" value={blownLocations.length === 0 ? 'Nowhere' : `${blownLocations.length} location${blownLocations.length !== 1 ? 's' : ''}`} />
        </SectionCard>

        {/* ── Blown locations ── */}
        {blownLocations.length > 0 && (
          <SectionCard title="COVER BLOWN">
            {blownLocations.map((loc, i) => (
              <View key={i} style={[styles.locationRow, i < blownLocations.length - 1 && styles.locationRowBorder]}>
                <Text style={styles.locationIcon}>🚨</Text>
                <Text style={styles.locationText}>{loc}</Text>
              </View>
            ))}
          </SectionCard>
        )}

        {/* ── Accolades ── */}
        {!isPassive && accolades.length > 0 && (
          <SectionCard title="ACCOLADES">
            <Text style={styles.accoladesIntro}>
              Heists cracked with {staticMember.name}'s help
            </Text>
            {accolades.map((a, i) => (
              <View key={i} style={[styles.locationRow, i < accolades.length - 1 && styles.locationRowBorder]}>
                <Text style={styles.locationIcon}>★</Text>
                <View style={styles.accoladeContent}>
                  <Text style={styles.locationText}>{a.target}</Text>
                  <Text style={styles.accoladeCity}>{a.city}</Text>
                </View>
              </View>
            ))}
          </SectionCard>
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
  backButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backButtonText: {
    fontFamily: FONTS.label,
    fontSize: 12,
    color: COLORS.gold,
    letterSpacing: 1,
  },
  scroll: {
    paddingBottom: 40,
  },

  // ── Portrait ─────────────────────────────────────────────────────────────
  portraitContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 0.85,
    alignItems: 'center',
    justifyContent: 'flex-end',
    backgroundColor: COLORS.primaryDark,
    marginBottom: 4,
  },
  bustImage: {
    width: SCREEN_WIDTH * 0.65,
    height: SCREEN_WIDTH * 0.85,
  },
  portraitEmoji: {
    fontSize: 100,
    marginBottom: 16,
  },

  // ── Name block ───────────────────────────────────────────────────────────
  nameBlock: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 8,
  },
  name: {
    fontFamily: FONTS.displayHeavy,
    fontSize: 32,
    color: COLORS.cream,
    letterSpacing: 0.5,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
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
  moodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  moodDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  moodBadgeText: {
    fontFamily: FONTS.label,
    fontSize: 10,
    letterSpacing: 1,
  },
  absenceNote: {
    fontFamily: FONTS.mono,
    fontSize: 12,
    color: COLORS.muted,
    fontStyle: 'italic',
  },

  // ── Cards ────────────────────────────────────────────────────────────────
  card: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginHorizontal: 20,
    marginTop: 12,
    padding: 16,
    gap: 8,
  },
  cardTitle: {
    fontFamily: FONTS.label,
    fontSize: 10,
    color: COLORS.muted,
    letterSpacing: 2,
    marginBottom: 4,
  },
  bioText: {
    fontFamily: FONTS.mono,
    fontSize: 14,
    color: COLORS.cream,
    lineHeight: 22,
    fontStyle: 'italic',
  },
  abilityName: {
    fontFamily: FONTS.label,
    fontSize: 14,
    color: COLORS.gold,
    letterSpacing: 1,
  },
  abilitySubtitle: {
    fontFamily: FONTS.mono,
    fontSize: 13,
    color: '#4FC3F7',
    marginTop: 2,
    marginBottom: 6,
  },

  // ── Stats ────────────────────────────────────────────────────────────────
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  statLabel: {
    fontFamily: FONTS.mono,
    fontSize: 13,
    color: COLORS.cream,
  },
  statRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  statValue: {
    fontFamily: FONTS.monoBold,
    fontSize: 16,
    color: COLORS.goldLight,
    letterSpacing: 0.5,
  },
  statSub: {
    fontFamily: FONTS.mono,
    fontSize: 11,
    color: COLORS.muted,
    fontStyle: 'italic',
  },

  // ── Blown locations ──────────────────────────────────────────────────────
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  locationRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  locationIcon: {
    fontSize: 14,
  },
  locationText: {
    fontFamily: FONTS.mono,
    fontSize: 13,
    color: COLORS.cream,
    flex: 1,
  },
  accoladesIntro: {
    fontFamily: FONTS.mono,
    fontSize: 12,
    color: COLORS.muted,
    fontStyle: 'italic',
    marginBottom: 10,
  },
  accoladeContent: {
    flex: 1,
    gap: 2,
  },
  accoladeCity: {
    fontFamily: FONTS.mono,
    fontSize: 11,
    color: COLORS.muted,
  },
});

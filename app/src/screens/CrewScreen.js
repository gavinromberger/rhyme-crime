import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';
import { useGameState, getMood } from '../context/GameStateContext';
import ThermometerBar from '../components/ThermometerBar';
import CrewPortrait from '../components/CrewPortrait';

const MOOD_COLORS = {
  loyal: COLORS.greenSafe,
  irritated: COLORS.goldLight,
  angry: COLORS.gold,
  furious: '#E8824A',
  mutinous: COLORS.redThreat,
};

const STATUS_CONFIG = {
  ready:       {
    label: 'READY',
    color: COLORS.greenSafe,
    borderColor: COLORS.greenSafe,
    explanation: 'Available for the next heist. Their ability can be used during gameplay.',
  },
  vacation:    {
    label: 'VACATION',
    color: '#E8C97A',
    borderColor: '#E8C97A',
    explanation: 'Taking a voluntary break after using their ability. They\'ll be back once enough heists have passed.',
  },
  laying_low:  {
    label: 'LAYING LOW',
    color: '#E8824A',
    borderColor: '#E8824A',
    explanation: 'Keeping a low profile after getting caught. Too hot to work right now — wait for things to cool down.',
  },
  cover_blown: {
    label: 'COVER BLOWN',
    color: '#E84040',
    borderColor: '#E84040',
    explanation: 'Their identity was compromised at a specific location. They can\'t return there unless their loyalty is spent to hire the Master of Disguise.',
  },
  gone_awol: {
    label: 'TILTED',
    color: COLORS.redThreat,
    borderColor: COLORS.redThreat,
    explanation: 'They\'ve had enough. One too many disasters pushed them over a line and they\'ve gone dark — not responding, not showing up. They\'ll come back once you prove you can run a clean job. Count is in successful heists only.',
  },
};

const MOOD_EXPLANATIONS = {
  loyal:     'Everything is fine. They\'re committed to the crew and ready to work.',
  irritated: 'A few too many close calls. They\'re grumbling but still showing up.',
  angry:     'They\'re seriously unhappy. Expect complaints and demands for a bigger cut.',
  furious:   'One more mistake and they walk. Handle with care.',
  mutinous:  'They\'re on the verge of leaving the crew entirely. Complete a clean heist or lose them.',
};


function CrewMemberCard({ member, onPress }) {
  const mood = getMood(member.incidents);
  const moodColor = MOOD_COLORS[mood] ?? COLORS.muted;
  const statusCfg = STATUS_CONFIG[member.status] ?? STATUS_CONFIG.ready;
  const isPassive = member.id === 'handler' || member.id === 'courier';

  const statusDetail = () => {
    if (member.status === 'gone_awol') {
      return `${member.absenceHeists} successful heist${member.absenceHeists !== 1 ? 's' : ''} to return`;
    }
    if (member.status === 'vacation' || member.status === 'laying_low') {
      return `${member.absenceHeists} heist${member.absenceHeists !== 1 ? 's' : ''} remaining`;
    }
    if (member.status === 'cover_blown') {
      return `Cover blown at ${member.levelBusts.length} location${member.levelBusts.length !== 1 ? 's' : ''}`;
    }
    if (member.loyalty > 0) return `${member.loyalty} loyalty banked`;
    return null;
  };

  return (
    <TouchableOpacity style={cardStyles.card} onPress={onPress} activeOpacity={0.75}>
      {/* Header row */}
      <View style={cardStyles.header}>
        <CrewPortrait memberId={member.id} emoji={member.emoji} size={44} />
        <View style={cardStyles.headerInfo}>
          <View style={cardStyles.nameRow}>
            <Text style={cardStyles.name}>{member.name}</Text>
            <View style={[cardStyles.moodDot, { backgroundColor: moodColor }]} />
          </View>
          <Text style={cardStyles.ability}>
            {isPassive ? 'Passive — always active when present' : member.abilityDescription}
          </Text>
        </View>
        <TouchableOpacity
          style={[cardStyles.statusBadge, { borderColor: statusCfg.borderColor }]}
          onPress={() => Alert.alert(statusCfg.label, statusCfg.explanation)}
          activeOpacity={0.7}
        >
          <Text style={[cardStyles.statusText, { color: statusCfg.color }]}>
            {statusCfg.label}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Grievance thermometer */}
      <ThermometerBar
        fromIncidents={0}
        toIncidents={member.incidents}
        delay={200}
        animDuration={700}
        bgColor={COLORS.cardBg}
        showLabels
      />

      {/* Mood + detail row */}
      <View style={cardStyles.footerRow}>
        <TouchableOpacity
          onPress={() => Alert.alert(
            mood.charAt(0).toUpperCase() + mood.slice(1),
            MOOD_EXPLANATIONS[mood] ?? 'Current mood state.'
          )}
          activeOpacity={0.7}
        >
          <Text style={[cardStyles.moodLabel, { color: moodColor }]}>
            {mood.charAt(0).toUpperCase() + mood.slice(1)} ⓘ
          </Text>
        </TouchableOpacity>
        {statusDetail() && (
          <Text style={cardStyles.statusDetail}>{statusDetail()}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginBottom: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  },
  portrait: { marginTop: 2 },
  headerInfo: { flex: 1, gap: 4 },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  name: {
    fontFamily: FONTS.label,
    fontSize: 14,
    color: COLORS.cream,
    letterSpacing: 0.5,
  },
  moodDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  ability: {
    fontFamily: FONTS.mono,
    fontSize: 13,
    color: COLORS.muted,
    fontStyle: 'italic',
    lineHeight: 16,
  },
  statusBadge: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontFamily: FONTS.label,
    fontSize: 10,
    letterSpacing: 1,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  moodLabel: {
    fontFamily: FONTS.label,
    fontSize: 11,
    letterSpacing: 0.5,
  },
  statusDetail: {
    fontFamily: FONTS.mono,
    fontSize: 12,
    color: COLORS.muted,
    fontStyle: 'italic',
  },
});

export default function CrewScreen({ navigation }) {
  const { getAllCrew } = useGameState();
  const crew = getAllCrew();

  const readyCount = crew.filter(m => m.status === 'ready').length;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.subtitle}>THE CREW</Text>
        <Text style={styles.eyebrow}>
          {readyCount} of {crew.length} ready
        </Text>

        <View style={styles.legendRow}>
          {[
            { label: 'READY',       color: COLORS.greenSafe,   explanation: STATUS_CONFIG.ready.explanation },
            { label: 'VACATION',    color: '#E8C97A',           explanation: STATUS_CONFIG.vacation.explanation },
            { label: 'LAYING LOW',  color: '#E8824A',           explanation: STATUS_CONFIG.laying_low.explanation },
            { label: 'TILTED',      color: COLORS.redThreat,    explanation: STATUS_CONFIG.gone_awol.explanation },
          ].map(item => (
            <TouchableOpacity
              key={item.label}
              style={styles.legendItem}
              onPress={() => Alert.alert(item.label, item.explanation)}
              activeOpacity={0.7}
            >
              <View style={[styles.legendDot, { backgroundColor: item.color }]} />
              <Text style={[styles.legendLabel, { color: item.color }]}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.divider} />

        {crew.map(member => (
          <CrewMemberCard
            key={member.id}
            member={member}
            onPress={() => navigation.navigate('CrewMemberDetail', { memberId: member.id })}
          />
        ))}
      </ScrollView>
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
    paddingBottom: 40,
  },
  eyebrow: {
    fontFamily: FONTS.label,
    fontSize: 11,
    color: COLORS.muted,
    letterSpacing: 2,
    marginBottom: 4,
    marginTop: 8,
  },
  subtitle: {
    fontFamily: FONTS.displayHeavy,
    fontSize: 27,
    color: COLORS.cream,
    marginBottom: 14,
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legendLabel: {
    fontFamily: FONTS.label,
    fontSize: 9,
    letterSpacing: 1,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginBottom: 16,
  },
});

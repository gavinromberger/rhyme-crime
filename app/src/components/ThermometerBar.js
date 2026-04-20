import React, { useRef, useEffect, useState } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';
import { getMood, getMoodIndex, MOOD_THRESHOLDS, MAX_INCIDENTS } from '../context/GameStateContext';

const MOOD_COLORS = {
  loyal:     '#27AE60',
  irritated: '#E8C97A',
  angry:     '#C9A84C',
  furious:   '#E8824A',
  mutinous:  '#C0392B',
};

const GRADIENT = ['#27AE60', '#E8C97A', '#C9A84C', '#E8824A', '#C0392B'];

// Nodes sit at their threshold fractions of MAX_INCIDENTS
// so Mutinous lands at 12/14 ≈ 86%, leaving tail room
const NODES = [
  { mood: 'loyal',     frac: 0 },
  { mood: 'irritated', frac: MOOD_THRESHOLDS.irritated / MAX_INCIDENTS },
  { mood: 'angry',     frac: MOOD_THRESHOLDS.angry     / MAX_INCIDENTS },
  { mood: 'furious',   frac: MOOD_THRESHOLDS.furious   / MAX_INCIDENTS },
  { mood: 'mutinous',  frac: MOOD_THRESHOLDS.mutinous  / MAX_INCIDENTS },
];

const SIZES = {
  normal:  { ringOuter: 24, ringInner: 14, node: 11, track: 4, marginV: 10 },
  compact: { ringOuter: 16, ringInner:  9, node:  8, track: 3, marginV:  6 },
};

export default function ThermometerBar({
  fromIncidents = 0,
  toIncidents   = 0,
  delay         = 0,
  animDuration  = 600,
  bgColor       = COLORS.cardBg,
  compact       = false,
  showLabels    = false,
}) {
  const sz = compact ? SIZES.compact : SIZES.normal;

  const fromFrac = Math.min(Math.max(fromIncidents / MAX_INCIDENTS, 0), 1);
  const toFrac   = Math.min(Math.max(toIncidents   / MAX_INCIDENTS, 0), 1);

  const currentMood    = getMood(toIncidents);
  const currentMoodIdx = getMoodIndex(currentMood);
  const activeColor    = MOOD_COLORS[currentMood] ?? '#27AE60';

  // Measure the track's pixel width so we can set the inner gradient to full width
  const [trackWidth, setTrackWidth] = useState(0);

  const anim = useRef(new Animated.Value(fromFrac)).current;

  useEffect(() => {
    const t = setTimeout(() => {
      Animated.timing(anim, {
        toValue:  toFrac,
        duration: animDuration,
        useNativeDriver: false,
      }).start();
    }, delay);
    return () => clearTimeout(t);
  }, [toFrac]);

  // Animate in pixels so the inner gradient can be fixed full-width
  const fillWidthPx = trackWidth > 0
    ? anim.interpolate({ inputRange: [0, 1], outputRange: [0, trackWidth] })
    : 0;

  const trackTop = (sz.ringOuter - sz.track) / 2;
  const nodeTop  = (sz.ringOuter - sz.node)  / 2;

  return (
    <View style={{ marginVertical: sz.marginV }}>

      {/* ── Optional labels row ── */}
      {showLabels && (
        <View style={{ position: 'relative', height: 13, marginBottom: 3 }}>
          {NODES.map((node) => (
            <Text
              key={node.mood}
              style={{
                position: 'absolute',
                left: `${node.frac * 100}%`,
                fontFamily: FONTS.label,
                fontSize: 8,
                color: COLORS.muted,
                letterSpacing: 0.3,
                transform: [{ translateX: node.frac === 0 ? 0 : -10 }],
              }}
            >
              {node.mood.charAt(0).toUpperCase() + node.mood.slice(1)}
            </Text>
          ))}
        </View>
      )}

      {/* ── Bar ── */}
      <View style={{ position: 'relative', height: sz.ringOuter, overflow: 'visible' }}>

      {/* ── Track: muted gradient always fills the full bar ── */}
      <View
        onLayout={e => setTrackWidth(e.nativeEvent.layout.width)}
        style={{
          position: 'absolute', top: trackTop, left: 0, right: 0,
          height: sz.track, borderRadius: sz.track / 2,
          overflow: 'hidden',
        }}
      >
        {/* Muted (dim) full gradient — always visible */}
        <LinearGradient
          colors={GRADIENT}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[StyleSheet.absoluteFill, { opacity: 0.3 }]}
        />

        {/* Bright gradient — clips to fill width, but the gradient itself
            spans the full track width so the revealed colour matches position */}
        {trackWidth > 0 && (
          <Animated.View style={{
            position: 'absolute', top: 0, bottom: 0, left: 0,
            width: fillWidthPx,
            overflow: 'hidden',
          }}>
            <LinearGradient
              colors={GRADIENT}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: trackWidth }}
            />
          </Animated.View>
        )}
      </View>

      {/* ── Active bulb — sits at the exact animated fill position ── */}
      <Animated.View style={{
        position: 'absolute', top: 0,
        left: trackWidth > 0
          ? fillWidthPx
          : `${toFrac * 100}%`,
        width: sz.ringOuter, height: sz.ringOuter,
        borderRadius: sz.ringOuter / 2,
        borderWidth: compact ? 1.5 : 2,
        borderColor: activeColor,
        backgroundColor: bgColor,
        alignItems: 'center', justifyContent: 'center',
        transform: [{ translateX: -(sz.ringOuter / 2) }],
      }}>
        <View style={{
          width: sz.ringInner, height: sz.ringInner,
          borderRadius: sz.ringInner / 2,
          backgroundColor: activeColor,
        }} />
      </Animated.View>

      {/* ── Threshold nodes (hollow rings only — no active state here) ── */}
      {NODES.map((node, idx) => {
        const nodeColor = MOOD_COLORS[node.mood];
        const isPast    = idx < currentMoodIdx;
        const isCurrent = idx === currentMoodIdx;
        const leftPct   = `${node.frac * 100}%`;

        if (isCurrent) {
          // Render a small filled dot at the threshold so it stays visible
          // behind/around the animated active bulb
          return (
            <View
              key={node.mood}
              style={{
                position: 'absolute', top: nodeTop, left: leftPct,
                width: sz.node, height: sz.node,
                borderRadius: sz.node / 2,
                backgroundColor: nodeColor,
                transform: [{ translateX: -(sz.node / 2) }],
              }}
            />
          );
        }

        if (isPast) {
          return (
            <View
              key={node.mood}
              style={{
                position: 'absolute', top: nodeTop, left: leftPct,
                width: sz.node, height: sz.node,
                borderRadius: sz.node / 2,
                backgroundColor: nodeColor,
                transform: [{ translateX: -(sz.node / 2) }],
              }}
            />
          );
        }

        return (
          <View
            key={node.mood}
            style={{
              position: 'absolute', top: nodeTop, left: leftPct,
              width: sz.node, height: sz.node,
              borderRadius: sz.node / 2,
              backgroundColor: bgColor,
              borderWidth: compact ? 1.5 : 2,
              borderColor: COLORS.border,
              transform: [{ translateX: -(sz.node / 2) }],
            }}
          />
        );
      })}

      </View>{/* end bar */}
    </View>
  );
}

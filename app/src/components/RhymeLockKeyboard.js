import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';

const ROW1 = ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'];
const ROW2 = ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'];
const ROW3 = ['z', 'x', 'c', 'v', 'b', 'n', 'm'];

// Row 2 (9 keys): margin keeps key widths matching the 10-key top row.
// Row 3 (7 letters + ⌫ at flex 1.5): margin tuned so letter keys stay ~same width.
const ROW2_MARGIN = 18;
const ROW3_MARGIN = 28;

export default function RhymeLockKeyboard({
  onKeyPress,
  eliminatedKeys = new Set(),
  highlightedKeys = new Set(),
  disabled = false,
}) {
  const letterKey = (letter) => {
    const upper = letter.toUpperCase();
    const isElim = eliminatedKeys.has(upper);
    const isHighlighted = !isElim && highlightedKeys.has(upper);
    return (
      <TouchableOpacity
        key={letter}
        style={[styles.key, isElim && styles.keyElim, isHighlighted && styles.keyHighlighted]}
        onPress={() => onKeyPress(upper)}
        disabled={disabled || isElim}
        activeOpacity={0.5}
      >
        <Text style={[styles.keyText, isElim && styles.keyTextElim, isHighlighted && styles.keyTextHighlighted]}>
          {letter}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.keyboard}>
      {/* Row 1 — 10 keys */}
      <View style={styles.row}>
        {ROW1.map(letterKey)}
      </View>

      {/* Row 2 — 9 keys */}
      <View style={[styles.row, { marginHorizontal: ROW2_MARGIN }]}>
        {ROW2.map(letterKey)}
      </View>

      {/* Row 3 — 7 letters + ⌫ */}
      <View style={[styles.row, { marginHorizontal: ROW3_MARGIN }]}>
        {ROW3.map(letterKey)}
        <TouchableOpacity
          style={[styles.key, styles.keyBackspace]}
          onPress={() => onKeyPress('BACKSPACE')}
          disabled={disabled}
          activeOpacity={0.5}
        >
          <Text style={styles.keyText}>⌫</Text>
        </TouchableOpacity>
      </View>

      {/* Bottom row — space + enter */}
      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.key, styles.keySpace]}
          onPress={() => onKeyPress('SPACE')}
          disabled={disabled}
          activeOpacity={0.5}
        >
          <Text style={styles.keySpecialText}>space</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.key, styles.keyEnter]}
          onPress={() => onKeyPress('ENTER')}
          disabled={disabled}
          activeOpacity={0.5}
        >
          <Text style={styles.keySpecialText}>return</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  keyboard: {
    backgroundColor: COLORS.primaryDark,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingHorizontal: 6,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 5,
  },
  key: {
    flex: 1,
    height: 46,
    backgroundColor: COLORS.cardBg,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyElim: {
    backgroundColor: COLORS.redThreat + '18',
    borderColor: COLORS.redThreat + '44',
  },
  keyHighlighted: {
    backgroundColor: COLORS.greenSafe + '22',
    borderColor: COLORS.greenSafe,
  },
  keyText: {
    fontFamily: FONTS.label,
    fontSize: 16,
    color: COLORS.cream,
  },
  keyTextElim: {
    color: COLORS.redThreat,
    opacity: 0.55,
    textDecorationLine: 'line-through',
  },
  keyTextHighlighted: {
    color: COLORS.greenSafe,
  },
  keySpecialText: {
    fontFamily: FONTS.label,
    fontSize: 11,
    color: COLORS.muted,
    letterSpacing: 0.5,
  },
  keySpace: {
    flex: 4,
  },
  keyEnter: {
    flex: 2,
  },
  keyBackspace: {
    flex: 1.5,
  },
});

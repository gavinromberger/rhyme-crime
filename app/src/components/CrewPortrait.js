/**
 * CrewPortrait
 *
 * Renders a crew member's face portrait if artwork exists in CREW_IMAGES,
 * otherwise falls back to their emoji. Drop-in replacement wherever a crew
 * emoji Text was previously used.
 *
 * Props:
 *   memberId  — crew member id string (e.g. 'distractor')
 *   emoji     — fallback emoji character
 *   size      — diameter in dp (image) / drives fontSize for emoji fallback
 *   style     — optional extra styles applied to both variants
 */
import React from 'react';
import { Image, Text } from 'react-native';

// Static requires — Metro needs these to be literal at parse time.
// Add an entry here when new crew art is available.
const PORTRAITS = {
  distractor: require('../../assets/crew/distractor-face-transparent.png'),
};

export default function CrewPortrait({ memberId, emoji, size = 24, style }) {
  const image = PORTRAITS[memberId];

  if (image) {
    return (
      <Image
        source={image}
        style={[{ width: size, height: size, borderRadius: size / 2 }, style]}
      />
    );
  }

  return (
    <Text style={[{ fontSize: size * 0.75, textAlign: 'center' }, style]}>
      {emoji}
    </Text>
  );
}

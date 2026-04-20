import React from 'react';
import { Image, StyleSheet } from 'react-native';
import { getHeistImage } from '../data/heistImages';

/**
 * Renders the heist target image, falling back to the trophy placeholder.
 *
 * Props:
 *   target     — the heist target string (e.g. "Mona Lisa")
 *   style      — style applied to the Image (should include width + height)
 *   resizeMode — default 'contain' (suits transparent PNGs)
 */
export default function HeistImage({ target, style, resizeMode = 'contain' }) {
  const source = getHeistImage(target);
  return (
    <Image
      source={source}
      style={[styles.image, style]}
      resizeMode={resizeMode}
    />
  );
}

const styles = StyleSheet.create({
  image: {
    width: '100%',
    height: '100%',
  },
});

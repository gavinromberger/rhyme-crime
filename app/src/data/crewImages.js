/**
 * Static image map for crew portraits.
 * React Native requires static require() calls — dynamic paths don't work.
 * Add entries here as crew portrait art is added.
 *
 * face — circular portrait for the crew card (480×480, transparent bg)
 * bust — upper-body illustration for ability activation moments (880×925, transparent bg)
 * full — full-body art for character screens / vault
 */
// Full image sets per crew member (face, bust, full).
// The face image is also registered in CrewPortrait.js for direct use in components.
export const CREW_IMAGES = {
  distractor: {
    face: require('../../assets/crew/distractor-face-transparent.png'),
    bust: require('../../assets/crew/distractor-bust-transparent.png'),
    full: require('../../assets/crew/distractor.png'),
  },
};

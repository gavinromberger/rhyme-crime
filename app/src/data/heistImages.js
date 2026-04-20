// Static require map for heist target images (transparent background versions).
// Key = target name lowercased with spaces/punctuation replaced by underscores.
// Add an entry here whenever a new image lands in assets/heists/.

export const HEIST_IMAGES = {
  mona_lisa:                          require('../../assets/heists/mona_lisa-transparent.png'),
  crown_of_louis_xv:                  require('../../assets/heists/crown_of_louis_xv-transparent.png'),
  lindisfarne_gospels:                require('../../assets/heists/lindisfarne_gospels-transparent.png'),
  golden_death_mask_of_tutankhamun:   require('../../assets/heists/golden_death_mask_of_tutankhamun-transparent.png'),
  rosetta_stone:                      require('../../assets/heists/rosetta_stone-transparent.png'),
  antikythera_mechanism:              require('../../assets/heists/antikythera_mechanism-transparent.png'),
};

export const HEIST_PLACEHOLDER = require('../../assets/heists/trophy-placeholder.png');

// Normalise a target string to the key format used above.
function normalise(target) {
  return target
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

export function getHeistImage(target) {
  return HEIST_IMAGES[normalise(target)] ?? HEIST_PLACEHOLDER;
}

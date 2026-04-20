export const BASE_XP = {
  misdemeanor: 10,
  felony: 25,
  'most-wanted': 50,
  'public-enemy': 100,
};

export function calculateXPFromBase(baseXP, wrongCount, hintsUsed) {
  let modifier;
  if (wrongCount === 0 && hintsUsed === 0) {
    modifier = 2.0; // Ghost: +100%
  } else {
    modifier = 1.0;
    if (wrongCount === 0) modifier += 0.4;
    else if (wrongCount === 1) modifier -= 0.1;
    else if (wrongCount === 2) modifier -= 0.2;
    else modifier -= 0.3;
    modifier -= hintsUsed * 0.05;
  }
  return Math.max(5, Math.round(baseXP * modifier));
}

// Legacy single-difficulty helper kept for compatibility
export function calculateXP(difficulty, wrongCount, hintsUsed) {
  return calculateXPFromBase(BASE_XP[difficulty] ?? 10, wrongCount, hintsUsed);
}

export function getPerformanceTitle(wrongCount, hintsUsed, bustsOccurred) {
  if (bustsOccurred) return 'HEAT MAGNET';
  if (wrongCount === 0 && hintsUsed === 0) return 'GHOST';
  if (wrongCount === 0) return 'PROFESSIONAL';
  return 'RECKLESS';
}

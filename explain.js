function classifyOverlap(value) {
  if (value > 0.42) return "strong";
  if (value > 0.26) return "moderate";
  return "weak";
}

function classifyCoupling(kc) {
  if (kc >= 3.5) return "high";
  if (kc >= 1.6) return "medium";
  return "low";
}

function classifyTempGap(deltaT) {
  if (deltaT >= 220) return "large";
  if (deltaT >= 90) return "moderate";
  return "small";
}

function formatDirection(direction) {
  return direction === "LR" ? "left to right" : "right to left";
}

export function buildLaySummary(state, model) {
  const overlapLabel = classifyOverlap(model.overlapInt);
  const couplingLabel = classifyCoupling(state.kc);
  const gapLabel = classifyTempGap(model.deltaT);
  const freqGap = Math.abs(state.freqL - state.freqR);
  const freqComment =
    freqGap < 0.08
      ? "Both sides are tuned to similar vibration frequency scales."
      : "The left and right frequency scales are separated, so synchronization is reduced.";
  const tempFilter = state.lowTemp
    ? "Low-temperature emphasis is ON, so high-frequency modes contribute less."
    : "Low-temperature emphasis is OFF, so a wider frequency range contributes.";
  const asymmetryComment =
    state.asymmetry === "symmetric"
      ? "The selected materials are symmetric."
      : "The selected asymmetry preset shifts material matching conditions.";

  return (
    `Current result shows a ${gapLabel} temperature gap with ${couplingLabel} coupling and ` +
    `${overlapLabel} spectral overlap. Heat flow is from ${formatDirection(state.direction)}. ` +
    `${tempFilter} ${asymmetryComment} ${freqComment} ` +
    `Net current magnitude is ${model.jMag.toFixed(3)} and conductance is ${model.kappa.toFixed(3)}.`
  );
}

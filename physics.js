export const MODEL_CONFIG = {
  wMax: 3.5,
  points: 150,
  lowTempFactorOn: 0.55,
};

export function getMaterialParams(preset) {
  if (preset === "symmetric") return { mL: 1, mR: 1, kL: 1, kR: 1 };
  if (preset === "mass") return { mL: 0.8, mR: 1.7, kL: 1, kR: 1 };
  if (preset === "spring") return { mL: 1, mR: 1, kL: 0.75, kR: 1.4 };
  return { mL: 0.75, mR: 1.9, kL: 0.7, kR: 1.5 };
}

function gaussian(x, mu, sigma) {
  const z = (x - mu) / sigma;
  return Math.exp(-0.5 * z * z);
}

export function computeConductanceAtCoupling(overlapFiltered, meanT, kc) {
  const kcBoost = 0.62 + 0.52 * Math.log(1 + kc);
  return overlapFiltered * kcBoost * (0.85 + meanT / 900);
}

export function computeSideAngularFrequency(params, side, freqScale, couplingScale) {
  const k = side === "L" ? params.kL : params.kR;
  const m = side === "L" ? params.mL : params.mR;
  return 4.8 * Math.sqrt(k / m) * freqScale * couplingScale;
}

export function computeModel(state) {
  const params = getMaterialParams(state.asymmetry);
  const deltaT = Math.max(0, state.thot - state.tcold);
  const meanT = (state.thot + state.tcold) / 2;
  const specL = [];
  const specR = [];
  const overlap = [];
  let overlapInt = 0;
  let overlapFiltered = 0;
  const dW = MODEL_CONFIG.wMax / MODEL_CONFIG.points;
  const wcL = Math.sqrt(params.kL / params.mL) * 1.5 * state.freqL;
  const wcR = Math.sqrt(params.kR / params.mR) * 1.5 * state.freqR;
  const sigL = 0.28 + 0.08 * (params.mL - 1) * (params.mL - 1);
  const sigR = 0.28 + 0.08 * (params.mR - 1) * (params.mR - 1);
  const tempScale = Math.max(0.35, meanT / 260);
  const lowFactor = state.lowTemp ? MODEL_CONFIG.lowTempFactorOn : 1.0;

  for (let i = 0; i <= MODEL_CONFIG.points; i += 1) {
    const w = (i / MODEL_CONFIG.points) * MODEL_CONFIG.wMax;
    const dl = gaussian(w, wcL, sigL);
    const dr = gaussian(w, wcR, sigR);
    const ov = Math.min(dl, dr);
    const filter = Math.exp(-w / tempScale) * lowFactor + (1 - lowFactor);
    specL.push({ w, y: dl });
    specR.push({ w, y: dr });
    overlap.push({ w, y: ov });
    overlapInt += ov * dW;
    overlapFiltered += ov * filter * dW;
  }

  const kappa = computeConductanceAtCoupling(overlapFiltered, meanT, state.kc);
  const jMag = kappa * deltaT * 0.07;
  const j = state.direction === "LR" ? jMag : -jMag;

  return {
    params,
    deltaT,
    meanT,
    specL,
    specR,
    overlap,
    overlapInt,
    overlapFiltered,
    kappa,
    j,
    jMag,
    wcL,
    wcR,
  };
}

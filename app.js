import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { computeConductanceAtCoupling, computeModel, computeSideAngularFrequency } from "./physics.js";

const refs = {
  thot: document.getElementById("thot"),
  tcold: document.getElementById("tcold"),
  kc: document.getElementById("kc"),
  freqL: document.getElementById("freqL"),
  freqR: document.getElementById("freqR"),
  asymmetry: document.getElementById("asymmetry"),
  thotVal: document.getElementById("thotVal"),
  tcoldVal: document.getElementById("tcoldVal"),
  kcVal: document.getElementById("kcVal"),
  freqLVal: document.getElementById("freqLVal"),
  freqRVal: document.getElementById("freqRVal"),
  jVal: document.getElementById("jVal"),
  kappaVal: document.getElementById("kappaVal"),
  overlapVal: document.getElementById("overlapVal"),
  symmetryVal: document.getElementById("symmetryVal"),
  explainBox: document.getElementById("explainBox"),
  lowTempBtn: document.getElementById("lowTempBtn"),
  resetBtn: document.getElementById("resetBtn"),
  leftRightBtn: document.getElementById("leftRightBtn"),
  rightLeftBtn: document.getElementById("rightLeftBtn"),
  spectralCaption: document.getElementById("spectralCaption"),
  kappaCaption: document.getElementById("kappaCaption"),
};

const charts = {
  spectral: document.getElementById("spectralChart").getContext("2d"),
  j: document.getElementById("jChart").getContext("2d"),
  kappa: document.getElementById("kappaChart").getContext("2d"),
  sym: document.getElementById("symChart").getContext("2d"),
};

const state = {
  thot: 320,
  tcold: 120,
  kc: 1.8,
  asymmetry: "symmetric",
  freqL: 1.0,
  freqR: 1.0,
  direction: "LR",
  lowTemp: false,
};

function getDefaultFreqScalesForPreset(preset) {
  if (preset === "symmetric") return { freqL: 1.0, freqR: 1.0 };
  if (preset === "mass") return { freqL: 1.12, freqR: 0.88 };
  if (preset === "spring") return { freqL: 0.9, freqR: 1.15 };
  return { freqL: 1.08, freqR: 0.92 };
}

function clearChart(ctx) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.fillStyle = "#091027";
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
}

function axes(ctx, yLabel) {
  const { width, height } = ctx.canvas;
  const left = 46;
  const right = width - 16;
  const top = 16;
  const bottom = height - 34;

  ctx.strokeStyle = "#314576";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(left, top);
  ctx.lineTo(left, bottom);
  ctx.lineTo(right, bottom);
  ctx.stroke();

  ctx.fillStyle = "#9fb1e7";
  ctx.font = "12px Syne";
  ctx.fillText("w / Delta T / k_c", right - 104, height - 10);
  ctx.save();
  ctx.translate(12, 18);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(yLabel, 0, 0);
  ctx.restore();

  for (let i = 1; i <= 4; i += 1) {
    const y = top + (i * (bottom - top)) / 5;
    ctx.strokeStyle = "rgba(97, 129, 208, 0.25)";
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(right, y);
    ctx.stroke();
  }
  return { left, right, top, bottom };
}

function drawCurve(ctx, pts, bounds, color, xMax = 1, yMax = 1, fill = false) {
  const { left, right, top, bottom } = bounds;
  const w = right - left;
  const h = bottom - top;
  ctx.beginPath();
  pts.forEach((p, i) => {
    const x = left + (p.x / xMax) * w;
    const y = bottom - (p.y / yMax) * h;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.1;
  ctx.stroke();
  if (fill) {
    ctx.lineTo(right, bottom);
    ctx.lineTo(left, bottom);
    ctx.closePath();
    ctx.fillStyle = color.replace("1)", "0.22)");
    ctx.fill();
  }
}

function renderSpectral(model) {
  const ctx = charts.spectral;
  clearChart(ctx);
  const b = axes(ctx, "Density");
  const pointsL = model.specL.map((p) => ({ x: p.w, y: p.y }));
  const pointsR = model.specR.map((p) => ({ x: p.w, y: p.y }));
  const pointsO = model.overlap.map((p) => ({ x: p.w, y: p.y }));
  drawCurve(ctx, pointsO, b, "rgba(248,214,109,1)", 3.5, 1.15, true);
  drawCurve(ctx, pointsL, b, "rgba(255,95,109,1)", 3.5, 1.15, false);
  drawCurve(ctx, pointsR, b, "rgba(77,178,255,1)", 3.5, 1.15, false);
}

function renderJ(model) {
  const ctx = charts.j;
  clearChart(ctx);
  const b = axes(ctx, "J");
  const points = [];
  for (let dt = 0; dt <= 380; dt += 8) {
    points.push({ x: dt, y: (model.kappa * dt * 0.07) / 100 });
  }
  drawCurve(ctx, points, b, "rgba(98,242,179,1)", 380, 7.5, false);
  const x = b.left + (model.deltaT / 380) * (b.right - b.left);
  const y = b.bottom - ((Math.abs(model.j) / 100) / 7.5) * (b.bottom - b.top);
  ctx.fillStyle = "#ffdf6f";
  ctx.beginPath();
  ctx.arc(x, y, 4.5, 0, Math.PI * 2);
  ctx.fill();
}

function renderKappa(model) {
  const ctx = charts.kappa;
  clearChart(ctx);
  const b = axes(ctx, "kappa");
  const points = [];
  for (let kc = 0.1; kc <= 5; kc += 0.08) {
    const kapp = computeConductanceAtCoupling(model.overlapFiltered, model.meanT, kc);
    points.push({ x: kc, y: kapp });
  }
  const yMax = Math.max(...points.map((p) => p.y)) * 1.1;
  drawCurve(ctx, points, b, "rgba(172,126,255,1)", 5, yMax, false);
  const x = b.left + ((state.kc - 0.1) / 4.9) * (b.right - b.left);
  const y = b.bottom - (model.kappa / yMax) * (b.bottom - b.top);
  ctx.fillStyle = "#ffdf6f";
  ctx.beginPath();
  ctx.arc(x, y, 4.5, 0, Math.PI * 2);
  ctx.fill();
}

function renderSymmetry(model) {
  const ctx = charts.sym;
  clearChart(ctx);
  const { width, height } = ctx.canvas;
  const max = Math.max(model.jMag, 0.001) * 1.25;
  const barW = 110;
  const baseline = height - 44;
  const leftX = 110;
  const rightX = 300;

  ctx.fillStyle = "#9fb1e7";
  ctx.font = "12px Syne";
  ctx.fillText("Magnitude comparison", 18, 22);
  ctx.strokeStyle = "#314576";
  ctx.beginPath();
  ctx.moveTo(30, baseline);
  ctx.lineTo(width - 25, baseline);
  ctx.stroke();

  const h1 = (model.jMag / max) * 150;
  const h2 = (model.jMag / max) * 150;

  ctx.fillStyle = "rgba(255,95,109,0.85)";
  ctx.fillRect(leftX, baseline - h1, barW, h1);
  ctx.fillStyle = "rgba(77,178,255,0.85)";
  ctx.fillRect(rightX, baseline - h2, barW, h2);

  ctx.fillStyle = "#d5e1ff";
  ctx.fillText("L->R", leftX + 34, baseline + 16);
  ctx.fillText("R->L", rightX + 34, baseline + 16);
  ctx.fillText("equal |J|", width / 2 - 24, 36);
}

function explain(model) {
  const overlapDesc =
    model.overlapInt > 0.4
      ? "strong spectral compatibility"
      : model.overlapInt > 0.24
        ? "moderate spectral compatibility"
        : "weak spectral compatibility";
  const lowTText = state.lowTemp
    ? "Low-temperature emphasis is on, so higher-frequency matches are down-weighted."
    : "All relevant frequencies are weighted more evenly.";
  refs.explainBox.textContent =
    "Current setup shows " +
    overlapDesc +
    ". " +
    lowTText +
    " Reversing direction flips sign, not magnitude. In 3D, brighter red and stronger glow indicate hotter reservoir activity.";
}

function renderAll() {
  refs.thotVal.textContent = state.thot + " K";
  refs.tcoldVal.textContent = state.tcold + " K";
  refs.kcVal.textContent = Number(state.kc).toFixed(2);
  refs.freqLVal.textContent = Number(state.freqL).toFixed(2) + "x";
  refs.freqRVal.textContent = Number(state.freqR).toFixed(2) + "x";

  const model = computeModel(state);
  refs.jVal.textContent = model.j.toFixed(3);
  refs.kappaVal.textContent = model.kappa.toFixed(3);
  refs.overlapVal.textContent = model.overlapInt.toFixed(3);
  refs.symmetryVal.textContent = "Yes";
  refs.spectralCaption.textContent =
    "Peak alignment shifts with asymmetry. Current centers: w_L=" +
    model.wcL.toFixed(2) +
    ", w_R=" +
    model.wcR.toFixed(2) +
    ".";
  refs.kappaCaption.textContent =
    "Increasing k_c raises transport coupling. Current k_c = " + state.kc.toFixed(2) + ".";

  explain(model);
  renderSpectral(model);
  renderJ(model);
  renderKappa(model);
  renderSymmetry(model);

  updateThree(model);
}

function bindControl(input, handler) {
  input.addEventListener("input", () => {
    handler();
    renderAll();
  });
}

bindControl(refs.thot, () => {
  state.thot = Number(refs.thot.value);
  if (state.thot <= state.tcold) {
    state.tcold = Math.max(5, state.thot - 1);
    refs.tcold.value = String(state.tcold);
  }
});

bindControl(refs.tcold, () => {
  state.tcold = Number(refs.tcold.value);
  if (state.tcold >= state.thot) {
    state.thot = Math.min(500, state.tcold + 1);
    refs.thot.value = String(state.thot);
  }
});

bindControl(refs.kc, () => {
  state.kc = Number(refs.kc.value);
});
bindControl(refs.freqL, () => {
  state.freqL = Number(refs.freqL.value);
});
bindControl(refs.freqR, () => {
  state.freqR = Number(refs.freqR.value);
});
bindControl(refs.asymmetry, () => {
  state.asymmetry = refs.asymmetry.value;
  const defaults = getDefaultFreqScalesForPreset(state.asymmetry);
  state.freqL = defaults.freqL;
  state.freqR = defaults.freqR;
  refs.freqL.value = defaults.freqL.toFixed(2);
  refs.freqR.value = defaults.freqR.toFixed(2);
});

refs.lowTempBtn.addEventListener("click", () => {
  state.lowTemp = !state.lowTemp;
  refs.lowTempBtn.textContent = "Low-T emphasis: " + (state.lowTemp ? "On" : "Off");
  refs.lowTempBtn.classList.toggle("active", state.lowTemp);
  renderAll();
});

refs.leftRightBtn.addEventListener("click", () => {
  state.direction = "LR";
  refs.leftRightBtn.classList.add("active");
  refs.rightLeftBtn.classList.remove("active");
  renderAll();
});

refs.rightLeftBtn.addEventListener("click", () => {
  state.direction = "RL";
  refs.rightLeftBtn.classList.add("active");
  refs.leftRightBtn.classList.remove("active");
  renderAll();
});

refs.resetBtn.addEventListener("click", () => {
  state.thot = 320;
  state.tcold = 120;
  state.kc = 1.8;
  state.freqL = 1.0;
  state.freqR = 1.0;
  state.asymmetry = "symmetric";
  state.direction = "LR";
  state.lowTemp = false;
  refs.thot.value = "320";
  refs.tcold.value = "120";
  refs.kc.value = "1.8";
  refs.freqL.value = "1.0";
  refs.freqR.value = "1.0";
  refs.asymmetry.value = "symmetric";
  refs.lowTempBtn.textContent = "Low-T emphasis: Off";
  refs.lowTempBtn.classList.remove("active");
  refs.leftRightBtn.classList.add("active");
  refs.rightLeftBtn.classList.remove("active");
  renderAll();
});

document.querySelectorAll("[data-scenario]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const name = btn.getAttribute("data-scenario");
    if (name === "baseline") {
      refs.resetBtn.click();
    } else if (name === "coupling") {
      state.kc = 4.2;
      refs.kc.value = "4.2";
    } else if (name === "lowt") {
      state.thot = 90;
      state.tcold = 30;
      state.kc = 2.3;
      state.asymmetry = "both";
      state.lowTemp = true;
      refs.thot.value = "90";
      refs.tcold.value = "30";
      refs.kc.value = "2.3";
      refs.asymmetry.value = "both";
      refs.lowTempBtn.textContent = "Low-T emphasis: On";
      refs.lowTempBtn.classList.add("active");
    } else if (name === "reverse") {
      state.direction = state.direction === "LR" ? "RL" : "LR";
      refs.leftRightBtn.classList.toggle("active", state.direction === "LR");
      refs.rightLeftBtn.classList.toggle("active", state.direction === "RL");
    }
    renderAll();
  });
});

const three = initThree();

function initThree() {
  const canvas = document.getElementById("threeCanvas");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 60);
  camera.position.set(0.7, 1.9, 6.9);
  scene.add(camera);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.minDistance = 4.4;
  controls.maxDistance = 14;
  controls.maxPolarAngle = Math.PI * 0.48;
  controls.target.set(0, 0.15, 0);
  controls.update();

  scene.add(new THREE.AmbientLight(0x8ea4ff, 0.55));
  const key = new THREE.DirectionalLight(0xffffff, 1.0);
  key.position.set(4, 6, 7);
  scene.add(key);
  const fill = new THREE.PointLight(0x7be0ff, 1.0, 20);
  fill.position.set(-4, 1.5, 1);
  scene.add(fill);
  const hotLight = new THREE.PointLight(0xff5f6d, 1.2, 12);
  hotLight.position.set(-2.4, 0.6, 0.4);
  scene.add(hotLight);
  const coldLight = new THREE.PointLight(0x4db2ff, 0.7, 12);
  coldLight.position.set(2.4, 0.6, -0.4);
  scene.add(coldLight);

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(3.4, 3.8, 0.42, 40),
    new THREE.MeshStandardMaterial({
      color: 0x101a34,
      roughness: 0.9,
      metalness: 0.25,
      emissive: 0x0b1021,
    }),
  );
  base.position.y = -1.4;
  scene.add(base);

  const auraGeometry = new THREE.SphereGeometry(1.24, 32, 24);
  const hotAura = new THREE.Mesh(
    auraGeometry,
    new THREE.MeshBasicMaterial({ color: 0xff4f62, transparent: true, opacity: 0.2, depthWrite: false }),
  );
  hotAura.position.set(-2.3, 0, 0);
  scene.add(hotAura);
  const coldAura = new THREE.Mesh(
    auraGeometry,
    new THREE.MeshBasicMaterial({ color: 0x4db2ff, transparent: true, opacity: 0.16, depthWrite: false }),
  );
  coldAura.position.set(2.3, 0, 0);
  scene.add(coldAura);

  const barGeo = new THREE.CylinderGeometry(0.17, 0.17, 1.8, 18);
  const barHot = new THREE.Mesh(
    barGeo,
    new THREE.MeshStandardMaterial({ color: 0xff6a77, emissive: 0x70242a, metalness: 0.15, roughness: 0.4 }),
  );
  barHot.position.set(-3, -0.2, 0);
  scene.add(barHot);
  const barCold = new THREE.Mesh(
    barGeo,
    new THREE.MeshStandardMaterial({ color: 0x5bb8ff, emissive: 0x17365e, metalness: 0.15, roughness: 0.4 }),
  );
  barCold.position.set(3, -0.2, 0);
  scene.add(barCold);

  const spheres = [];
  const springLines = [];
  const lineMaterial = new THREE.LineBasicMaterial({ color: 0xf8d66d });
  const chainMaterialHot = new THREE.MeshStandardMaterial({ color: 0xff6b77, roughness: 0.3 });
  const chainMaterialCold = new THREE.MeshStandardMaterial({ color: 0x5ab8ff, roughness: 0.3 });
  const g = new THREE.SphereGeometry(0.19, 24, 24);

  for (let i = 0; i < 6; i += 1) {
    const xLeft = -2.3 + i * 0.45;
    const xRight = 0.3 + i * 0.45;
    const sL = new THREE.Mesh(g, chainMaterialHot);
    const sR = new THREE.Mesh(g, chainMaterialCold);
    sL.position.set(xLeft, 0, 0);
    sR.position.set(xRight, 0, 0);
    scene.add(sL, sR);
    spheres.push({ mesh: sL, side: "L", idx: i });
    spheres.push({ mesh: sR, side: "R", idx: i });
  }

  for (let i = 0; i < 5; i += 1) {
    const geoL = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-2.3 + i * 0.45, 0, 0),
      new THREE.Vector3(-2.3 + (i + 1) * 0.45, 0, 0),
    ]);
    const lineL = new THREE.Line(geoL, lineMaterial);
    scene.add(lineL);
    springLines.push({ line: lineL, side: "L", idx: i });

    const geoR = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0.3 + i * 0.45, 0, 0),
      new THREE.Vector3(0.3 + (i + 1) * 0.45, 0, 0),
    ]);
    const lineR = new THREE.Line(geoR, lineMaterial);
    scene.add(lineR);
    springLines.push({ line: lineR, side: "R", idx: i });
  }

  const bridge = new THREE.Mesh(
    new THREE.TorusGeometry(0.26, 0.06, 12, 30),
    new THREE.MeshStandardMaterial({ color: 0xf8d66d, emissive: 0x5a4a11, emissiveIntensity: 0.7 }),
  );
  bridge.rotation.y = Math.PI / 2;
  scene.add(bridge);

  const flowParticles = [];
  const pGeo = new THREE.SphereGeometry(0.05, 8, 8);
  for (let i = 0; i < 26; i += 1) {
    const p = new THREE.Mesh(pGeo, new THREE.MeshBasicMaterial({ color: 0xffffff }));
    p.position.set(-1 + (i / 25) * 2, 0.38 + Math.sin(i) * 0.1, -0.5 + Math.random());
    scene.add(p);
    flowParticles.push(p);
  }

  const size = () => {
    const wrap = canvas.parentElement;
    const w = wrap.clientWidth;
    const h = wrap.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  size();
  window.addEventListener("resize", size);

  return {
    renderer,
    scene,
    camera,
    controls,
    spheres,
    springLines,
    bridge,
    flowParticles,
    hotAura,
    coldAura,
    hotLight,
    coldLight,
    barHot,
    barCold,
  };
}

let latestModel = computeModel(state);
function updateThree(model) {
  latestModel = model;
}

function animate(timeMs) {
  const t = timeMs * 0.001;
  const tempAmpL = Math.min(0.42, latestModel.meanT / 1200 + state.thot / 1300);
  const tempAmpR = Math.min(0.42, latestModel.meanT / 1200 + state.tcold / 1300);
  const couplingScale = 0.75 + state.kc * 0.08;
  const omegaL = computeSideAngularFrequency(latestModel.params, "L", state.freqL, couplingScale);
  const omegaR = computeSideAngularFrequency(latestModel.params, "R", state.freqR, couplingScale);
  const hotNorm = THREE.MathUtils.clamp(state.thot / 500, 0, 1);
  const coldNorm = THREE.MathUtils.clamp(state.tcold / 500, 0, 1);
  const deltaNorm = THREE.MathUtils.clamp((state.thot - state.tcold) / 500, 0, 1);

  three.spheres.forEach((s) => {
    const amp = s.side === "L" ? tempAmpL : tempAmpR;
    const phase = s.idx * 0.55 + (s.side === "L" ? 0 : 0.7);
    const omega = s.side === "L" ? omegaL : omegaR;
    s.mesh.position.y = Math.sin(t * omega + phase) * amp;
    s.mesh.position.z = Math.cos(t * 2.4 + phase) * 0.08;
  });

  three.springLines.forEach((spr) => {
    const points = [];
    const base = spr.side === "L" ? -2.3 : 0.3;
    const x1 = base + spr.idx * 0.45;
    const x2 = base + (spr.idx + 1) * 0.45;
    const sideOmega = spr.side === "L" ? omegaL : omegaR;
    const sideAmp = spr.side === "L" ? tempAmpL : tempAmpR;
    const sidePhase = spr.side === "L" ? 0 : 0.7;
    const y1 = Math.sin(t * sideOmega + spr.idx * 0.55 + sidePhase) * sideAmp;
    const y2 = Math.sin(t * sideOmega + (spr.idx + 1) * 0.55 + sidePhase) * sideAmp;
    const segments = 18;
    for (let i = 0; i <= segments; i += 1) {
      const u = i / segments;
      const x = x1 + u * (x2 - x1);
      const y = y1 + u * (y2 - y1) + Math.sin(u * Math.PI * 8) * 0.06;
      points.push(new THREE.Vector3(x, y, 0));
    }
    spr.line.geometry.setFromPoints(points);
  });

  three.bridge.scale.setScalar(0.8 + state.kc * 0.16 + Math.sin(t * 4) * 0.06);
  three.bridge.material.emissiveIntensity = 0.4 + state.kc * 0.1 + deltaNorm * 0.45;

  three.hotAura.scale.setScalar(0.86 + hotNorm * 0.48 + Math.sin(t * 2.2) * 0.03);
  three.coldAura.scale.setScalar(0.86 + coldNorm * 0.48 + Math.cos(t * 2.2) * 0.03);
  three.hotAura.material.opacity = 0.09 + hotNorm * 0.22;
  three.coldAura.material.opacity = 0.06 + coldNorm * 0.18;
  three.hotLight.intensity = 0.5 + hotNorm * 2.0;
  three.coldLight.intensity = 0.4 + coldNorm * 1.5;
  three.barHot.scale.y = 0.5 + hotNorm * 1.0;
  three.barCold.scale.y = 0.5 + coldNorm * 1.0;
  three.barHot.position.y = -0.95 + three.barHot.scale.y * 0.75;
  three.barCold.position.y = -0.95 + three.barCold.scale.y * 0.75;

  const dir = state.direction === "LR" ? 1 : -1;
  three.flowParticles.forEach((p, i) => {
    const spd = 0.28 + latestModel.jMag * 0.0024 + deltaNorm * 0.28;
    let x = ((t * spd + i * 0.07) % 2.2) - 1.1;
    if (dir < 0) x *= -1;
    p.position.x = x;
    p.position.y = 0.35 + Math.sin(t * 5 + i) * 0.05 + Math.sin(t * 2 + i * 0.15) * 0.03;
    p.position.z = -0.45 + ((i % 7) / 6) * 0.9;
    const grad = THREE.MathUtils.clamp((x + 1.1) / 2.2, 0, 1);
    const hotColor = new THREE.Color(0xff955f);
    const coldColor = new THREE.Color(0x69c7ff);
    const color = dir > 0 ? hotColor.clone().lerp(coldColor, grad) : coldColor.clone().lerp(hotColor, grad);
    p.material.color.copy(color);
    p.scale.setScalar(0.7 + deltaNorm * 0.9);
  });

  three.controls.update();
  three.renderer.render(three.scene, three.camera);
  requestAnimationFrame(animate);
}

renderAll();
requestAnimationFrame(animate);

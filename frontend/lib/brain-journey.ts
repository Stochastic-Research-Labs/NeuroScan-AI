const smooth = (start: number, end: number, value: number) => {
  const t = Math.min(1, Math.max(0, (value - start) / (end - start)));
  return t * t * (3 - 2 * t);
};

/** Reversible, scroll-driven illustration. No biological scale or timing is implied. */
export function sampleBrainJourney(value: number) {
  const p = Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
  const enter = smooth(0.14, 0.32, p);
  const leave = smooth(0.48, 0.68, p);
  const neuron = enter * (1 - leave);
  const returnView = smooth(0.64, 1, p);
  return {
    progress: p,
    brainScale: 1.05 + 2.4 * smooth(0.04, 0.29, p) * (1 - smooth(0.51, 0.72, p)),
    brainOpacity: 1 - neuron,
    neuronOpacity: neuron,
    neuronScale: 0.65 + 0.35 * enter + 0.5 * leave,
    solid: (1 - neuron) * (1 - returnView),
    wire: (1 - neuron) * 0.055 * Math.sin(returnView * Math.PI),
    points: (1 - neuron) * returnView,
  };
}

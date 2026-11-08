// Pure component-support tests. No browser, API, patient data or network required.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const cache = new Map();
function load(file) {
  file = path.resolve(file);
  if (cache.has(file)) return cache.get(file);
  const module = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  vm.runInNewContext(source, { module, exports: module.exports, require: (name) => load(path.resolve(path.dirname(file), name + '.ts')) }, { filename: file });
  cache.set(file, module.exports);
  return module.exports;
}
const { validateUploadFiles: validate, canUploadStudy } = load(path.join(root, 'lib/upload-validation.ts'));
const { getAnatomyCategory } = load(path.join(root, 'lib/brain-model.ts'));
const { sampleBrainJourney: journey } = load(path.join(root, 'lib/brain-journey.ts'));
const { TUMOR_COLORS, getSegmentationColormap } = load(path.join(root, 'lib/segmentation-colors.ts'));
const files = ['t1', 't1ce', 't2', 'flair'].map((m) => ({ name: `BraTS2021_00621_${m}.nii.gz`, size: 1024 }));
const checks = [
  ['journey opens on the solid brain', () => { assert.equal(journey(0).solid, 1); assert.equal(journey(0).neuronOpacity, 0); }],
  ['journey magnifies the brain before revealing a neuron', () => assert.ok(journey(0.2).brainScale > journey(0).brainScale)],
  ['neuron is fully revealed at the middle stage', () => { assert.equal(journey(0.4).neuronOpacity, 1); assert.equal(journey(0.4).brainOpacity, 0); }],
  ['journey returns to original brain scale and points', () => { assert.equal(journey(1).brainScale, journey(0).brainScale); assert.equal(journey(1).points, 1); assert.equal(journey(1).neuronOpacity, 0); }],
  ['journey is deterministic and reversible', () => { const before = JSON.stringify(journey(0.25)); journey(0.9); assert.equal(JSON.stringify(journey(0.25)), before); }],
  ['journey clamps invalid and out-of-range progress', () => { assert.equal(journey(-1).progress, 0); assert.equal(journey(2).progress, 1); assert.equal(journey(NaN).progress, 0); }],
  ['journey opacity remains bounded across the entire scroll', () => { for (let i = 0; i <= 1000; i++) { const s = journey(i / 1000); for (const k of ['brainOpacity', 'neuronOpacity', 'solid', 'wire', 'points']) assert.ok(s[k] >= 0 && s[k] <= 1); } }],
  ['viewer and report class palettes match', () => {
    const backend = fs.readFileSync(path.join(root, '../backend/app/core/config.py'), 'utf8');
    for (const key of ['ncr', 'ed', 'et']) assert.ok(backend.includes(`"color": "${TUMOR_COLORS[key]}"`));
    assert.equal(getSegmentationColormap(['et']).A.join(','), '0,0,0,200');
  }],
  ['multi-material cortical mesh inherits category', () => assert.equal(getAnatomyCategory({ userData: {}, parent: { userData: { bx_cat: 'cortex' } } }), 'cortex')],
  ['mesh category takes precedence', () => assert.equal(getAnatomyCategory({ userData: { bx_cat: 'brainstem' }, parent: { userData: { bx_cat: 'cortex' } } }), 'brainstem')],
  ['plain replacement model has no atlas category', () => assert.equal(getAnatomyCategory({ userData: {} }), undefined)],
  ['complete study', () => assert.equal(validate(files), null)],
  ['named study can submit', () => assert.equal(canUploadStudy('Research 014', files, false), true)],
  ['blank name cannot submit', () => assert.equal(canUploadStudy('   ', files, false), false)],
  ['pending request cannot submit twice', () => assert.equal(canUploadStudy('Research 014', files, true), false)],
  ['empty selection', () => assert.match(validate([]), /four MRI/)],
  ['missing modality', () => assert.match(validate(files.slice(1)), /all four/)],
  ['optional reference mask', () => assert.equal(validate([...files, { name: 'case_seg.nii.gz', size: 10 }]), null)],
  ['single ZIP', () => assert.equal(validate([{ name: 'study.zip', size: 12 }]), null)],
  ['ZIP mixed with scans', () => assert.match(validate([...files, { name: 'study.zip', size: 12 }]), /by itself/)],
  ['unsupported 2D slice', () => assert.match(validate([{ name: 't1.png', size: 12 }]), /not supported/)],
  ['unrecognized name', () => assert.match(validate([...files, { name: 'scan.nii', size: 12 }]), /recognized/)],
  ['duplicate modality', () => assert.match(validate([...files, { name: 'other_t1.nii', size: 12 }]), /More than one/)],
  ['empty file', () => assert.match(validate([{ name: 'study.zip', size: 0 }]), /empty/)],
  ['proxy-safe file limit', () => assert.match(validate([{ name: 'study.zip', size: 121 * 1024 * 1024 }]), /120 MB/)],
  ['brain GLB integrity', () => { const b = fs.readFileSync(path.join(root, 'public/models/brain.glb')); assert.equal(b.toString('ascii', 0, 4), 'glTF'); assert.equal(b.readUInt32LE(4), 2); assert.equal(b.readUInt32LE(8), b.length); }],
  ['decoder present', () => assert.ok(fs.statSync(path.join(root, 'public/draco/draco_decoder.wasm')).size > 1000)],
  ['Poppins locally available', () => assert.ok(fs.existsSync(path.join(root, 'node_modules/@fontsource/poppins/files/poppins-latin-400-normal.woff2')))],
];
for (const [name, check] of checks) { check(); console.log(`PASS ${name}`); }
console.log(`${checks.length} checks passed.`);

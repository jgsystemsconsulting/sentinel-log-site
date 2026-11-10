// Export timeline.js → timeline.json for Python score/mix.
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { DUR, BPM, BEAT, BAR, S16, K, MOTIF, voiceScatter, voiceClean, CAPTIONS } from '../timeline.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const out = {
  dur: DUR,
  bpm: BPM,
  beat: BEAT,
  bar: BAR,
  s16: S16,
  K,
  motif: MOTIF,
  voiceScatter: voiceScatter(),
  voiceClean: voiceClean(),
  captions: CAPTIONS,
};
writeFileSync(join(HERE, '..', 'timeline.json'), JSON.stringify(out, null, 1));
console.log('timeline.json', out.voiceScatter.length, 'scatter', out.voiceClean.length, 'clean');

"""Film TTS: standard lines via Kokoro; L07 + lock-in-sample via forced en-gb phonemes."""
import json, os, sys
import numpy as np
import soundfile as sf

LIB = os.environ.get('LIB') or r'C:\Users\gower\lemo-opuscar'
sys.path.insert(0, LIB)
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
lines_path = os.path.join(HERE, 'lines.json')
out = os.path.join(HERE, 'voices')
os.makedirs(out, exist_ok=True)

from kokoro_onnx import Kokoro  # noqa: E402
TTS = os.path.join(LIB, 'core', 'tts')
k = Kokoro(os.path.join(TTS, 'kokoro-v1.0.onnx'), os.path.join(TTS, 'voices-v1.0.bin'))

# Full L07 with stress; lock-in forced as lˈɒk ˈɪn (short ɒ + break)
L07_PH = "sˈɛlf hˈəʊstɪd. ˈəʊpən sˈɔːs. ˈɒn pɹˈɛm ɔː ˈeə ɡˈapt. nˈəʊ lˈɒk ˈɪn."
LOCK_PH = "nˈəʊ lˈɒk ˈɪn."

def trim(a, sr):
    nz = np.where(np.abs(a) > (np.abs(a).max() if len(a) else 0) * 0.02)[0]
    if len(nz):
        a = a[max(0, nz[0] - int(0.03 * sr)): nz[-1] + int(0.08 * sr)]
    return a

lines = json.load(open(lines_path, encoding='utf-8'))
dur = {}
for L in lines:
    lid, text = L['id'], L['text']
    voice = L.get('voice', 'bm_george')
    speed = L.get('speed', 0.9)
    lang = L.get('lang', 'en-gb')
    if lid == 'L07':
        a, sr = k.create(L07_PH, voice=voice, speed=speed, lang='en-gb', is_phonemes=True, trim=True)
    else:
        a, sr = k.create(text, voice=voice, speed=speed, lang=lang, is_phonemes=False, trim=True)
    a = trim(a, sr)
    sf.write(os.path.join(out, f'{lid}.wav'), a, sr)
    dur[lid] = round(len(a) / sr, 3)
    print(lid, dur[lid], text if lid != 'L07' else '[phonemes] ' + text)

# lock-in verify sample
a, sr = k.create(LOCK_PH, voice='bm_george', speed=0.90, lang='en-gb', is_phonemes=True, trim=True)
a = trim(a, sr)
sf.write(os.path.join(HERE, 'lock-in-sample.wav'), a, sr)
print('lock-in-sample', round(len(a) / sr, 3))

json.dump(dur, open(os.path.join(out, 'dur.json'), 'w', encoding='utf-8'), indent=1)

"""Understated score for Sentinel Log film. Marimba + soft pad. Run from LIB root or here."""
import os, sys, json
import numpy as np
import soundfile as sf

HERE = os.path.dirname(os.path.abspath(__file__))
FILM = os.path.abspath(os.path.join(HERE, '..'))
LIB = os.environ.get('LIB') or os.path.abspath(os.path.join(HERE, '..', '..', '..', '..', 'lemo-opuscar'))
# prefer explicit short path
for cand in [r'C:\Users\gower\lemo-opuscar', os.path.expanduser('~/lemo-opuscar'), LIB]:
    if os.path.isfile(os.path.join(cand, 'core', 'audio', 'sampler.py')):
        LIB = cand
        break
sys.path.insert(0, LIB)
from core.audio import sampler as S
from core.audio.sfx import SR, limit

DUR = 54.0
N = int(round(DUR * SR))
S.seed(20261108)

# load timeline notes if present
tl_path = os.path.join(FILM, 'timeline.json')
if os.path.exists(tl_path):
    TL = json.load(open(tl_path, encoding='utf-8'))
    scatter = TL.get('voiceScatter', [])
    clean = TL.get('voiceClean', [])
else:
    # fallback inline
    S16 = 0.15625
    BEAT = 0.625
    scatter, clean = [], []
    for k in range(0, 45):
        t = 0.8 + k * S16
        if t >= 6.2: break
        scatter.append({'t': t, 'm': [57, 60, 64, 67, 69, 64, 60, 57][k % 8], 'v': 0.22})
    for k in range(0, 80):
        t = 6.2 + k * BEAT
        if t >= 41.4: break
        clean.append({'t': t, 'm': [57, 60, 64, 67, 69, 64, 60, 57][k % 8], 'v': 0.26})
    for i, t in enumerate([15.2, 16.4, 17.6, 18.8, 20.0, 21.0]):
        clean.append({'t': t, 'm': 69 + (i % 3) * 2, 'v': 0.4})
    for k in range(12):
        t = 41.0 + k * BEAT
        if t < 52 and k % 2 == 0:
            clean.append({'t': t, 'm': 57, 'v': 0.18})
    clean.append({'t': 51.0, 'm': 69, 'v': 0.2})

events = []
# soft detuned scatter
for n in scatter:
    events.append((float(n['t']), 'marimba', float(n['m']) + 0.15 * ((hash(str(n['t'])) % 7) - 3), 0.35, float(n.get('v', 0.22)) * 0.7, ((hash(str(n['t'])+ 'p') % 20) / 10) - 1))

for n in clean:
    events.append((float(n['t']), 'marimba', float(n['m']), 0.55, float(n.get('v', 0.28)), 0.0))

# low pulse drone under ordered sections
for t0, t1, m, g in [(10.5, 32.0, 45, 0.18), (32.0, 52.0, 45, 0.14), (52.0, 62.0, 45, 0.1), (62.0, 74.0, 57, 0.12)]:
    events.append((t0, 'vibraphone_bowed' if 'vibraphone_bowed' in S.REG else 'marimba', m, t1 - t0, g, 0.0))

# try instruments; fall back
inst_ok = set()
def pick(name, fallback='marimba'):
    try:
        S.load(name); inst_ok.add(name); return name
    except Exception:
        try:
            S.load(fallback); inst_ok.add(fallback); return fallback
        except Exception as e:
            raise SystemExit(f'no instrument {name}/{fallback}: {e}')

mar = pick('marimba')
# rewrite events with available inst
ev2 = []
for e in events:
    t, inst, pitch, dur, vel, pan = e
    if inst == 'marimba':
        inst = mar
    elif inst not in ('marimba',) and inst not in inst_ok:
        try:
            S.load(inst); inst_ok.add(inst)
        except Exception:
            inst = mar
    ev2.append((t, inst, pitch, dur, vel, pan))

print('rendering', len(ev2), 'notes', 'inst', sorted(inst_ok))
mix = S.render(ev2, dur=DUR, master=True)
mix = S.room(mix, size=0.35, mix=0.12)
# no digital silence — continuous understated bed
# gentle fade out
f = int(0.8 * SR)
mix[-f:] *= np.linspace(1, 0, f)[:, None]
for c in range(2):
    mix[:, c] = limit(mix[:, c], 0.9)

out = os.path.join(HERE, 'score.wav')
sf.write(out, mix.astype(np.float32), SR)
json.dump({'notes': len(ev2), 'inst': sorted(inst_ok), 'dur': DUR}, open(os.path.join(HERE, 'score.json'), 'w'), indent=1)
cred = S.credits(sorted(inst_ok)) if hasattr(S, 'credits') else 'VCSL marimba samples (CC0)\n'
if isinstance(cred, list):
    cred = '\n'.join(cred) + '\n'
open(os.path.join(HERE, 'CREDITS_music.txt'), 'w', encoding='utf-8').write(cred)
print('wrote', out, 'peak', float(np.abs(mix).max()))

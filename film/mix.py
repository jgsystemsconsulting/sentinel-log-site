"""Foley + voice + score ducking for Sentinel Log → build/mix.wav"""
import os, sys, json
import numpy as np
import soundfile as sf
from scipy.signal import resample_poly
from scipy.ndimage import uniform_filter1d

D = os.path.dirname(os.path.abspath(__file__))
LIB = os.environ.get('LIB') or r'C:\Users\gower\lemo-opuscar'
sys.path.insert(0, LIB)
from core.audio.sfx import SR, t_, env_exp, bp, lp, hp, noise, norm, brown, add, compress, limit

DUR = 54.0
K = {
    'snap': 6.28, 'nodes': [15.2, 16.4, 17.6, 18.8, 20.0, 21.0],
    'register': 21.17, 'plan': 28.80, 'truths': 33.94, 'endCard': 40.26,
    'vo': {
        'L01': 0.50, 'L02': 6.68, 'L03': 10.12, 'L04': 14.59,
        'L05': 21.87, 'L06': 29.50, 'L07': 34.64, 'L08': 40.86,
    },
}
# optional events.json
ev_path = os.path.join(D, 'events.json')
EV = json.load(open(ev_path, encoding='utf-8')).get('ev', []) if os.path.exists(ev_path) else []

rng = np.random.default_rng(20261108)
N = int(DUR * SR)
fol = np.zeros((N, 2))
amb = np.zeros((N, 2))
vox = np.zeros((N, 2))
hz = lambda m: 440 * 2 ** ((m - 69) / 12)
PENT = [69, 72, 76, 79, 81, 84]

def sine(f, d, tau, ph=0):
    return np.sin(2 * np.pi * f * t_(d) + ph) * env_exp(d, tau)

def caret_tick(v=1.0):
    d = .03
    return norm(bp(noise(d), 1500, 3200) * env_exp(d, .0025) + sine(2100, d, .004) * .6) * v

def glass(f, v=1.0, d=.4, bright=1.0):
    x = sine(f, d, d * .35) + sine(2 * f, d, d * .18) * .35 * bright + sine(2.76 * f, d, d * .1) * .2 * bright
    x = x + hp(noise(d), 5000) * env_exp(d, .002) * .25
    return norm(x) * v

def felt(v=1.0, f=320):
    d = .09
    x = sine(f, d, .018) + lp(noise(d), 1400) * env_exp(d, .006) * .7 + sine(f * 2.01, d, .01) * .3
    return norm(x) * v

def plop(v=1.0):
    d = .08
    tt = t_(d)
    f = 320 * (1 - .5 * tt / d)
    return norm(np.sin(2 * np.pi * np.cumsum(f) / SR) * env_exp(d, .02) + bp(noise(d), 2000, 6000) * env_exp(d, .003) * .4) * v

def whoosh(d=.3, lo=500, hi=4000, v=1.0, up=True):
    n = noise(d)
    out = np.zeros_like(n)
    L = len(n)
    step = 480
    for i in range(0, L, step):
        u = i / L
        u = u if up else 1 - u
        f = lo * (hi / lo) ** u
        w = min(step, L - i)
        seg = bp(n[max(0, i - 1500):i + w], f * .75, min(f * 1.3, SR / 2 - 100))[-w:]
        out[i:i + w] = seg
    return norm(out * np.sin(np.pi * t_(d) / d) ** 1.5) * v

def shimmer(d=1.6, v=1.0):
    x = whoosh(d, 3000, 9500, 1, True) * .7
    for m, a in [(93, .25), (100, .18), (105, .12)]:
        x = x + np.sin(2 * np.pi * hz(m) * t_(d)) * np.sin(np.pi * t_(d) / d) ** 2 * a
    return norm(x) * v

def thump(v=1.0, f=60, d=.35):
    tt = t_(d)
    return norm(np.sin(2 * np.pi * f * tt * (1 - .25 * tt)) * env_exp(d, .09) + lp(noise(d), 260) * env_exp(d, .02) * .6) * v

# ambience
room = lp(brown(DUR), 220) * .008
tt = np.arange(N) / SR
fan = bp(noise(DUR), 280, 1600) * .02
air = lp(noise(DUR), 700) * .003
amb[:, 0] += room + air + fan * 0.4
amb[:, 1] += np.roll(room + air + fan * 0.4, 41)

# events
if not EV:
    # synthetic defaults
    for i in range(48):
        EV.append({'t': 0.4 + (i / 48) ** 0.7 * 6.8, 'type': 'spawn_file', 'pan': (i % 11) / 5 - 1})
    EV.append({'t': 9.0, 'type': 'snap'})
    for i in range(24):
        EV.append({'t': 9.05 + i * 0.04, 'type': 'land', 'pan': (i % 7) / 6 - 0.5, 'k': i, 'g': i % 3})
    for i, t in enumerate(K['nodes']):
        EV.append({'t': t, 'type': 'node', 'i': i})
    EV.append({'t': 42.0, 'type': 'sweep'})
    for t in np.arange(63, 74, 1.0):
        EV.append({'t': float(t), 'type': 'caret_tick'})

for e in EV:
    t, ty = e['t'], e['type']
    if ty == 'spawn_file':
        add(fol, plop(), t, .045, e.get('pan', 0) * .8)
    elif ty == 'snap':
        add(fol, whoosh(.55, 200, 5000, 1, True), t, .2)
        add(fol, thump(1, 70, .5), t, .35)
    elif ty == 'land':
        m = PENT[(e.get('k', 0) // 3 + 2 * e.get('g', 0)) % len(PENT)]
        add(fol, glass(hz(m), 1, .14, .55), t, .03, e.get('pan', 0) * .7)
    elif ty == 'node':
        m = PENT[e.get('i', 0) % len(PENT)]
        add(fol, glass(hz(m + 12), 1, .5, 1.0), t, .14)
        add(fol, felt(1, 360 + 20 * e.get('i', 0)), t, .1)
    elif ty == 'sweep':
        add(fol, shimmer(1.8), t - 0.35, .1)
    elif ty == 'expand':
        add(fol, whoosh(.4, 400, 3500, 1, True), t, .1)
    elif ty == 'putaway':
        add(fol, felt(1, 280), t, .12)
    elif ty == 'end':
        add(fol, glass(hz(81), 1, .8, 1), t, .08)
    elif ty == 'caret_tick':
        add(fol, caret_tick(), t, .1)
    elif ty == 'freeze':
        pass

# voice
lines = json.load(open(os.path.join(D, 'lines.json'), encoding='utf-8'))
vo_int = []
voice_dir = os.path.join(D, 'voices')
if not os.path.isdir(voice_dir):
    voice_dir = os.path.join(D, 'build', 'voices')
for L in lines:
    lid = L['id']
    t0 = K['vo'][lid]
    path = os.path.join(voice_dir, lid + '.wav')
    if not os.path.exists(path):
        print('missing voice', path)
        continue
    y, sr = sf.read(path)
    if y.ndim > 1:
        y = y.mean(1)
    y = resample_poly(y, SR, sr)
    y = compress(y / (np.abs(y).max() + 1e-9) * .9, .3, 3.0)
    add(vox, y, t0, .58)
    vo_int.append((t0, t0 + len(y) / SR))

# score
mus = np.zeros((N, 2))
for mp in [os.path.join(D, 'music', 'score.wav'), os.path.join(D, 'build', 'score.wav')]:
    if os.path.exists(mp):
        m, msr = sf.read(mp, always_2d=True)
        if msr != SR:
            m = resample_poly(m, SR, msr, axis=0)
        mus[:min(N, len(m))] = m[:N]
        break

duck = np.ones(N)
duckF = np.ones(N)
for a, b in vo_int:
    s, e = int((a - .08) * SR), int((b + .12) * SR)
    duck[s:e] = 10 ** (-8 / 20)
    duckF[s:e] = 10 ** (-4 / 20)
duck = uniform_filter1d(duck, int(.12 * SR))
duckF = uniform_filter1d(duckF, int(.12 * SR))
MUSIC_G = 0.48
mix = mus * MUSIC_G * duck[:, None] + fol * duckF[:, None] + amb + vox
# no digital silence — music continuous, ducked under VO only
f = int(.7 * SR)
mix[-f:] *= np.linspace(1, 0, f)[:, None]
for c in range(2):
    mix[:, c] = limit(mix[:, c], .95)

out_dir = os.path.join(D, 'build')
os.makedirs(out_dir, exist_ok=True)
out = os.path.join(out_dir, 'mix.wav')
sf.write(out, mix.astype(np.float32), SR)
print('mix.wav', mix.shape, 'peak %.3f' % np.abs(mix).max(), 'vo', [(round(a, 2), round(b, 2)) for a, b in vo_int])

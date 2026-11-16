# ARKANA BAKMA — ses tasarımı (tamamen sentez). Çıktı: audio.wav
import numpy as np, wave, os
sr = 44100; DUR = 38.5; N = int(sr * DUR)
rng = np.random.default_rng(317)
t = np.arange(N) / sr
dry = np.zeros((2, N)); wet = np.zeros((2, N))

def band_noise(n, lo, hi):
    X = np.fft.rfft(rng.standard_normal(n)); fq = np.fft.rfftfreq(n, 1 / sr)
    X[(fq < lo) | (fq > hi)] = 0
    y = np.fft.irfft(X, n); return y / (np.abs(y).max() + 1e-9)

def add(buf, sig, at, gain=1.0, pan=0.0):
    i = int(at * sr)
    if i >= N: return
    sig = sig[: N - i]
    buf[0, i:i + len(sig)] += sig * gain * np.sqrt((1 - pan) / 2)
    buf[1, i:i + len(sig)] += sig * gain * np.sqrt((1 + pan) / 2)

def ramp(points):  # [(zaman, değer), ...] -> zarf
    xs, ys = zip(*points); return np.interp(t, xs, ys)

def saw(ph): return 2 * (ph % 1) - 1

# --- uğultu (drone) ---
drone = sum(np.sin(2 * np.pi * fq * t + i) * (0.6 + 0.4 * np.sin(2 * np.pi * (0.07 + 0.03 * i) * t))
            for i, fq in enumerate([41.2, 43.6, 55.0, 61.7, 82.9])) / 5
drone += 0.5 * band_noise(N, 30, 140)
env = ramp([(0, 0), (1, .12), (3.5, .16), (15, .34), (24.5, .5), (24.6, .2), (27.6, .22), (27.7, 0), (31.9, 0), (32.3, .3), (37.4, .34), (37.5, 0), (DUR, 0)])
add(dry, drone * env, 0, 1.0)
# bant tıslaması
hiss = band_noise(N, 3000, 11000) * ramp([(0, .02), (27.7, .02), (27.75, .008), (28.5, .008), (31.5, 0), (31.9, .012), (37.5, .012), (37.51, 0), (DUR, 0)])
add(dry, hiss, 0)
# floresan vızıltısı
buzz = sum(np.sign(np.sin(2 * np.pi * 100 * k * t)) / k for k in (1, 2, 3)) / 2
buzz_env = ramp([(3.5, 0), (4, .028), (17, .028), (18.5, .02), (22.2, .012), (24.5, .01), (24.51, 0), (DUR, 0)])
for a, b in [(14.6, 15.0), (19.1, 19.3), (21.0, 21.2), (24.22, 24.37)]:
    buzz_env[int(a * sr):int(b * sr)] = 0
    crackle = band_noise(int((b - a) * sr), 800, 6000) * (rng.random(int((b - a) * sr)) > 0.6)
    add(wet, crackle, a, 0.12)
add(dry, buzz * buzz_env, 0)

# --- adımlar ---
def step():
    n = int(.22 * sr); x = np.arange(n) / sr
    return np.sin(2 * np.pi * (85 * x - 90 * x * x)) * np.exp(-x * 28) + 0.5 * band_noise(n, 200, 1800) * np.exp(-x * 60)
k = 0; ts = 3.7
while ts < 14.7:
    add(wet, step(), ts, 0.32 * (0.85 + 0.3 * rng.random()), pan=0.35 * (1 if k % 2 else -1)); ts += 0.6; k += 1

# --- şalter sesi (ışıklar sönerken) ---
def thunk():
    n = int(.6 * sr); x = np.arange(n) / sr
    y = np.sin(2 * np.pi * (75 * x - 35 * x * x)) * np.exp(-x * 9)
    y[:200] += rng.standard_normal(200) * np.linspace(1, 0, 200); return y
for i, tt in enumerate([17.0, 17.4, 18.5, 20.5, 22.2, 24.5]):
    add(wet, thunk(), tt, 0.45 + 0.07 * i)

# --- keman kümesi / gerilim ---
def cluster(dur, freqs, attack, decay):
    n = int(dur * sr); x = np.arange(n) / sr; y = 0
    for i, fq in enumerate(freqs):
        vib = 1 + 0.004 * np.sin(2 * np.pi * (5.5 + i * .4) * x)
        y = y + saw(np.cumsum(fq * vib) / sr + i * .13)
    e = np.minimum(x / attack, 1) * np.exp(-np.maximum(x - attack, 0) * decay)
    return y / len(freqs) * e * (0.8 + 0.2 * np.sin(2 * np.pi * 11 * x))
def hit():
    n = int(1.4 * sr); x = np.arange(n) / sr
    return sum(np.sin(2 * np.pi * 49 * h * x) / h for h in (1, 2, 3, 5)) * np.exp(-x * 3.5)
HI = [1568, 1661, 1865, 2093, 2217]
add(wet, cluster(3.6, HI, 2.6, 2.5), 15.0, 0.11)            # ilk görünüş: yavaş yükselen
for tt, gn in [(19.3, .22), (21.2, .28), (24.37, .34)]:      # her yaklaşışta vuruş
    add(wet, cluster(1.1, HI, 0.01, 3.5), tt, gn); add(wet, hit(), tt, gn * 1.6)
# yükselen ton 22.2 -> 24.5
n = int(2.3 * sr); x = np.arange(n) / sr
riser = sum(np.sin(2 * np.pi * np.cumsum(f0 * (1 + 1.6 * (x / 2.3) ** 2)) / sr) for f0 in (196, 208, 277, 294)) / 4
add(dry, riser * (x / 2.3) ** 2, 22.2, 0.2)

# --- kalp atışı (karanlıkta hızlanır) ---
def beat(f0, d):
    n = int(d * sr); x = np.arange(n) / sr
    return np.sin(2 * np.pi * f0 * x) * np.exp(-((x - d / 3) / (d / 5)) ** 2)
tb = 22.3; iv = 0.85
while tb < 27.55:
    g_ = 0.35 + 0.45 * (tb - 22.3) / 5.3
    add(dry, beat(58, .14), tb, g_); add(dry, beat(46, .16), tb + iv * .28, g_ * .7)
    tb += iv; iv = max(0.4, iv * 0.93)

# --- nefes + fısıltı ---
for tb_, d_ in [(24.9, .7), (25.75, .5)]:
    n = int(d_ * sr); add(wet, band_noise(n, 500, 2600) * np.sin(np.pi * np.arange(n) / n) ** 2, tb_, 0.07, pan=-.2)
for i, (off, d_, lo, hi) in enumerate([(0, .17, 900, 3200), (.2, .15, 1500, 5000), (.39, .2, 900, 2800), (.74, .16, 700, 2600), (.93, .3, 900, 3000)]):
    n = int(d_ * sr); add(wet, band_noise(n, lo, hi) * np.sin(np.pi * np.arange(n) / n) ** 1.5, 26.05 + off, 0.16, pan=-0.6 + 0.3 * i)

# --- çığlık (jumpscare) ---
n = int(1.3 * sr); x = np.arange(n) / sr
f0 = 520 + 380 * (1 - np.exp(-x * 25)) + 45 * np.sin(2 * np.pi * 9 * x) + 30 * np.cumsum(rng.standard_normal(n)) / np.sqrt(sr) * 6
ph = np.cumsum(f0) / sr
scr = sum(saw(ph * h) / h ** .7 for h in range(1, 7)) + 0.8 * sum(saw(ph * 1.07 * h + .3) / h ** .7 for h in range(1, 5)) + 0.7 * saw(ph * .5)
scr = scr / 4 + 0.7 * band_noise(n, 1800, 9000)
e = np.minimum(x / .004, 1) * np.minimum((1.3 - x) / .12, 1)
scr = np.tanh(3.2 * scr * e)
sub = np.sin(2 * np.pi * (48 * x - 7 * x * x)) * np.exp(-x * 2.2)
add(dry, scr, 28.5, 0.85); add(dry, sub, 28.5, 0.7); add(wet, scr, 28.5, 0.25)
# karlanma
n = int(1.7 * sr); add(dry, rng.standard_normal(n) / 3, 29.8, 0.42)
# başlık vuruşu
n = int(4 * sr); x = np.arange(n) / sr
boom = np.sin(2 * np.pi * (52 * x - 3 * x * x)) * np.exp(-x * 1.3) + 0.3 * band_noise(n, 40, 300) * np.exp(-x * 3)
add(wet, boom, 32.0, 0.6); add(wet, cluster(3.5, [311, 329, 466], 1.8, 1.2), 32.4, 0.05)
add(dry, band_noise(int(.17 * sr), 400, 9000), 36.55, 0.3); add(wet, hit(), 36.55, 0.5)

# --- yankı ---
m = int(2.2 * sr); x = np.arange(m) / sr
for c in range(2):
    ir = band_noise(m, 120, 5000) * np.exp(-x / 0.45); ir[0] = 0
    L_ = N + m; rev = np.fft.irfft(np.fft.rfft(wet[c], L_) * np.fft.rfft(ir, L_), L_)[:N]
    dry[c] += wet[c] + 0.035 * rev
mix = dry
# sert kesmeler: sessizlik -> çığlık, karlanma -> siyah, son
for a, b in [(27.72, 28.5)]:
    mix[:, int(a * sr):int(b * sr)] *= 0.25
mix[:, int(31.5 * sr):int(31.9 * sr)] = 0
mix[:, int(37.5 * sr):] = 0
mix = np.tanh(mix * 1.15)
mix = mix / np.abs(mix).max() * 0.97
pcm = (mix.T * 32767).astype(np.int16)
with wave.open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'audio.wav'), 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(sr); w.writeframes(pcm.tobytes())
print('audio.wav', DUR, 's')

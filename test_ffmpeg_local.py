"""
Test end-to-end pipeline FFmpeg BenAlus di lokal (Windows).
Jalankan: python test_ffmpeg_local.py
"""
import subprocess
import sys
import os
import tempfile
from pathlib import Path

FFMPEG = "ffmpeg"  # ganti ke full path jika perlu, misal "C:/ffmpeg/bin/ffmpeg"
TMP = Path(tempfile.mkdtemp(prefix="rftest_"))
print(f"[TEST] Work dir: {TMP}")

def run(cmd, label="", check=True):
    print(f"\n  [{label}] {' '.join(str(c) for c in cmd[:6])}...")
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"  STDERR: {result.stderr[-300:]}")
        if check:
            print(f"  [GAGAL] exit code {result.returncode}")
            return False
    else:
        print(f"  [OK]")
    return True

# ─── Step 0: Buat video test 6 detik ───
print("\n=== Step 0: Buat video test (6s, 1920x1080) ===")
raw = TMP / "test_raw.mp4"
ok = run([FFMPEG, "-y",
    "-f", "lavfi", "-i", "color=c=blue:size=1920x1080:duration=6:rate=30",
    "-f", "lavfi", "-i", "sine=frequency=440:duration=6",
    "-c:v", "libx264", "-preset", "fast", "-crf", "23",
    "-c:a", "aac", "-shortest", str(raw)
], "buat video test")
if not ok:
    print("FFmpeg tidak ditemukan atau tidak bisa buat video test!")
    sys.exit(1)
print(f"  File: {raw} ({raw.stat().st_size // 1024} KB)")

# ─── Step 1: Deflicker ───
print("\n=== Step 1: Deflicker ===")
defl = TMP / "test_defl.mp4"
ok_defl = run([FFMPEG, "-y", "-i", str(raw),
    "-vf", "deflicker=mode=pm:size=10",
    "-c:v", "libx264", "-preset", "fast", "-crf", "18", "-an", str(defl)
], "deflicker", check=False)
if not ok_defl:
    print("  NOTE: Deflicker gagal — akan pakai file asli (ini normal!)")
    defl = raw

# ─── Step 2: Fade in/out ───
print("\n=== Step 2: Fade in + Fade out ===")
fade = TMP / "test_fade.mp4"
ok = run([FFMPEG, "-y", "-i", str(defl),
    "-vf", "fade=t=in:st=0:d=0.8,fade=t=out:st=5.2:d=0.8",
    "-c:v", "libx264", "-preset", "fast", "-crf", "18", "-an", str(fade)
], "fade")
if not ok: sys.exit(1)

# ─── Step 3: Concat 5 loops (test singkat) ───
print("\n=== Step 3: Concat 5 loops ===")
list_file = TMP / "list.txt"
with open(list_file, "w") as f:
    for _ in range(5):
        f.write(f"file '{str(fade).replace(chr(92), '/')}'\n")
print(f"  List file ({5} lines): OK")

loop = TMP / "test_loop.mp4"
ok = run([FFMPEG, "-y", "-f", "concat", "-safe", "0",
    "-i", str(list_file), "-c", "copy", str(loop)
], "concat loop")
if not ok: sys.exit(1)
print(f"  Loop file: {loop.stat().st_size // 1024} KB")

# ─── Step 4: Buat audio test + merge ───
print("\n=== Step 4: Merge audio ===")
audio = TMP / "test_audio.mp3"
run([FFMPEG, "-y",
    "-f", "lavfi", "-i", "sine=frequency=528:duration=30",
    "-c:a", "libmp3lame", "-b:a", "192k", str(audio)
], "buat audio test")

output = TMP / "test_output_loop.mp4"
ok = run([FFMPEG, "-y",
    "-i", str(loop), "-i", str(audio),
    "-map", "0:v", "-map", "1:a",
    "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest",
    str(output)
], "audio merge")
if not ok: sys.exit(1)

# ─── Hasil ───
print("\n=== HASIL TEST ===")
files = [
    ("Video raw (input)",  raw),
    ("Deflicker",          defl if defl != raw else None),
    ("Fade",               fade),
    ("Concat 5x",          loop),
    ("Output final",       output),
]
all_ok = True
for label, f in files:
    if f is None:
        print(f"  [SKIP] {label}")
        continue
    if f.exists():
        print(f"  [OK]   {label}: {f.name} ({f.stat().st_size // 1024} KB)")
    else:
        print(f"  [MISS] {label}: tidak ada!")
        all_ok = False

print(f"\n{'='*40}")
if all_ok:
    print("✅ SEMUA STEP BERHASIL! Backend siap di-deploy ke VPS.")
else:
    print("❌ Ada step yang gagal. Cek output di atas.")
print(f"  Output ada di: {TMP}")

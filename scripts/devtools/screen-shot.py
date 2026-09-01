# 屏幕像素级截图：CopyFromScreen 截取指定窗口区域（绕过 PrintWindow 白屏）
import ctypes, sys, tempfile
from ctypes import wintypes
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from visual_evidence_path import assert_visual_evidence_path, default_visual_evidence_path

if len(sys.argv) > 1:
    out = assert_visual_evidence_path(sys.argv[1])
else:
    out = default_visual_evidence_path("screen-shot")
Path(out).parent.mkdir(parents=True, exist_ok=True)
title_keyword = "开发者工具"

user32 = ctypes.windll.user32
EnumWindowsProc = ctypes.WINFUNCTYPE(wintypes.BOOL, wintypes.HWND, wintypes.LPARAM)
found = []

def cb(hwnd, lparam):
    if user32.IsWindowVisible(hwnd):
        length = user32.GetWindowTextLengthW(hwnd)
        if length:
            buf = ctypes.create_unicode_buffer(length + 1)
            user32.GetWindowTextW(hwnd, buf, length + 1)
            if title_keyword in buf.value:
                found.append(hwnd)
    return True

user32.EnumWindows(EnumWindowsProc(cb), 0)
if not found:
    print("FAIL no window")
    sys.exit(1)

hwnd = found[0]
# 置前台（让目标不被遮挡）
user32.ShowWindow(hwnd, 9)  # SW_RESTORE
user32.SetForegroundWindow(hwnd)

import time
time.sleep(2)

rect = wintypes.RECT()
user32.GetWindowRect(hwnd, ctypes.byref(rect))
x, y, w, h = rect.left, rect.top, rect.right - rect.left, rect.bottom - rect.top
print(f"window rect: {x},{y} {w}x{h}")

# PIL 抓屏
from PIL import ImageGrab
img = ImageGrab.grab(bbox=(max(x,0), max(y,0), x + w, y + h), all_screens=True)
img.save(str(out))
print("saved", out)

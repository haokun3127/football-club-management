# 屏幕像素级截图：CopyFromScreen 截取指定窗口区域（绕过 PrintWindow 白屏）
import ctypes, sys
from ctypes import wintypes

out = sys.argv[1] if len(sys.argv) > 1 else r"C:\Users\ASUS\Desktop\football-club-management-codex-windows-2026-08-02\tmp\figma-restore\screen-shot.png"
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
img.save(out)
print("saved", out)

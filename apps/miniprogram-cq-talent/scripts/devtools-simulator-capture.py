#!/usr/bin/env python3
"""Capture the exact logical viewport from a visible WeChat DevTools simulator window."""

from __future__ import annotations

import argparse
import ctypes
from ctypes import wintypes
import json
import math
from pathlib import Path
import struct
import sys
import time
import zlib


PW_RENDERFULLCONTENT = 2
BI_RGB = 0
DIB_RGB_COLORS = 0


class RECT(ctypes.Structure):
    _fields_ = [
        ("left", ctypes.c_long),
        ("top", ctypes.c_long),
        ("right", ctypes.c_long),
        ("bottom", ctypes.c_long),
    ]


class BITMAPINFOHEADER(ctypes.Structure):
    _fields_ = [
        ("biSize", ctypes.c_uint32),
        ("biWidth", ctypes.c_long),
        ("biHeight", ctypes.c_long),
        ("biPlanes", ctypes.c_uint16),
        ("biBitCount", ctypes.c_uint16),
        ("biCompression", ctypes.c_uint32),
        ("biSizeImage", ctypes.c_uint32),
        ("biXPelsPerMeter", ctypes.c_long),
        ("biYPelsPerMeter", ctypes.c_long),
        ("biClrUsed", ctypes.c_uint32),
        ("biClrImportant", ctypes.c_uint32),
    ]


class RGBQUAD(ctypes.Structure):
    _fields_ = [
        ("rgbBlue", ctypes.c_ubyte),
        ("rgbGreen", ctypes.c_ubyte),
        ("rgbRed", ctypes.c_ubyte),
        ("rgbReserved", ctypes.c_ubyte),
    ]


class BITMAPINFO(ctypes.Structure):
    _fields_ = [("bmiHeader", BITMAPINFOHEADER), ("bmiColors", RGBQUAD * 1)]


user32 = ctypes.WinDLL("user32", use_last_error=True)
gdi32 = ctypes.WinDLL("gdi32", use_last_error=True)
kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)

EnumWindowsProc = ctypes.WINFUNCTYPE(wintypes.BOOL, wintypes.HWND, wintypes.LPARAM)
user32.EnumWindows.argtypes = [EnumWindowsProc, wintypes.LPARAM]
user32.EnumWindows.restype = wintypes.BOOL
user32.IsWindowVisible.argtypes = [wintypes.HWND]
user32.IsWindowVisible.restype = wintypes.BOOL
user32.GetWindowTextLengthW.argtypes = [wintypes.HWND]
user32.GetWindowTextLengthW.restype = ctypes.c_int
user32.GetWindowTextW.argtypes = [wintypes.HWND, wintypes.LPWSTR, ctypes.c_int]
user32.GetWindowTextW.restype = ctypes.c_int
user32.GetWindowRect.argtypes = [wintypes.HWND, ctypes.POINTER(RECT)]
user32.GetWindowRect.restype = wintypes.BOOL
user32.GetForegroundWindow.argtypes = []
user32.GetForegroundWindow.restype = wintypes.HWND
user32.GetWindowThreadProcessId.argtypes = [wintypes.HWND, ctypes.POINTER(wintypes.DWORD)]
user32.GetWindowThreadProcessId.restype = wintypes.DWORD
user32.AttachThreadInput.argtypes = [wintypes.DWORD, wintypes.DWORD, wintypes.BOOL]
user32.AttachThreadInput.restype = wintypes.BOOL
user32.ShowWindow.argtypes = [wintypes.HWND, ctypes.c_int]
user32.ShowWindow.restype = wintypes.BOOL
user32.BringWindowToTop.argtypes = [wintypes.HWND]
user32.BringWindowToTop.restype = wintypes.BOOL
user32.SetForegroundWindow.argtypes = [wintypes.HWND]
user32.SetForegroundWindow.restype = wintypes.BOOL
user32.SetFocus.argtypes = [wintypes.HWND]
user32.SetFocus.restype = wintypes.HWND
user32.PrintWindow.argtypes = [wintypes.HWND, wintypes.HDC, wintypes.UINT]
user32.PrintWindow.restype = wintypes.BOOL
user32.GetDC.argtypes = [wintypes.HWND]
user32.GetDC.restype = wintypes.HDC
user32.ReleaseDC.argtypes = [wintypes.HWND, wintypes.HDC]
user32.ReleaseDC.restype = ctypes.c_int
user32.SetProcessDPIAware.restype = wintypes.BOOL
kernel32.GetCurrentThreadId.argtypes = []
kernel32.GetCurrentThreadId.restype = wintypes.DWORD
if hasattr(user32, "GetDpiForWindow"):
    user32.GetDpiForWindow.argtypes = [wintypes.HWND]
    user32.GetDpiForWindow.restype = wintypes.UINT

gdi32.CreateCompatibleDC.argtypes = [wintypes.HDC]
gdi32.CreateCompatibleDC.restype = wintypes.HDC
gdi32.CreateCompatibleBitmap.argtypes = [wintypes.HDC, ctypes.c_int, ctypes.c_int]
gdi32.CreateCompatibleBitmap.restype = wintypes.HBITMAP
gdi32.SelectObject.argtypes = [wintypes.HDC, wintypes.HGDIOBJ]
gdi32.SelectObject.restype = wintypes.HGDIOBJ
gdi32.DeleteDC.argtypes = [wintypes.HDC]
gdi32.DeleteDC.restype = wintypes.BOOL
gdi32.DeleteObject.argtypes = [wintypes.HGDIOBJ]
gdi32.DeleteObject.restype = wintypes.BOOL
gdi32.GetDIBits.argtypes = [
    wintypes.HDC,
    wintypes.HBITMAP,
    wintypes.UINT,
    wintypes.UINT,
    ctypes.c_void_p,
    ctypes.POINTER(BITMAPINFO),
    wintypes.UINT,
]
gdi32.GetDIBits.restype = ctypes.c_int


def rounded_pixels(value: float) -> int:
    return int(math.floor(value + 0.5))


def find_simulator_window(title: str | None) -> tuple[wintypes.HWND, str]:
    windows: list[tuple[wintypes.HWND, str]] = []

    @EnumWindowsProc
    def collect(hwnd: wintypes.HWND, _lparam: wintypes.LPARAM) -> bool:
        if not user32.IsWindowVisible(hwnd):
            return True
        length = user32.GetWindowTextLengthW(hwnd)
        if length <= 0:
            return True
        buffer = ctypes.create_unicode_buffer(length + 1)
        user32.GetWindowTextW(hwnd, buffer, len(buffer))
        candidate = buffer.value
        if candidate:
            windows.append((hwnd, candidate))
        return True

    if not user32.EnumWindows(collect, 0):
        raise RuntimeError("Could not enumerate top-level windows")

    suffix = "\u7684\u6a21\u62df\u5668"
    matches = [(hwnd, candidate) for hwnd, candidate in windows if candidate == title] if title else [
        (hwnd, candidate) for hwnd, candidate in windows if candidate.endswith(suffix)
    ]
    if not matches and not title:
        embedded_matches = [
            (hwnd, candidate)
            for hwnd, candidate in windows
            if "\u5fae\u4fe1\u5f00\u53d1\u8005\u5de5\u5177" in candidate or "WeChat Web Devtools" in candidate
        ]
        if len(embedded_matches) == 1:
            return embedded_matches[0]
        if len(embedded_matches) > 1:
            raise RuntimeError("Found multiple visible WeChat DevTools windows; set WECHAT_DEVTOOLS_SIMULATOR_TITLE to the exact simulator window title")
    if not matches:
        if title:
            raise RuntimeError(f"No visible WeChat DevTools simulator window found titled {title!r}")
        raise RuntimeError("No visible standalone DevTools simulator or unique DevTools main window found")
    if len(matches) > 1:
        raise RuntimeError("Found multiple visible DevTools simulator windows; set WECHAT_DEVTOOLS_SIMULATOR_TITLE to the exact window title")
    return matches[0]


def activate_window_for_capture(hwnd: wintypes.HWND) -> bool:
    """Bring DevTools forward before Electron renders the simulator frame.

    Windows rejects a background process's ordinary SetForegroundWindow call.
    Temporarily joining the current foreground input queue grants the request
    the same focus context, then always detaches before image capture.
    """
    current_thread = int(kernel32.GetCurrentThreadId())
    foreground = user32.GetForegroundWindow()
    foreground_thread = 0
    if foreground:
        foreground_thread = int(user32.GetWindowThreadProcessId(foreground, None))

    attached = False
    if foreground and foreground != hwnd and foreground_thread and foreground_thread != current_thread:
        attached = bool(user32.AttachThreadInput(current_thread, foreground_thread, True))
    try:
        user32.ShowWindow(hwnd, 9)
        user32.BringWindowToTop(hwnd)
        user32.SetForegroundWindow(hwnd)
        user32.SetFocus(hwnd)
        return user32.GetForegroundWindow() == hwnd
    finally:
        if attached:
            user32.AttachThreadInput(current_thread, foreground_thread, False)


def capture_window_bgra(hwnd: wintypes.HWND) -> tuple[bytes, int, int, int]:
    user32.SetProcessDPIAware()
    activate_window_for_capture(hwnd)
    rect = RECT()
    if not user32.GetWindowRect(hwnd, ctypes.byref(rect)):
        raise RuntimeError("Could not read simulator window bounds")
    width = rect.right - rect.left
    height = rect.bottom - rect.top
    if width < 1 or height < 1:
        raise RuntimeError("Simulator window has invalid bounds")

    dpi = int(user32.GetDpiForWindow(hwnd)) if hasattr(user32, "GetDpiForWindow") else 96
    if dpi <= 0:
        raise RuntimeError("Could not determine simulator window DPI")

    screen_dc = user32.GetDC(0)
    if not screen_dc:
        raise RuntimeError("Could not acquire a compatible display context")
    memory_dc = None
    bitmap = None
    original = None
    try:
        memory_dc = gdi32.CreateCompatibleDC(screen_dc)
        if not memory_dc:
            raise RuntimeError("Could not create simulator capture context")
        bitmap = gdi32.CreateCompatibleBitmap(screen_dc, width, height)
        if not bitmap:
            raise RuntimeError("Could not allocate simulator capture bitmap")
        original = gdi32.SelectObject(memory_dc, bitmap)
        if not original:
            raise RuntimeError("Could not select simulator capture bitmap")
        if not user32.PrintWindow(hwnd, memory_dc, PW_RENDERFULLCONTENT):
            raise RuntimeError(f"PrintWindow failed: {ctypes.get_last_error()}")

        info = BITMAPINFO()
        info.bmiHeader.biSize = ctypes.sizeof(BITMAPINFOHEADER)
        info.bmiHeader.biWidth = width
        info.bmiHeader.biHeight = -height
        info.bmiHeader.biPlanes = 1
        info.bmiHeader.biBitCount = 32
        info.bmiHeader.biCompression = BI_RGB
        pixels = (ctypes.c_ubyte * (width * height * 4))()
        rows = gdi32.GetDIBits(memory_dc, bitmap, 0, height, ctypes.byref(pixels), ctypes.byref(info), DIB_RGB_COLORS)
        if rows != height:
            raise RuntimeError(f"GetDIBits returned {rows} rows instead of {height}")
        return bytes(pixels), width, height, dpi
    finally:
        if memory_dc and original:
            gdi32.SelectObject(memory_dc, original)
        if bitmap:
            gdi32.DeleteObject(bitmap)
        if memory_dc:
            gdi32.DeleteDC(memory_dc)
        user32.ReleaseDC(0, screen_dc)


def capture_screen_bgra(hwnd: wintypes.HWND) -> tuple[bytes, int, int, int]:
    """Capture the visible DevTools window from the desktop compositor.

    Electron's embedded simulator intermittently paints a blank frame through
    PrintWindow. ImageGrab reads the same pixels the operator can see, which
    keeps the output trustworthy while the dynamic viewport locator avoids any
    display-specific crop coordinates.
    """
    user32.SetProcessDPIAware()
    activate_window_for_capture(hwnd)
    time.sleep(0.2)
    rect = RECT()
    if not user32.GetWindowRect(hwnd, ctypes.byref(rect)):
        raise RuntimeError("Could not read simulator window bounds for screen capture")
    width = rect.right - rect.left
    height = rect.bottom - rect.top
    if width < 1 or height < 1:
        raise RuntimeError("Simulator window has invalid bounds for screen capture")
    dpi = int(user32.GetDpiForWindow(hwnd)) if hasattr(user32, "GetDpiForWindow") else 96
    if dpi <= 0:
        raise RuntimeError("Could not determine simulator window DPI for screen capture")

    try:
        from PIL import ImageGrab
    except ImportError as error:
        raise RuntimeError("Screen capture fallback requires Pillow") from error

    image = ImageGrab.grab(
        bbox=(rect.left, rect.top, rect.right, rect.bottom),
        all_screens=True,
    ).convert("RGBA")
    if image.size != (width, height):
        raise RuntimeError(f"Screen capture size {image.size} did not match simulator window {(width, height)}")
    rgba = image.tobytes()
    bgra = bytearray(rgba)
    bgra[0::4], bgra[2::4] = rgba[2::4], rgba[0::4]
    return bytes(bgra), width, height, dpi


def is_dark_pixel(bgra: bytes, window_width: int, x: int, y: int) -> bool:
    index = (y * window_width + x) * 4
    blue, green, red = bgra[index], bgra[index + 1], bgra[index + 2]
    return red <= 12 and green <= 12 and blue <= 12


def locate_iphone_x_viewport(bgra: bytes, window_width: int, window_height: int, dpi: int, logical_width: int, logical_height: int) -> tuple[int, int, int, int]:
    scale = dpi / 96.0
    width = rounded_pixels(logical_width * scale)
    height = rounded_pixels(logical_height * scale)
    if width > window_width or height > window_height:
        raise RuntimeError("Simulator window is smaller than the requested logical viewport at its current Windows scale")
    notch_run = max(16, rounded_pixels(28 * scale))
    notch_half_width = max(16, rounded_pixels(32 * scale))
    max_top = window_height - height
    best_notch: tuple[int, int, int] | None = None
    for top in range(max_top + 1):
        valid_centers: list[int] = []
        for center_x in range(width // 2, window_width - (width - width // 2) + 1):
            if not all(is_dark_pixel(bgra, window_width, center_x, top + offset) for offset in range(notch_run)):
                continue
            notch_y = top + notch_run // 2
            if not all(is_dark_pixel(bgra, window_width, x, notch_y) for x in range(center_x - notch_half_width, center_x + notch_half_width + 1)):
                continue
            valid_centers.append(center_x)
        if not valid_centers:
            continue
        group_start = valid_centers[0]
        group_end = group_start
        for center_x in valid_centers[1:]:
            if center_x == group_end + 1:
                group_end = center_x
                continue
            candidate = (group_end - group_start + 1, top, (group_start + group_end) // 2)
            if best_notch is None or candidate[0] > best_notch[0]:
                best_notch = candidate
            group_start = center_x
            group_end = center_x
        candidate = (group_end - group_start + 1, top, (group_start + group_end) // 2)
        if best_notch is None or candidate[0] > best_notch[0]:
            best_notch = candidate
    if best_notch:
        _, top, center_x = best_notch
        return center_x - width // 2, top, width, height
    raise RuntimeError("Could not locate the iPhone X simulator notch needed to crop the logical viewport")


def capture_logical_viewport(
    primary_capture,
    screen_capture,
    logical_width: int,
    logical_height: int,
    *,
    locator=locate_iphone_x_viewport,
) -> tuple[tuple[bytes, int, int, int], tuple[int, int, int, int], str]:
    """Locate the simulator viewport, falling back to visible screen pixels.

    The fallback is deliberately triggered by the proof that matters: whether
    the frame contains a recognisable iPhone viewport, not by a fragile
    brightness heuristic for Electron's PrintWindow result.
    """
    primary_error: RuntimeError | None = None
    try:
        captured = primary_capture()
        crop = locator(*captured, logical_width, logical_height)
        return captured, crop, "print_window"
    except RuntimeError as error:
        primary_error = error

    try:
        captured = screen_capture()
        crop = locator(*captured, logical_width, logical_height)
        return captured, crop, "screen"
    except RuntimeError as screen_error:
        raise RuntimeError(
            f"Unable to locate the simulator viewport from PrintWindow ({primary_error}) "
            f"or visible screen pixels ({screen_error})"
        ) from screen_error


def png_chunk(kind: bytes, payload: bytes) -> bytes:
    return struct.pack(">I", len(payload)) + kind + payload + struct.pack(">I", zlib.crc32(kind + payload) & 0xFFFFFFFF)


def write_png(
    path: Path,
    bgra: bytes,
    source_width: int,
    crop: tuple[int, int, int, int],
    output_size: tuple[int, int] | None = None,
) -> None:
    left, top, width, height = crop
    rgba = bytearray()
    for row_index in range(top, top + height):
        start = (row_index * source_width + left) * 4
        row = bytearray(bgra[start:start + width * 4])
        row[0::4], row[2::4] = row[2::4], row[0::4]
        rgba.extend(row)

    target_width, target_height = output_size or (width, height)
    if (target_width, target_height) != (width, height):
        try:
            from PIL import Image
        except ImportError as error:
            raise RuntimeError("High-DPI output resizing requires Pillow") from error
        image = Image.frombytes("RGBA", (width, height), bytes(rgba))
        resampling = getattr(Image, "Resampling", Image)
        image = image.resize((target_width, target_height), resampling.LANCZOS)
        rgba = bytearray(image.tobytes())
        width, height = target_width, target_height

    raw = bytearray()
    for row_index in range(height):
        raw.append(0)
        start = row_index * width * 4
        raw.extend(rgba[start:start + width * 4])
    payload = b"\x89PNG\r\n\x1a\n"
    payload += png_chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0))
    payload += png_chunk(b"IDAT", zlib.compress(bytes(raw), level=9))
    payload += png_chunk(b"IEND", b"")
    path.write_bytes(payload)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", required=True)
    parser.add_argument("--logical-width", type=int, required=True)
    parser.add_argument("--logical-height", type=int, required=True)
    parser.add_argument("--simulator-title", default="")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    output = Path(args.output)
    if not output.parent.is_dir():
        raise RuntimeError("Capture output parent directory does not exist")
    hwnd, title = find_simulator_window(args.simulator_title or None)
    captured, crop, source = capture_logical_viewport(
        lambda: capture_window_bgra(hwnd),
        lambda: capture_screen_bgra(hwnd),
        args.logical_width,
        args.logical_height,
    )
    bgra, window_width, window_height, dpi = captured
    write_png(output, bgra, window_width, crop, (args.logical_width, args.logical_height))
    print(json.dumps({
        "title": title,
        "window": {"width": window_width, "height": window_height},
        "crop": {"x": crop[0], "y": crop[1], "width": crop[2], "height": crop[3]},
        "dpi": dpi,
        "source": source,
        "output": {"width": args.logical_width, "height": args.logical_height},
    }, ensure_ascii=True))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(str(error), file=sys.stderr)
        raise SystemExit(1)

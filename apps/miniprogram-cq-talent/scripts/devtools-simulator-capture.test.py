import importlib.util
import unittest
from pathlib import Path


MODULE_PATH = Path(__file__).with_name("devtools-simulator-capture.py")
SPEC = importlib.util.spec_from_file_location("devtools_simulator_capture", MODULE_PATH)
MODULE = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(MODULE)


class SimulatorViewportTests(unittest.TestCase):
    def test_locates_an_embedded_iphone_x_viewport_away_from_window_center(self):
        window_width = 420
        window_height = 900
        viewport_width = 375
        viewport_height = 812
        viewport_left = 31
        viewport_top = 41
        viewport_center = viewport_left + viewport_width // 2
        pixels = bytearray([255, 255, 255, 255] * (window_width * window_height))

        for y in range(viewport_top, viewport_top + 28):
            for x in range(viewport_center - 32, viewport_center + 33):
                offset = (y * window_width + x) * 4
                pixels[offset:offset + 4] = b"\x00\x00\x00\xff"

        crop = MODULE.locate_iphone_x_viewport(
            bytes(pixels),
            window_width,
            window_height,
            96,
            viewport_width,
            viewport_height,
        )

        self.assertEqual(crop, (viewport_left, viewport_top, viewport_width, viewport_height))

    def test_centers_a_wide_embedded_notch_instead_of_using_its_left_edge(self):
        window_width = 900
        window_height = 900
        viewport_width = 375
        viewport_height = 812
        viewport_left = 299
        viewport_top = 40
        viewport_center = viewport_left + viewport_width // 2
        pixels = bytearray([255, 255, 255, 255] * (window_width * window_height))

        for y in range(viewport_top, viewport_top + 28):
            for x in range(viewport_center - 110, viewport_center + 111):
                offset = (y * window_width + x) * 4
                pixels[offset:offset + 4] = b"\x00\x00\x00\xff"

        crop = MODULE.locate_iphone_x_viewport(
            bytes(pixels),
            window_width,
            window_height,
            96,
            viewport_width,
            viewport_height,
        )

        self.assertEqual(crop, (viewport_left, viewport_top, viewport_width, viewport_height))

    def test_uses_screen_capture_when_primary_frame_has_no_simulator_notch(self):
        primary = (b"primary", 1707, 1019, 96)
        fallback = (b"screen", 1707, 1019, 96)
        attempted = []

        def locator(pixels, _width, _height, _dpi, _logical_width, _logical_height):
            attempted.append(pixels)
            if pixels == primary[0]:
                raise RuntimeError("Could not locate the iPhone X simulator notch needed to crop the logical viewport")
            return (1166, 91, 375, 812)

        captured, crop, source = MODULE.capture_logical_viewport(
            lambda: primary,
            lambda: fallback,
            375,
            812,
            locator=locator,
        )

        self.assertEqual(attempted, [primary[0], fallback[0]])
        self.assertEqual(captured, fallback)
        self.assertEqual(crop, (1166, 91, 375, 812))
        self.assertEqual(source, "screen")


if __name__ == "__main__":
    unittest.main()

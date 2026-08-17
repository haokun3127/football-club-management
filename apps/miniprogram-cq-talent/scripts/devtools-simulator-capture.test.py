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


if __name__ == "__main__":
    unittest.main()

# 从整窗屏幕截图裁剪模拟器手机画面并缩放为 375x812（验收规格）
# 用法: python crop-phone.py <in.png> <out.png> [left top right bottom]
import sys
from PIL import Image
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from visual_evidence_path import assert_visual_evidence_path

src, dst = sys.argv[1], assert_visual_evidence_path(sys.argv[2])
box = tuple(int(v) for v in sys.argv[3:7]) if len(sys.argv) >= 7 else (1400, 85, 1775, 900)
img = Image.open(src).crop(box)
img = img.resize((375, 812), Image.LANCZOS)
img.save(str(dst))
print("saved", dst, img.size)

"""左右拼接两张 375 宽截图，中间红线分隔，顶部标注 DESIGN/CURRENT。用法: python sidebyside.py <左图> <右图> <输出>"""
import sys
from PIL import Image, ImageDraw

left_path, right_path, out_path = sys.argv[1], sys.argv[2], sys.argv[3]
li, ri = Image.open(left_path), Image.open(right_path)
h = max(li.height, ri.height)
band = 28
canvas = Image.new("RGB", (li.width + ri.width + 4, h + band), "#202020")
d = ImageDraw.Draw(canvas)
d.rectangle([0, 0, canvas.width, band], fill="#202020")
d.text((8, 8), "DESIGN", fill="#ffffff")
d.text((li.width + 12, 8), "CURRENT", fill="#ffffff")
canvas.paste(li, (0, band))
canvas.paste(ri, (li.width + 4, band))
d.rectangle([li.width, band, li.width + 4, band + h], fill="#ff3333")
canvas.save(out_path)
print("ok", out_path)

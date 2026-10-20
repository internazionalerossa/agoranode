"""Rasterize the repository's 96-unit book/star emblem for app launchers."""
from pathlib import Path
from PIL import Image, ImageDraw
ROOT = Path(__file__).resolve().parents[1]
RED, PAPER = '#ad302d', '#f6f3ec'
STAR = [(48,12),(51.7,20),(60.5,21),(54,27),(55.8,35.6),(48,31.2),(40.2,35.6),(42,27),(35.5,21),(44.3,20)]
def icon(size, maskable=False):
    scale = 4
    canvas = Image.new('RGB', (size*scale, size*scale), RED)
    draw = ImageDraw.Draw(canvas)
    factor = size*scale/96 * (.7 if maskable else 1)
    offset = size*scale*.15 if maskable else 0
    def point(p): return tuple(offset+c*factor for c in p)
    draw.polygon([point(p) for p in STAR], fill=PAPER)
    def curve(a,b,c):
        return [((1-t)**2*a[0]+2*(1-t)*t*b[0]+t*t*c[0], (1-t)**2*a[1]+2*(1-t)*t*b[1]+t*t*c[1]) for t in (i/40 for i in range(41))]
    book = curve((14,42),(31,36),(48,47)) + curve((48,47),(65,36),(82,42)) + [(82,73)] + curve((82,73),(65,67),(48,78)) + curve((48,78),(31,67),(14,73)) + [(14,42)]
    draw.line([point(p) for p in book], fill=PAPER, width=round(4*factor), joint='curve')
    draw.line([point((48,47)),point((48,78))], fill=PAPER,width=round(4*factor))
    return canvas.resize((size,size),Image.Resampling.LANCZOS)
(ROOT/'public/icons').mkdir(exist_ok=True)
for size in [192,512]: icon(size).save(ROOT/f'public/icons/app-{size}.png')
icon(512,True).save(ROOT/'public/icons/app-maskable-512.png')
icon(180).save(ROOT/'public/apple-touch-icon.png')

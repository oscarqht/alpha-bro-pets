"""Inspect downloaded ChatGPT sprite sheets, including transparent cell padding."""
import json, sys
from pathlib import Path
from PIL import Image
frames = [6, 8, 8, 4, 5, 8, 6, 6, 6]
for filename in sys.argv[1:]:
    path = Path(filename)
    image = Image.open(path).convert('RGBA')
    rows = image.height // 208
    assert image.size in [(1536, 1872), (1536, 2288)], image.size
    counts = frames + ([8, 8] if rows == 11 else [])
    filled, empty, touches = [], [], []
    for row, count in enumerate(counts):
        for col in range(8):
            alpha = image.crop((col*192, row*208, (col+1)*192, (row+1)*208)).getchannel('A')
            box = alpha.getbbox()
            if col < count:
                assert box, (row, col, 'empty required frame')
                filled.append([row, col])
                if box[0] <= 0 or box[1] <= 0 or box[2] >= 192 or box[3] >= 208:
                    touches.append([row, col, box])
            else:
                assert not box, (row, col, 'nonempty padding frame')
                empty.append([row, col])
    assert not touches, touches
    assert len(filled) == (73 if rows == 11 else 57)
    assert len(empty) == 15
    assert path.stat().st_size <= 20*1024*1024
    print(json.dumps(dict(file=str(path), dimensions=image.size, populated=len(filled), empty=len(empty), clippedCells=touches, bytes=path.stat().st_size)))

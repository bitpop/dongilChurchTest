# 스크린샷 묶음(contact sheet) 생성: python3 scripts/sheet.py <dir> <out_prefix>
import sys, glob, os
from PIL import Image
d, prefix = sys.argv[1], sys.argv[2]
desk = sorted(f for f in glob.glob(f'{d}/*_desktop.png'))
mob = sorted(f for f in glob.glob(f'{d}/*_mobile*.png'))
def sheet(files, cols, rows, scale, name):
    n = cols*rows
    for i in range(0, len(files), n):
        chunk = files[i:i+n]
        ims = [Image.open(f) for f in chunk]
        w = int(max(im.width for im in ims)*scale); h = int(max(im.height for im in ims)*scale)
        out = Image.new('RGB', (w*cols, h*rows), 'white')
        for j, im in enumerate(ims):
            im = im.resize((int(im.width*scale), int(im.height*scale)))
            out.paste(im, ((j%cols)*w, (j//cols)*h))
        p = f'{name}_{i//n+1:02d}.png'; out.save(p); print(p, [os.path.basename(f) for f in chunk])
sheet(desk, 2, 2, 0.5, f'{prefix}_desktop')
sheet(mob, 4, 2, 1.0, f'{prefix}_mobile')

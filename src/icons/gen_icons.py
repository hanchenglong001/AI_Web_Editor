# Generate plugin icons using Pillow
from PIL import Image, ImageDraw

def create_icon(size):
    img = Image.new('RGBA', (size, size), (0, 0, 0, 255))
    draw = ImageDraw.Draw(img)
    
    margin = max(4, size // 16)
    
    # Draw rounded rectangle gradient by horizontal lines
    for i in range(size):
        r = int(99 + (139 - 99) * i / size)
        g = int(102 + (92 - 102) * i / size)
        b = int(241 + (252 - 241) * i / size)
        draw.line([(margin, margin + i), (size - margin, margin + i)], fill=(r, g, b))
    
    # Draw 8-pointed asterisk ✦
    cx, cy = size // 2, size // 2
    radius = max(3, int(size * 0.3))
    line_width = max(1, size // 16)
    
    # Center dot
    core = max(1, size // 14)
    draw.ellipse([cx - core, cy - core, cx + core, cy + core], fill=(255, 255, 255))
    
    # 8 arms (cardinal + diagonal)
    for dx, dy in [(0,-1),(1,-1),(1,0),(1,1),(0,1),(-1,1),(-1,0),(-1,-1)]:
        ex = int(cx + dx * radius * 0.75)
        ey = int(cy + dy * radius * 0.75)
        draw.line([(cx, cy), (ex, ey)], fill=(255, 255, 255), width=line_width)
    
    return img

# Generate all sizes
for size in [16, 48, 128]:
    img = create_icon(size)
    path = f'icon{size}.png'
    img.save(path, 'PNG')
    print(f'Saved {path} ({img.size[0]}x{img.size[1]})')

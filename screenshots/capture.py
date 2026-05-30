"""Generate CWS screenshots using headless Chrome via subprocess."""
import os, sys, subprocess, time

CHROME = r"C:\Users\Administrator\AppData\Local\ms-playwright\chromium-1223\chrome-win64\chrome.exe"
OUTDIR = os.path.dirname(os.path.abspath(__file__))

SCREENSHOTS = [
    "screenshot-main",
    "screenshot-context-menu", 
    "screenshot-translate",
    "screenshot-theme",
    "screenshot-shortcut",
]

def capture_screenshot(html_name, output_png):
    """Use Chrome's headless screenshot feature."""
    html_path = os.path.join(OUTDIR, html_name)
    if not os.path.exists(html_path):
        return False
    
    url = f"file://{os.path.abspath(html_path)}"
    
    # Try new Chrome headless: --headless=new --screenshot=path
    try:
        subprocess.run([
            CHROME,
            "--headless=new",
            "--disable-gpu",
            "--no-sandbox",
            f"--screenshot={output_png}",
            "--window-size=1280,720",
            "--device-scale-factor=2",
            url,
        ], capture_output=True, timeout=30)
        
        return os.path.exists(output_png) and os.path.getsize(output_png) > 1000
    except Exception as e:
        print(f"  ⚠ Chrome headless error: {e}")
        return False

def main():
    for name in SCREENSHOTS:
        html_name = f"{name}.html"
        png_name = f"{name}.png"
        out_path = os.path.join(OUTDIR, png_name)
        
        if os.path.exists(out_path):
            size = os.path.getsize(out_path)
            print(f"✅ {png_name} already exists ({size/1024:.0f}KB)")
            continue
        
        success = capture_screenshot(html_name, out_path)
        if success and os.path.exists(out_path):
            size = os.path.getsize(out_path)
            print(f"✅ {png_name} ({size/1024:.0f}KB)")
        else:
            print(f"❌ {name}.html -> capture failed")

if __name__ == "__main__":
    main()

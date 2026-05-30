#!/usr/bin/env python3
"""Generate Chrome Web Store screenshots from preview.html."""
import subprocess, sys, os

# Use Playwright if available
try:
    from playwright.sync_api import sync_playwright
except ImportError:
    print("Playwright not installed. Installing...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "playwright"])
    from playwright.sync_api import sync_playwright

def main():
    screenshots = [
        # (section_css_selector, output_filename, title_for_logging)
        ("#ss1", "screenshot-main.png", "Main Editor Interface"),
        ("#ss2", "screenshot-context-menu.png", "Right-click Context Menu"),
        ("#ss3", "screenshot-translate.png", "Multi-language Translate"),
        ("#ss4", "screenshot-theme.png", "Custom Theme Editor"),
        ("#ss5", "screenshot-shortcut.png", "Keyboard Shortcut Manager"),
    ]

    html_path = os.path.join(os.path.dirname(__file__), "preview.html")
    file_url = f"file://{os.path.abspath(html_path)}"
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1400, "height": 950},
            device_scale_factor=1,
        )
        page = context.new_page()
        
        for selector, filename, title in screenshots:
            output_path = os.path.join(os.path.dirname(__file__), filename)
            
            page.goto(file_url)
            # Wait for content to render
            page.wait_for_load_state("domcontentloaded")
            page.wait_for_timeout(500)
            
            # Scroll to the section
            element = page.query_selector(selector)
            if element:
                element.scroll_into_view_if_needed()
                # Take a full-page screenshot and crop to just this section
                page.wait_for_timeout(300)
                
                # Get bounding box relative to viewport
                bbox = element.bounding_box()
                if bbox:
                    # Expand the viewport slightly to include the label above
                    page.set_viewport_size({"width": 1400, "height": 950})
                    page.screenshot(path=output_path, clip={
                        "x": max(0, bbox["x"] - 20),
                        "y": max(0, bbox["y"] - 60),
                        "width": min(1400, bbox["w"] + 40),
                        "height": min(800, bbox["h"] + 80),
                    })
                    
                    file_size = os.path.getsize(output_path)
                    print(f"✅ {title}: saved to {filename} ({file_size/1024:.0f}KB)")
                else:
                    # Fallback: screenshot full section (just the canvas)
                    page.screenshot(path=output_path, clip={
                        "x": 0, "y": bbox["y"],
                        "width": bbox["w"], "height": bbox["h"]
                    }) if bbox else None
            else:
                print(f"❌ {title}: element not found")
        
        browser.close()

if __name__ == "__main__":
    main()

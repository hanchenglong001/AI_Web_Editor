# Generate CWS screenshots using headless Chrome directly
$chromePath = "C:\Users\Administrator\AppData\Local\ms-playwright\chromium-1223\chrome-win64\chrome.exe"
$outDir = "C:\Users\Administrator\Desktop\ai-web-editor-extension\screenshots"

$files = @(
    "screenshot-main.html",
    "screenshot-context-menu.html", 
    "screenshot-translate.html",
    "screenshot-theme.html",
    "screenshot-shortcut.html"
)

foreach ($file in $files) {
    $inFile = Join-Path $outDir $file
    $pngName = $file -replace '\.html$', '.png'
    $outPng = Join-Path $outDir $pngName
    
    if (Test-Path $inFile) {
        $url = "file://$((Resolve-Path $inFile).ProviderPath)"
        Start-Process $chromePath -ArgumentList @(
            "--headless=new",
            "--disable-gpu",
            "--no-sandbox",
            "--screenshot=$outPng",
            "--window-size=1280,720",
            "--device-scale-factor=2",
            $url
        ) -NoNewWindow -Wait
        
        $size = (Get-Item $outPng).Length / 1KB
        Write-Host "✅ $pngName (${size:.0f}KB)"
    } else {
        Write-Host "❌ Missing: $file"
    }
}

Write-Host "`nAll screenshots generated!"

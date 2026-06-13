$htmlPath = "c:\Users\tiger\Desktop\Employee_Card-main\index.html"
$content = Get-Content -Raw -Path $htmlPath -Encoding UTF8

# Extract CSS
if ($content -match '(?s)<style>(.*?)</style>') {
    $css = $matches[1].Trim()
    $cssDir = Join-Path (Split-Path $htmlPath) "css"
    if (!(Test-Path $cssDir)) { New-Item -ItemType Directory -Path $cssDir | Out-Null }
    Set-Content -Path (Join-Path $cssDir "style.css") -Value $css -Encoding UTF8
    $content = $content -replace '(?s)<style>.*?</style>', '<link rel="stylesheet" href="css/style.css">'
}

# Extract JS
if ($content -match '(?s)<script>\s*const SHEET_ID(.*?)</script>') {
    $js = "const SHEET_ID" + $matches[1].Trim()
    $jsDir = Join-Path (Split-Path $htmlPath) "js"
    if (!(Test-Path $jsDir)) { New-Item -ItemType Directory -Path $jsDir | Out-Null }
    Set-Content -Path (Join-Path $jsDir "script.js") -Value $js -Encoding UTF8
    $content = $content -replace '(?s)<script>\s*const SHEET_ID.*?</script>', '<script src="js/script.js"></script>'
}

Set-Content -Path $htmlPath -Value $content -Encoding UTF8
Write-Host "Files successfully split!"

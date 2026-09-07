
Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Image]::FromFile('F:\gsv_server plugin\frontend\src\assets\gsvlogo.png')
$bmp = New-Object System.Drawing.Bitmap(256, 256)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.DrawImage($img, 0, 0, 256, 256)
$g.Dispose()

$hIcon = $bmp.GetHicon()
$icon = [System.Drawing.Icon]::FromHandle($hIcon)
$stream = [System.IO.File]::Create('F:\gsv_server plugin\e_office_flutter\windows\runner\resources\app_icon.ico')
$icon.Save($stream)
$stream.Close()
$img.Dispose()
$bmp.Dispose()
Write-Host "Windows app_icon.ico created successfully!"


Add-Type -AssemblyName System.Drawing
$src = [System.Drawing.Image]::FromFile('F:\\gsv_server plugin\\frontend\\src\\assets\\gsvlogo.png')


$destBmp = New-Object System.Drawing.Bitmap(48, 48)
$g = [System.Drawing.Graphics]::FromImage($destBmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.DrawImage($src, 0, 0, 48, 48)
$g.Dispose()
$destBmp.Save('F:\\gsv_server plugin\\e_office_flutter\\android\\app\\src\\main\\res\\mipmap-mdpi\\ic_launcher.png', [System.Drawing.Imaging.ImageFormat]::Png)
$destBmp.Dispose()
Write-Host "Generated: F:\\gsv_server plugin\\e_office_flutter\\android\\app\\src\\main\\res\\mipmap-mdpi\\ic_launcher.png (48x48)"


$destBmp = New-Object System.Drawing.Bitmap(48, 48)
$g = [System.Drawing.Graphics]::FromImage($destBmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.DrawImage($src, 0, 0, 48, 48)
$g.Dispose()
$destBmp.Save('F:\\gsv_server plugin\\e_office_flutter\\android\\app\\src\\main\\res\\mipmap-mdpi\\ic_launcher_round.png', [System.Drawing.Imaging.ImageFormat]::Png)
$destBmp.Dispose()
Write-Host "Generated: F:\\gsv_server plugin\\e_office_flutter\\android\\app\\src\\main\\res\\mipmap-mdpi\\ic_launcher_round.png (48x48)"


$destBmp = New-Object System.Drawing.Bitmap(72, 72)
$g = [System.Drawing.Graphics]::FromImage($destBmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.DrawImage($src, 0, 0, 72, 72)
$g.Dispose()
$destBmp.Save('F:\\gsv_server plugin\\e_office_flutter\\android\\app\\src\\main\\res\\mipmap-hdpi\\ic_launcher.png', [System.Drawing.Imaging.ImageFormat]::Png)
$destBmp.Dispose()
Write-Host "Generated: F:\\gsv_server plugin\\e_office_flutter\\android\\app\\src\\main\\res\\mipmap-hdpi\\ic_launcher.png (72x72)"


$destBmp = New-Object System.Drawing.Bitmap(72, 72)
$g = [System.Drawing.Graphics]::FromImage($destBmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.DrawImage($src, 0, 0, 72, 72)
$g.Dispose()
$destBmp.Save('F:\\gsv_server plugin\\e_office_flutter\\android\\app\\src\\main\\res\\mipmap-hdpi\\ic_launcher_round.png', [System.Drawing.Imaging.ImageFormat]::Png)
$destBmp.Dispose()
Write-Host "Generated: F:\\gsv_server plugin\\e_office_flutter\\android\\app\\src\\main\\res\\mipmap-hdpi\\ic_launcher_round.png (72x72)"


$destBmp = New-Object System.Drawing.Bitmap(96, 96)
$g = [System.Drawing.Graphics]::FromImage($destBmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.DrawImage($src, 0, 0, 96, 96)
$g.Dispose()
$destBmp.Save('F:\\gsv_server plugin\\e_office_flutter\\android\\app\\src\\main\\res\\mipmap-xhdpi\\ic_launcher.png', [System.Drawing.Imaging.ImageFormat]::Png)
$destBmp.Dispose()
Write-Host "Generated: F:\\gsv_server plugin\\e_office_flutter\\android\\app\\src\\main\\res\\mipmap-xhdpi\\ic_launcher.png (96x96)"


$destBmp = New-Object System.Drawing.Bitmap(96, 96)
$g = [System.Drawing.Graphics]::FromImage($destBmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.DrawImage($src, 0, 0, 96, 96)
$g.Dispose()
$destBmp.Save('F:\\gsv_server plugin\\e_office_flutter\\android\\app\\src\\main\\res\\mipmap-xhdpi\\ic_launcher_round.png', [System.Drawing.Imaging.ImageFormat]::Png)
$destBmp.Dispose()
Write-Host "Generated: F:\\gsv_server plugin\\e_office_flutter\\android\\app\\src\\main\\res\\mipmap-xhdpi\\ic_launcher_round.png (96x96)"


$destBmp = New-Object System.Drawing.Bitmap(144, 144)
$g = [System.Drawing.Graphics]::FromImage($destBmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.DrawImage($src, 0, 0, 144, 144)
$g.Dispose()
$destBmp.Save('F:\\gsv_server plugin\\e_office_flutter\\android\\app\\src\\main\\res\\mipmap-xxhdpi\\ic_launcher.png', [System.Drawing.Imaging.ImageFormat]::Png)
$destBmp.Dispose()
Write-Host "Generated: F:\\gsv_server plugin\\e_office_flutter\\android\\app\\src\\main\\res\\mipmap-xxhdpi\\ic_launcher.png (144x144)"


$destBmp = New-Object System.Drawing.Bitmap(144, 144)
$g = [System.Drawing.Graphics]::FromImage($destBmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.DrawImage($src, 0, 0, 144, 144)
$g.Dispose()
$destBmp.Save('F:\\gsv_server plugin\\e_office_flutter\\android\\app\\src\\main\\res\\mipmap-xxhdpi\\ic_launcher_round.png', [System.Drawing.Imaging.ImageFormat]::Png)
$destBmp.Dispose()
Write-Host "Generated: F:\\gsv_server plugin\\e_office_flutter\\android\\app\\src\\main\\res\\mipmap-xxhdpi\\ic_launcher_round.png (144x144)"


$destBmp = New-Object System.Drawing.Bitmap(192, 192)
$g = [System.Drawing.Graphics]::FromImage($destBmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.DrawImage($src, 0, 0, 192, 192)
$g.Dispose()
$destBmp.Save('F:\\gsv_server plugin\\e_office_flutter\\android\\app\\src\\main\\res\\mipmap-xxxhdpi\\ic_launcher.png', [System.Drawing.Imaging.ImageFormat]::Png)
$destBmp.Dispose()
Write-Host "Generated: F:\\gsv_server plugin\\e_office_flutter\\android\\app\\src\\main\\res\\mipmap-xxxhdpi\\ic_launcher.png (192x192)"


$destBmp = New-Object System.Drawing.Bitmap(192, 192)
$g = [System.Drawing.Graphics]::FromImage($destBmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.DrawImage($src, 0, 0, 192, 192)
$g.Dispose()
$destBmp.Save('F:\\gsv_server plugin\\e_office_flutter\\android\\app\\src\\main\\res\\mipmap-xxxhdpi\\ic_launcher_round.png', [System.Drawing.Imaging.ImageFormat]::Png)
$destBmp.Dispose()
Write-Host "Generated: F:\\gsv_server plugin\\e_office_flutter\\android\\app\\src\\main\\res\\mipmap-xxxhdpi\\ic_launcher_round.png (192x192)"


$destBmp = New-Object System.Drawing.Bitmap(192, 192)
$g = [System.Drawing.Graphics]::FromImage($destBmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.DrawImage($src, 0, 0, 192, 192)
$g.Dispose()
$destBmp.Save('F:\\gsv_server plugin\\e_office_flutter\\web\\icons\\Icon-192.png', [System.Drawing.Imaging.ImageFormat]::Png)
$destBmp.Dispose()
Write-Host "Generated: F:\\gsv_server plugin\\e_office_flutter\\web\\icons\\Icon-192.png (192x192)"


$destBmp = New-Object System.Drawing.Bitmap(512, 512)
$g = [System.Drawing.Graphics]::FromImage($destBmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.DrawImage($src, 0, 0, 512, 512)
$g.Dispose()
$destBmp.Save('F:\\gsv_server plugin\\e_office_flutter\\web\\icons\\Icon-512.png', [System.Drawing.Imaging.ImageFormat]::Png)
$destBmp.Dispose()
Write-Host "Generated: F:\\gsv_server plugin\\e_office_flutter\\web\\icons\\Icon-512.png (512x512)"


$destBmp = New-Object System.Drawing.Bitmap(192, 192)
$g = [System.Drawing.Graphics]::FromImage($destBmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.DrawImage($src, 0, 0, 192, 192)
$g.Dispose()
$destBmp.Save('F:\\gsv_server plugin\\e_office_flutter\\web\\icons\\Icon-maskable-192.png', [System.Drawing.Imaging.ImageFormat]::Png)
$destBmp.Dispose()
Write-Host "Generated: F:\\gsv_server plugin\\e_office_flutter\\web\\icons\\Icon-maskable-192.png (192x192)"


$destBmp = New-Object System.Drawing.Bitmap(512, 512)
$g = [System.Drawing.Graphics]::FromImage($destBmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.DrawImage($src, 0, 0, 512, 512)
$g.Dispose()
$destBmp.Save('F:\\gsv_server plugin\\e_office_flutter\\web\\icons\\Icon-maskable-512.png', [System.Drawing.Imaging.ImageFormat]::Png)
$destBmp.Dispose()
Write-Host "Generated: F:\\gsv_server plugin\\e_office_flutter\\web\\icons\\Icon-maskable-512.png (512x512)"


$destBmp = New-Object System.Drawing.Bitmap(64, 64)
$g = [System.Drawing.Graphics]::FromImage($destBmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.DrawImage($src, 0, 0, 64, 64)
$g.Dispose()
$destBmp.Save('F:\\gsv_server plugin\\e_office_flutter\\web\\favicon.png', [System.Drawing.Imaging.ImageFormat]::Png)
$destBmp.Dispose()
Write-Host "Generated: F:\\gsv_server plugin\\e_office_flutter\\web\\favicon.png (64x64)"

$src.Dispose()

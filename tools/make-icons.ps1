# Generates the app icons (a runner silhouette leaping over a rooftop) into www/icons.
Add-Type -AssemblyName System.Drawing
$out = Join-Path $PSScriptRoot '..\www\icons'
New-Item -ItemType Directory -Force $out | Out-Null

foreach ($size in 192, 512) {
  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'AntiAlias'
  $s = $size / 192.0
  $rect = New-Object System.Drawing.Rectangle 0, 0, $size, $size
  $sky = New-Object System.Drawing.Drawing2D.LinearGradientBrush $rect, ([System.Drawing.Color]::FromArgb(188, 214, 230)), ([System.Drawing.Color]::FromArgb(242, 246, 248)), 90
  $g.FillRectangle($sky, $rect)
  $roof = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(86, 96, 110))
  $g.FillRectangle($roof, 0, [int](130 * $s), [int](70 * $s), $size)
  $g.FillRectangle($roof, [int](118 * $s), [int](118 * $s), $size, $size)
  $ink = [System.Drawing.Color]::FromArgb(18, 21, 27)
  $pen = New-Object System.Drawing.Pen $ink, (9 * $s)
  $pen.StartCap = 'Round'; $pen.EndCap = 'Round'; $pen.LineJoin = 'Round'
  $limb = New-Object System.Drawing.Pen $ink, (7 * $s)
  $limb.StartCap = 'Round'; $limb.EndCap = 'Round'; $limb.LineJoin = 'Round'
  function P($x, $y) { New-Object System.Drawing.PointF ([float]($x * $s)), ([float]($y * $s)) }
  $g.DrawLine($pen, (P 92 92), (P 112 66))
  $g.FillEllipse((New-Object System.Drawing.SolidBrush $ink), [float](110 * $s), [float](44 * $s), [float](18 * $s), [float](18 * $s))
  $g.DrawLines($limb, [System.Drawing.PointF[]]@((P 92 92), (P 116 96), (P 118 116)))
  $g.DrawLines($limb, [System.Drawing.PointF[]]@((P 92 92), (P 70 100), (P 56 92)))
  $g.DrawLines($limb, [System.Drawing.PointF[]]@((P 108 70), (P 128 62), (P 142 50)))
  $g.DrawLines($limb, [System.Drawing.PointF[]]@((P 106 72), (P 86 64), (P 74 52)))
  $scarf = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(25, 195, 214)), (4 * $s)
  $g.DrawBezier($scarf, (P 110 68), (P 98 62), (P 90 74), (P 78 68))
  $bmp.Save((Join-Path $out "icon-$size.png"), [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose()
}
Write-Output "Icons written to $out"

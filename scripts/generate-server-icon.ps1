Add-Type -AssemblyName System.Drawing
$size = 512
$bmp = [System.Drawing.Bitmap]::new($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$graphics = [System.Drawing.Graphics]::FromImage($bmp)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$copper = [System.Drawing.Color]::FromArgb(255, 217, 128, 67)
$white = [System.Drawing.Color]::FromArgb(255, 241, 233, 225)
$dark = [System.Drawing.Color]::FromArgb(255, 23, 21, 19)
$graphics.Clear([System.Drawing.Color]::Transparent)
$background = [System.Drawing.Drawing2D.GraphicsPath]::new()
$background.AddArc(0, 0, 224, 224, 180, 90); $background.AddArc(288, 0, 224, 224, 270, 90)
$background.AddArc(288, 288, 224, 224, 0, 90); $background.AddArc(0, 288, 224, 224, 90, 90)
$background.CloseFigure(); $backgroundBrush = [System.Drawing.SolidBrush]::new($dark)
$graphics.FillPath($backgroundBrush, $background); $background.Dispose(); $backgroundBrush.Dispose()
$arcPen = [System.Drawing.Pen]::new($copper, 32)
$arcPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
$arcPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
$graphics.DrawArc($arcPen, 70, 70, 372, 372, 45, 270)
$rackPen = [System.Drawing.Pen]::new($white, 8)
$rackBrush = [System.Drawing.SolidBrush]::new($dark)
$whiteBrush = [System.Drawing.SolidBrush]::new($white)
$copperBrush = [System.Drawing.SolidBrush]::new($copper)
function New-RoundedRectPath([int]$x, [int]$y, [int]$w, [int]$h, [int]$r) {
    $p = [System.Drawing.Drawing2D.GraphicsPath]::new()
    $d = $r * 2
    $p.AddArc($x, $y, $d, $d, 180, 90); $p.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
    $p.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90); $p.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
    $p.CloseFigure(); return $p
}
foreach ($y in @(194, 258, 322)) {
    $rack = New-RoundedRectPath 180 $y 142 42 12
    $graphics.FillPath($rackBrush, $rack); $graphics.DrawPath($rackPen, $rack); $rack.Dispose()
    $graphics.FillEllipse($copperBrush, 195, $y + 14, 14, 14)
    $line = New-RoundedRectPath 224 ($y + 17) 78 7 3
    $graphics.FillPath($whiteBrush, $line); $line.Dispose()
}
$graphics.Dispose()
$arcPen.Dispose(); $rackPen.Dispose(); $rackBrush.Dispose(); $whiteBrush.Dispose(); $copperBrush.Dispose()
$bmp.Save((Join-Path $PSScriptRoot '..\icon.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Save((Join-Path $PSScriptRoot '..\dashboard\brand.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$stream = [System.IO.MemoryStream]::new()
$bmp.Save($stream, [System.Drawing.Imaging.ImageFormat]::Png)
$png = $stream.ToArray()
$ico = [System.IO.MemoryStream]::new()
$writer = [System.IO.BinaryWriter]::new($ico)
$writer.Write([UInt16]0); $writer.Write([UInt16]1); $writer.Write([UInt16]1)
$writer.Write([Byte]0); $writer.Write([Byte]0); $writer.Write([Byte]0); $writer.Write([Byte]0)
$writer.Write([UInt16]1); $writer.Write([UInt16]32); $writer.Write([UInt32]$png.Length); $writer.Write([UInt32]22); $writer.Write($png)
[System.IO.File]::WriteAllBytes((Join-Path $PSScriptRoot '..\icon.ico'), $ico.ToArray())
$writer.Dispose(); $stream.Dispose(); $bmp.Dispose()

Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$sourcePath = Join-Path $root 'assets\branding\cobre-desktop-base.ico'
$source = [System.IO.File]::ReadAllBytes($sourcePath)
$frameCount = [BitConverter]::ToUInt16($source, 4)
$frames = [System.Collections.Generic.List[byte[]]]::new()
$entries = [System.Collections.Generic.List[object]]::new()

function New-RoundedRect([int]$x, [int]$y, [int]$width, [int]$height, [int]$radius) {
    $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
    $diameter = $radius * 2
    $path.AddArc($x, $y, $diameter, $diameter, 180, 90)
    $path.AddArc($x + $width - $diameter, $y, $diameter, $diameter, 270, 90)
    $path.AddArc($x + $width - $diameter, $y + $height - $diameter, $diameter, $diameter, 0, 90)
    $path.AddArc($x, $y + $height - $diameter, $diameter, $diameter, 90, 90)
    $path.CloseFigure()
    return $path
}

for ($i = 0; $i -lt $frameCount; $i++) {
    $entryOffset = 6 + ($i * 16)
    $width = [int]$source[$entryOffset]
    $height = [int]$source[$entryOffset + 1]
    if ($width -eq 0) { $width = 256 }
    if ($height -eq 0) { $height = 256 }
    $length = [BitConverter]::ToUInt32($source, $entryOffset + 8)
    $offset = [BitConverter]::ToUInt32($source, $entryOffset + 12)

    $pngBytes = [byte[]]::new($length)
    [Array]::Copy($source, $offset, $pngBytes, 0, $length)
    $input = [System.IO.MemoryStream]::new($pngBytes)
    $bitmap = [System.Drawing.Bitmap]::new($input)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    $scale = $width / 256.0
    $center = $width / 2.0
    $patchRadius = [Math]::Max(3.0, 65.0 * $scale)
    $sample = $bitmap.GetPixel([Math]::Min($width - 1, [int]$center), [Math]::Max(0, [int]($center - (64.0 * $scale))))
    $background = [System.Drawing.SolidBrush]::new($sample)
    $graphics.FillEllipse($background, [single]($center - $patchRadius), [single]($center - $patchRadius), [single]($patchRadius * 2), [single]($patchRadius * 2))
    $background.Dispose()

    # Replaces only the central audio mark; the C, copper glow and background come from the Desktop icon.
    $ink = [System.Drawing.Color]::FromArgb(255, 236, 230, 223)
    $pen = [System.Drawing.Pen]::new($ink, [single][Math]::Max(0.8, 2.8 * $scale))
    $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $rowWidth = 60.0 * $scale
    $rowHeight = 15.0 * $scale
    $radius = [Math]::Max(1.0, 4.0 * $scale)
    foreach ($offsetY in @(-23.0, 0.0, 23.0)) {
        $y = [single]($center + ($offsetY * $scale) - ($rowHeight / 2.0))
        $x = [single]($center - ($rowWidth / 2.0))
        $shape = New-RoundedRect ([int]$x) ([int]$y) ([int]$rowWidth) ([int]$rowHeight) ([int]$radius)
        $graphics.DrawPath($pen, $shape)
        $shape.Dispose()
    }
    $pen.Dispose()
    $graphics.Dispose()

    $output = [System.IO.MemoryStream]::new()
    $bitmap.Save($output, [System.Drawing.Imaging.ImageFormat]::Png)
    $frames.Add($output.ToArray())
    $entries.Add([pscustomobject]@{ Width = $width; Height = $height })
    $output.Dispose()
    $bitmap.Dispose()
    $input.Dispose()
}

$iconStream = [System.IO.MemoryStream]::new()
$writer = [System.IO.BinaryWriter]::new($iconStream)
$writer.Write([UInt16]0); $writer.Write([UInt16]1); $writer.Write([UInt16]$frameCount)
$nextOffset = 6 + (16 * $frameCount)
for ($i = 0; $i -lt $frameCount; $i++) {
    $w = $entries[$i].Width
    $h = $entries[$i].Height
    $writer.Write([byte]$(if ($w -eq 256) { 0 } else { $w }))
    $writer.Write([byte]$(if ($h -eq 256) { 0 } else { $h }))
    $writer.Write([byte]0); $writer.Write([byte]0); $writer.Write([UInt16]1); $writer.Write([UInt16]32)
    $writer.Write([UInt32]$frames[$i].Length); $writer.Write([UInt32]$nextOffset)
    $nextOffset += $frames[$i].Length
}
foreach ($frame in $frames) { $writer.Write($frame) }
[System.IO.File]::WriteAllBytes((Join-Path $root 'icon.ico'), $iconStream.ToArray())
$writer.Dispose(); $iconStream.Dispose()

$large = [System.Drawing.Bitmap]::new(512, 512, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$graphics = [System.Drawing.Graphics]::FromImage($large)
$graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$largeFrameStream = [System.IO.MemoryStream]::new($frames[$frames.Count - 1])
$framesBitmap = [System.Drawing.Bitmap]::new($largeFrameStream)
$graphics.DrawImage($framesBitmap, 0, 0, 512, 512)
$large.Save((Join-Path $root 'icon.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$large.Save((Join-Path $root 'dashboard\brand.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$graphics.Dispose(); $large.Dispose(); $framesBitmap.Dispose(); $largeFrameStream.Dispose()

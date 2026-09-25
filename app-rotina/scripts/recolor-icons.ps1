Add-Type -AssemblyName System.Drawing

$iconNames = @('icon-192.png', 'icon-512.png', 'icon-maskable-512.png')
$sourceDark = [double[]]@(45, 88, 74)
$sourceLight = [double[]]@(232, 247, 239)
$targetDark = [double[]]@(25, 20, 17)
$targetLight = [double[]]@(213, 181, 146)
$direction = @(0, 1, 2) | ForEach-Object { $sourceLight[$_] - $sourceDark[$_] }
$distanceSquared = ($direction | ForEach-Object { $_ * $_ } | Measure-Object -Sum).Sum

foreach ($name in $iconNames) {
  $sourcePath = Join-Path $PSScriptRoot "../public/$name"
  $targetPath = Join-Path $PSScriptRoot "../public/$($name.Replace('icon-', 'icon-ebony-'))"
  $source = [System.Drawing.Bitmap]::new($sourcePath)
  $target = [System.Drawing.Bitmap]::new($source.Width, $source.Height)
  try {
    for ($y = 0; $y -lt $source.Height; $y++) {
      for ($x = 0; $x -lt $source.Width; $x++) {
        $pixel = $source.GetPixel($x, $y)
        $projection = (($pixel.R - $sourceDark[0]) * $direction[0]) + (($pixel.G - $sourceDark[1]) * $direction[1]) + (($pixel.B - $sourceDark[2]) * $direction[2])
        $blend = [math]::Clamp($projection / $distanceSquared, 0, 1)
        $red = [int][math]::Round($targetDark[0] + ($targetLight[0] - $targetDark[0]) * $blend)
        $green = [int][math]::Round($targetDark[1] + ($targetLight[1] - $targetDark[1]) * $blend)
        $blue = [int][math]::Round($targetDark[2] + ($targetLight[2] - $targetDark[2]) * $blend)
        $target.SetPixel($x, $y, [System.Drawing.Color]::FromArgb($pixel.A, $red, $green, $blue))
      }
    }
    $target.Save($targetPath, [System.Drawing.Imaging.ImageFormat]::Png)
  } finally {
    $source.Dispose()
    $target.Dispose()
  }
}

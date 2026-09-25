param([string]$Archive = (Join-Path $PSScriptRoot '../../agent1000 website108-2026-09-23/59-academy.zip'))
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$academyRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../public/templates'))
$academyZip = [IO.Compression.ZipFile]::OpenRead((Resolve-Path -LiteralPath $Archive))
try {
  foreach ($entry in $academyZip.Entries) {
    if (-not $entry.FullName.StartsWith('public/templates/')) { continue }
    $relative = $entry.FullName.Substring('public/templates/'.Length)
    if ($relative -notmatch '^(ACADEMY_MULTI_[A-Z]+|_shared)/' -or -not $entry.Name) { continue }
    $target = [IO.Path]::GetFullPath((Join-Path $academyRoot $relative))
    if (-not $target.StartsWith($academyRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { throw 'Unsafe archive entry' }
    [IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($target)) | Out-Null
    if (Test-Path -LiteralPath $target) { continue }
    [IO.Compression.ZipFileExtensions]::ExtractToFile($entry, $target, $false)
  }
} finally { $academyZip.Dispose() }
$hash = (Get-FileHash -LiteralPath $Archive -Algorithm SHA256).Hash
[IO.File]::WriteAllText((Join-Path $academyRoot 'provenance.json'), (@{ source = '59-academy.zip'; sha256 = $hash; adaptation = 'Original library assets; public pages bind academy records and approved copy instead of sample claims.' } | ConvertTo-Json), [Text.UTF8Encoding]::new($false))
Write-Output 'Imported academy website library assets.'

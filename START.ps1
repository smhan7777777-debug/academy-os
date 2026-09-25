param([switch]$NoBrowser)
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$academyPort = if ($env:PORT) { [int]$env:PORT } else { 5173 }
$academyUrl = "http://localhost:$academyPort"
function Test-AcademyServer {
    try {
        $health = Invoke-RestMethod -Uri "http://127.0.0.1:$academyPort/api/health" -TimeoutSec 5
        return ($health.ok -and $health.database -eq 'sqlite' -and $health.schema -eq 1 -and $health.release -eq 'single-academy-reviewed-v3')
    } catch { return $false }
}
try {
    if (-not $env:PORT) {
        while ($academyPort -le 5182) {
            if (Test-AcademyServer) { break }
            if (-not (Get-NetTCPConnection -LocalPort $academyPort -State Listen -ErrorAction SilentlyContinue)) { break }
            $academyPort++
        }
        if ($academyPort -gt 5182) { throw 'No available Academy OS port (5173-5182). Set PORT to an available port.' }
        $academyUrl = "http://localhost:$academyPort"
    }
    if (Test-AcademyServer) {
        if (-not $NoBrowser) { Start-Process $academyUrl }
        Write-Host "Academy OS is running at $academyUrl"
        exit 0
    }
    if (Get-NetTCPConnection -LocalPort $academyPort -State Listen -ErrorAction SilentlyContinue) {
        throw "Port $academyPort is used by another application. Close it or choose another PORT."
    }
    $nodeExe = (Get-Command node.exe -ErrorAction Stop).Source
    $nodeVersion = [version]((& $nodeExe --version).TrimStart('v'))
    if ($nodeVersion -lt [version]'24.14.0') { throw 'Node.js 24.14.0 or newer is required.' }
    if (-not (Test-Path -LiteralPath (Join-Path $PSScriptRoot 'node_modules/vite'))) {
        & npm.cmd ci
        if ($LASTEXITCODE -ne 0) { throw 'Dependency installation failed.' }
    }
    $logDir = Join-Path $env:LOCALAPPDATA 'AcademyOS'
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
    $env:PORT = [string]$academyPort
    $process = Start-Process -FilePath $nodeExe -ArgumentList 'server/index.js','--dev' -WorkingDirectory $PSScriptRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $logDir "server-$academyPort.stdout.log") -RedirectStandardError (Join-Path $logDir "server-$academyPort.stderr.log")
    for ($attempt = 0; $attempt -lt 40; $attempt++) {
        if (Test-AcademyServer) { if (-not $NoBrowser) { Start-Process $academyUrl }; Write-Host "Academy OS is running at $academyUrl (PID $($process.Id))."; exit 0 }
        if ($process.HasExited) { throw "Server stopped. See $logDir/server-$academyPort.stderr.log" }
        Start-Sleep -Milliseconds 250
    }
    throw "Server startup timed out. See $logDir/server-$academyPort.stderr.log"
} catch {
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

<#!
.SYNOPSIS
Starts the NeuroScan AI backend and frontend development servers together.

.DESCRIPTION
Run this script through `npm run dev` from the repository root. Press Ctrl+C
once to stop both child processes.
#>

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$backendRoot = Join-Path $projectRoot "backend"
$frontendRoot = Join-Path $projectRoot "frontend"
$python = Join-Path $backendRoot ".venv\Scripts\python.exe"
$frontendNodeModules = Join-Path $frontendRoot "node_modules"

if (-not (Test-Path -LiteralPath $python)) {
  throw "Backend virtual environment not found at '$python'. Set it up once before running this command."
}
if (-not (Test-Path -LiteralPath $frontendNodeModules)) {
  throw "Frontend dependencies are missing. Run 'npm install' inside the frontend folder once."
}

$backendProcess = $null
$frontendProcess = $null

try {
  Write-Host "Starting NeuroScan AI backend at http://127.0.0.1:8000 ..." -ForegroundColor Cyan
  $backendProcess = Start-Process `
    -FilePath $python `
    -ArgumentList "-m", "uvicorn", "app.main:app", "--reload", "--port", "8000" `
    -WorkingDirectory $backendRoot `
    -NoNewWindow `
    -PassThru

  Write-Host "Starting NeuroScan AI frontend at http://localhost:3000 ..." -ForegroundColor Cyan
  $frontendProcess = Start-Process `
    -FilePath "npm.cmd" `
    -ArgumentList "run", "dev" `
    -WorkingDirectory $frontendRoot `
    -NoNewWindow `
    -PassThru

  Write-Host "NeuroScan AI is starting. Press Ctrl+C to stop both services." -ForegroundColor Green
  Wait-Process -Id $frontendProcess.Id
}
finally {
  foreach ($process in @($frontendProcess, $backendProcess)) {
    if ($null -ne $process -and -not $process.HasExited) {
      Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
    }
  }
}

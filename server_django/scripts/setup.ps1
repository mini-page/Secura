param(
  [switch]$SkipVenv,
  [switch]$SkipMigrate,
  [switch]$SkipSeed
)

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$project = Split-Path -Parent $root
$venv = Join-Path $project '.venv'

if (-not $SkipVenv) {
  if (-not (Test-Path $venv)) {
    python -m venv $venv
  }
  & "$venv\Scripts\Activate.ps1"
  pip install -r (Join-Path $project 'requirements.txt')
}

if (-not $SkipMigrate) {
  python (Join-Path $project 'manage.py') makemigrations
  python (Join-Path $project 'manage.py') migrate
}

if (-not $SkipSeed) {
  python (Join-Path $root 'seed.py')
}

$ErrorActionPreference = "Stop"

$MinNodeMajor = if ($env:MLCLAW_MIN_NODE_MAJOR) { [int]$env:MLCLAW_MIN_NODE_MAJOR } else { 22 }
$NodeVersion = if ($env:MLCLAW_NODE_VERSION) { $env:MLCLAW_NODE_VERSION } else { "v24.16.0" }
$PackageSpec = if ($env:MLCLAW_NPM_SPEC) { $env:MLCLAW_NPM_SPEC } else { "mlclaw" }
$CacheRoot = if ($env:MLCLAW_CACHE_DIR) {
  $env:MLCLAW_CACHE_DIR
} elseif ($env:LOCALAPPDATA) {
  Join-Path $env:LOCALAPPDATA "mlclaw"
} else {
  Join-Path $HOME ".cache\mlclaw"
}

function Get-NodeMajor($NodeBin) {
  try {
    $major = & $NodeBin -p 'Number(process.versions.node.split(".")[0])'
    return [int]$major
  } catch {
    return 0
  }
}

function Test-CompatibleNode($NodeBin) {
  return (Get-NodeMajor $NodeBin) -ge $MinNodeMajor
}

function Get-SystemNode {
  $cmd = Get-Command node -ErrorAction SilentlyContinue
  if ($cmd -and (Test-CompatibleNode $cmd.Source)) {
    return $cmd.Source
  }
  return $null
}

function Get-NodeArch {
  if ([System.Runtime.InteropServices.RuntimeInformation]::ProcessArchitecture -eq "Arm64") {
    return "arm64"
  }
  return "x64"
}

function Install-CachedNode {
  $arch = Get-NodeArch
  $archiveName = "node-$NodeVersion-win-$arch"
  $targetDir = Join-Path $CacheRoot "node\$NodeVersion-win-$arch"
  $nodeBin = Join-Path $targetDir "node.exe"
  if ((Test-Path $nodeBin) -and (Test-CompatibleNode $nodeBin)) {
    return $targetDir
  }

  $parent = Split-Path $targetDir -Parent
  New-Item -ItemType Directory -Force -Path $parent | Out-Null
  $tempDir = Join-Path ([System.IO.Path]::GetTempPath()) ("mlclaw-node-" + [System.Guid]::NewGuid().ToString("N"))
  New-Item -ItemType Directory -Force -Path $tempDir | Out-Null
  try {
    $zipPath = Join-Path $tempDir "node.zip"
    $url = "https://nodejs.org/dist/$NodeVersion/$archiveName.zip"
    Write-Error "mlclaw: installing Node.js $NodeVersion into $targetDir" -ErrorAction Continue
    Invoke-WebRequest -Uri $url -OutFile $zipPath
    Expand-Archive -Path $zipPath -DestinationPath $tempDir -Force
    if (Test-Path $targetDir) {
      Remove-Item -Recurse -Force $targetDir
    }
    Move-Item (Join-Path $tempDir $archiveName) $targetDir
  } finally {
    Remove-Item -Recurse -Force $tempDir -ErrorAction SilentlyContinue
  }
  return $targetDir
}

function Invoke-MLClaw($NodeBin, [string[]]$CliArgs) {
  $nodeDir = Split-Path $NodeBin -Parent
  $env:PATH = "$nodeDir;$env:PATH"
  $npmCli = Join-Path $nodeDir "node_modules\npm\bin\npm-cli.js"
  if (-not (Test-Path $npmCli)) {
    $npmCommand = Get-Command npm -ErrorAction SilentlyContinue
    if (-not $npmCommand) {
      throw "npm was not found for Node runtime $NodeBin"
    }
    & $npmCommand.Source exec --yes --package $PackageSpec -- mlclaw @CliArgs
    exit $LASTEXITCODE
  }
  & $NodeBin $npmCli exec --yes --package $PackageSpec -- mlclaw @CliArgs
  exit $LASTEXITCODE
}

function Test-NodeHasNpm($NodeBin) {
  $nodeDir = Split-Path $NodeBin -Parent
  $npmCli = Join-Path $nodeDir "node_modules\npm\bin\npm-cli.js"
  if (Test-Path $npmCli) {
    return $true
  }
  $oldPath = $env:PATH
  try {
    $env:PATH = "$nodeDir;$env:PATH"
    return [bool](Get-Command npm -ErrorAction SilentlyContinue)
  } finally {
    $env:PATH = $oldPath
  }
}

$node = Get-SystemNode
if ($node -and (Test-NodeHasNpm $node)) {
  Invoke-MLClaw $node $args
}

$nodeDir = Install-CachedNode
Invoke-MLClaw (Join-Path $nodeDir "node.exe") $args

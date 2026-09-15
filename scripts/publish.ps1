param([string]$Registry = 'registry.shnea.kr', [string]$Platforms = 'linux/amd64')
$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..')
$Changes = git status --porcelain
if ($LASTEXITCODE -ne 0) { throw 'Cannot inspect Git status.' }
if ($Changes) { throw 'Commit all release changes before publishing.' }
$ReleaseTag = git rev-parse --short=12 HEAD
if ($LASTEXITCODE -ne 0) { throw 'Cannot resolve release commit.' }
$PreviousPlatform = $env:DOCKER_DEFAULT_PLATFORM
try {
    $env:DOCKER_DEFAULT_PLATFORM = 'linux/amd64'
    & "$PSScriptRoot/verify.ps1"
} finally {
    $env:DOCKER_DEFAULT_PLATFORM = $PreviousPlatform
}
foreach ($Target in @('api', 'nginx')) {
    docker buildx build --platform $Platforms --target $Target --tag "${Registry}/jjapgma/${Target}:${ReleaseTag}" --push .
    if ($LASTEXITCODE -ne 0) { throw "Image publication failed: $Target" }
}
Write-Output "Published IMAGE_TAG=$ReleaseTag ($Platforms). Production deployment is separate."

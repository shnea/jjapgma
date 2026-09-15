$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..')
try {
    docker compose -f compose.test.yaml config --quiet
    if ($LASTEXITCODE -ne 0) { throw 'Compose validation failed.' }
    docker compose -f compose.test.yaml build
    if ($LASTEXITCODE -ne 0) { throw 'Docker build failed.' }
    docker compose -f compose.test.yaml up --abort-on-container-exit --exit-code-from test test
    if ($LASTEXITCODE -ne 0) { throw 'Docker verification failed.' }
} finally {
    docker compose -f compose.test.yaml down --remove-orphans
}

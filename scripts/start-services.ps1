# start-services.ps1 - launches local PostgreSQL, Redis, NestJS API, and Next.js web

$userProfile = $env:USERPROFILE
$pgBin = Join-Path $userProfile "pgsql\bin\postgres.exe"
$pgData = Join-Path $userProfile "pgsql\data"
$redisBin = "C:\Redis\redis-server.exe"

Write-Host "Checking PostgreSQL..."
$pgProc = Get-Process -Name postgres -ErrorAction SilentlyContinue
if (-not $pgProc) {
    Write-Host "Starting PostgreSQL from $pgBin..."
    Start-Process -FilePath $pgBin -ArgumentList @("-D", $pgData) -WindowStyle Hidden
    Start-Sleep -Seconds 2
} else {
    Write-Host "PostgreSQL is already running."
}

Write-Host "Checking Redis..."
$redisProc = Get-Process -Name redis-server -ErrorAction SilentlyContinue
if (-not $redisProc) {
    if (Test-Path $redisBin) {
        Write-Host "Starting Redis from $redisBin..."
        Start-Process -FilePath $redisBin -WindowStyle Hidden
        Start-Sleep -Seconds 1
    }
} else {
    Write-Host "Redis is already running."
}

# Verify connections
$pgOk = Test-NetConnection -ComputerName 127.0.0.1 -Port 5432 -InformationLevel Quiet
$redisOk = Test-NetConnection -ComputerName 127.0.0.1 -Port 6379 -InformationLevel Quiet

Write-Host "PostgreSQL (5432) active: $pgOk"
Write-Host "Redis (6379) active: $redisOk"

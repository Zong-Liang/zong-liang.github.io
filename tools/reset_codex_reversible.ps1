param(
    [ValidateSet('Reset', 'Rollback')]
    [string]$Mode = 'Reset',

    [string]$BackupRoot = (Join-Path $PSScriptRoot 'codex-reset-backups'),

    [string]$BackupId,

    [switch]$DryRun
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Write-Step {
    param([string]$Message)
    Write-Host "[codex-reset] $Message"
}

function Ensure-Directory {
    param([Parameter(Mandatory = $true)][string]$Path)

    if (-not (Test-Path -LiteralPath $Path)) {
        New-Item -ItemType Directory -Path $Path -Force | Out-Null
    }
}

function Get-JunctionTarget {
    param([Parameter(Mandatory = $true)][string]$Path)

    $item = Get-Item -LiteralPath $Path
    if (-not $item.Target) {
        throw "Path does not expose a junction target: $Path"
    }

    return [string]$item.Target
}

function Get-CodexTargets {
    $packageRoot = Join-Path $env:LOCALAPPDATA 'Packages\OpenAI.Codex_2p2nqsd0c76g0'
    $roamingRoot = Join-Path $env:APPDATA 'Codex'

    $targets = @(
        [pscustomobject]@{
            Name = 'RoamingCodex'
            Path = $roamingRoot
            RecreateAsDirectory = $true
        },
        [pscustomobject]@{
            Name = 'PackageSettings'
            Path = (Join-Path $packageRoot 'Settings')
            RecreateAsDirectory = $true
        },
        [pscustomobject]@{
            Name = 'PackageLocalState'
            Path = (Get-JunctionTarget (Join-Path $packageRoot 'LocalState'))
            RecreateAsDirectory = $true
        },
        [pscustomobject]@{
            Name = 'PackageLocalCache'
            Path = (Get-JunctionTarget (Join-Path $packageRoot 'LocalCache'))
            RecreateAsDirectory = $true
        },
        [pscustomobject]@{
            Name = 'PackageRoamingState'
            Path = (Get-JunctionTarget (Join-Path $packageRoot 'RoamingState'))
            RecreateAsDirectory = $true
        },
        [pscustomobject]@{
            Name = 'PackageTempState'
            Path = (Get-JunctionTarget (Join-Path $packageRoot 'TempState'))
            RecreateAsDirectory = $true
        }
    )

    $seen = @{}
    foreach ($target in $targets) {
        if ($seen.ContainsKey($target.Path)) {
            throw "Duplicate reset target resolved to the same path: $($target.Path)"
        }
        $seen[$target.Path] = $true
    }

    return $targets
}

function Stop-CodexProcesses {
    $processes = @(Get-Process -ErrorAction SilentlyContinue | Where-Object {
            $_.ProcessName -in @('Codex', 'codex')
        })

    if ($processes.Count -eq 0) {
        Write-Step 'No running Codex processes found.'
        return
    }

    Write-Step ("Stopping {0} Codex process(es)." -f $processes.Count)
    foreach ($process in $processes) {
        if ($DryRun) {
            Write-Step ("[dry-run] Would stop process {0} ({1})." -f $process.ProcessName, $process.Id)
            continue
        }

        Stop-Process -Id $process.Id -Force
    }

    if (-not $DryRun) {
        Start-Sleep -Milliseconds 800
    }
}

function Write-Manifest {
    param(
        [Parameter(Mandatory = $true)][string]$ManifestPath,
        [Parameter(Mandatory = $true)][object]$Manifest
    )

    $Manifest | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $ManifestPath -Encoding UTF8
}

function Invoke-Reset {
    $targets = Get-CodexTargets
    $resolvedBackupId = if ($BackupId) { $BackupId } else { Get-Date -Format 'yyyyMMdd-HHmmss' }
    $backupDir = Join-Path $BackupRoot $resolvedBackupId
    $manifestPath = Join-Path $backupDir 'manifest.json'

    Write-Step ("Reset mode. Backup id: {0}" -f $resolvedBackupId)
    Ensure-Directory -Path $BackupRoot

    if ((Test-Path -LiteralPath $backupDir) -and (-not $DryRun)) {
        throw "Backup directory already exists: $backupDir"
    }

    Stop-CodexProcesses

    if (-not $DryRun) {
        Ensure-Directory -Path $backupDir
    }

    $entries = @()
    foreach ($target in $targets) {
        $exists = Test-Path -LiteralPath $target.Path
        $backupPath = Join-Path $backupDir $target.Name

        $entries += [pscustomobject]@{
            Name = $target.Name
            OriginalPath = $target.Path
            BackupPath = $backupPath
            ExistedBeforeReset = $exists
            RecreateAsDirectory = $target.RecreateAsDirectory
        }

        if (-not $exists) {
            Write-Step ("Skipping missing target: {0}" -f $target.Path)
            continue
        }

        if ($DryRun) {
            Write-Step ("[dry-run] Would move '{0}' to '{1}'." -f $target.Path, $backupPath)
            if ($target.RecreateAsDirectory) {
                Write-Step ("[dry-run] Would recreate empty directory '{0}'." -f $target.Path)
            }
            continue
        }

        Write-Step ("Backing up '{0}'." -f $target.Path)
        Move-Item -LiteralPath $target.Path -Destination $backupPath

        if ($target.RecreateAsDirectory) {
            Ensure-Directory -Path $target.Path
        }
    }

    $manifest = [pscustomobject]@{
        backupId = $resolvedBackupId
        createdAt = (Get-Date).ToString('o')
        backupRoot = $BackupRoot
        mode = 'Reset'
        entries = $entries
    }

    if ($DryRun) {
        Write-Step ("[dry-run] Would write manifest to '{0}'." -f $manifestPath)
        return
    }

    Write-Manifest -ManifestPath $manifestPath -Manifest $manifest
    Write-Step ("Reset complete. Backup saved at '{0}'." -f $backupDir)
    Write-Step ("Rollback command: powershell -ExecutionPolicy Bypass -File `"{0}`" -Mode Rollback -BackupId {1}" -f $PSCommandPath, $resolvedBackupId)
}

function Invoke-Rollback {
    if (-not $BackupId) {
        throw 'Rollback mode requires -BackupId.'
    }

    $backupDir = Join-Path $BackupRoot $BackupId
    $manifestPath = Join-Path $backupDir 'manifest.json'
    $postResetDir = Join-Path $backupDir 'post-reset-state'

    if (-not (Test-Path -LiteralPath $manifestPath)) {
        throw "Backup manifest not found: $manifestPath"
    }

    $manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
    Stop-CodexProcesses

    if (-not $DryRun) {
        Ensure-Directory -Path $postResetDir
    }

    foreach ($entry in $manifest.entries) {
        $originalExists = Test-Path -LiteralPath $entry.OriginalPath
        $backupExists = Test-Path -LiteralPath $entry.BackupPath

        if (-not $backupExists) {
            Write-Step ("Skipping '{0}' because its backup is missing." -f $entry.Name)
            continue
        }

        if ($originalExists) {
            $currentStatePath = Join-Path $postResetDir $entry.Name

            if ($DryRun) {
                Write-Step ("[dry-run] Would move current '{0}' to '{1}'." -f $entry.OriginalPath, $currentStatePath)
            }
            else {
                Write-Step ("Saving current post-reset state for '{0}'." -f $entry.Name)
                Move-Item -LiteralPath $entry.OriginalPath -Destination $currentStatePath
            }
        }

        if ($DryRun) {
            Write-Step ("[dry-run] Would restore '{0}' to '{1}'." -f $entry.BackupPath, $entry.OriginalPath)
            continue
        }

        Write-Step ("Restoring '{0}'." -f $entry.Name)
        Move-Item -LiteralPath $entry.BackupPath -Destination $entry.OriginalPath
    }

    Write-Step ("Rollback complete from backup '{0}'." -f $BackupId)
}

if ($Mode -eq 'Reset') {
    Invoke-Reset
}
else {
    Invoke-Rollback
}

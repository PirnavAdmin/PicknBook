$historyDir = "C:\Users\Latitude\AppData\Roaming\Antigravity IDE\User\History"
$outDir = "C:\Users\Latitude\Desktop\Recovery"
if (!(Test-Path $outDir)) { New-Item -ItemType Directory -Force -Path $outDir }

$cutoff = 1787511600000
$recoveredCount = 0

foreach ($folder in Get-ChildItem -Path $historyDir -Directory) {
    $entriesFile = Join-Path $folder.FullName "entries.json"
    if (Test-Path $entriesFile) {
        $json = Get-Content $entriesFile -Raw | ConvertFrom-Json
        $res = $json.resource
        
        # Check if it's in our frontend/src
        if ($res -match "frontend/src") {
            # Parse the actual path from the URI
            $cleanPath = [System.Uri]::UnescapeDataString($res).Replace("file:///c:/", "C:\").Replace("/", "\")
            
            # Find the best entry before cutoff
            $bestEntry = $null
            foreach ($entry in $json.entries) {
                if ($entry.timestamp -lt $cutoff) {
                    if ($bestEntry -eq $null -or $entry.timestamp -gt $bestEntry.timestamp) {
                        $bestEntry = $entry
                    }
                }
            }
            
            if ($bestEntry -ne $null) {
                $srcFile = Join-Path $folder.FullName $bestEntry.id
                if (Test-Path $srcFile) {
                    # Figure out relative path to recreate structure
                    $relPath = $cleanPath.Substring($cleanPath.IndexOf("frontend\src"))
                    $destFile = Join-Path $outDir $relPath
                    $destDir = Split-Path $destFile -Parent
                    if (!(Test-Path $destDir)) { New-Item -ItemType Directory -Force -Path $destDir | Out-Null }
                    
                    Copy-Item -Path $srcFile -Destination $destFile -Force
                    Write-Host "Recovered: $relPath from $($bestEntry.timestamp)"
                    $recoveredCount++
                }
            }
        }
    }
}
Write-Host "Total recovered files: $recoveredCount"

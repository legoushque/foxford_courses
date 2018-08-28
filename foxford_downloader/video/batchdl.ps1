$counter = 1

$dlLinks = Get-Content log.txt | ? { $_.trim() -ne "" }

$dlLinks | ForEach-Object { Invoke-WebRequest -Uri "$_" -OutFile "$counter.mp4"; $counter++ }

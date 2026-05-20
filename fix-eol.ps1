$content = [System.IO.File]::ReadAllText("D:\PTIT\IOT\vroom-docker\docker-entrypoint.sh")
$content = $content -replace "`r`n", "`n"
[System.IO.File]::WriteAllText("D:\PTIT\IOT\vroom-docker\docker-entrypoint.sh", $content)

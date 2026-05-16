$ports = 5000,5001
$matches = Get-NetTCPConnection -State Listen | Where-Object { $ports -contains $_.LocalPort } | Select-Object LocalAddress,LocalPort,OwningProcess
$matches | ConvertTo-Json -Depth 3 | Set-Content -Path .\port-listeners.json

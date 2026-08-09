# Run PowerShell as Administrator to allow phones on your Wi-Fi to reach the dev server
netsh advfirewall firewall add rule name="ZapTab Frontend 5173" dir=in action=allow protocol=TCP localport=5173
netsh advfirewall firewall add rule name="ZapTab Backend 3001" dir=in action=allow protocol=TCP localport=3001
Write-Host "Firewall rules added. Restart pnpm dev, then try the invite link on your phone."

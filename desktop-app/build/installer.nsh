; Talio Windows Installer Script
; Custom NSIS configuration for enhanced security and features

!macro customInit
  ; Set permissions for screen capture
  nsExec::ExecToLog 'powershell -Command "Set-ItemProperty -Path HKCU:\Software\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\graphicsCaptureProgrammatic -Name Value -Value Allow -Type String -Force -ErrorAction SilentlyContinue"'
  
  ; Add firewall exception for the app
  nsExec::ExecToLog 'netsh advfirewall firewall add rule name="Talio" dir=out action=allow program="$INSTDIR\Talio.exe" enable=yes profile=any'
!macroend

!macro customInstall
  ; Create startup registry entry for auto-launch
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "Talio" '"$INSTDIR\Talio.exe" --hidden'
  
  ; Register the app as trusted (helps with antivirus)
  WriteRegStr HKLM "SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}" "Publisher" "Talio"
  WriteRegStr HKLM "SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}" "URLInfoAbout" "https://talio.in"
  WriteRegStr HKLM "SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}" "HelpLink" "https://talio.in/support"
!macroend

!macro customUnInstall
  ; Remove startup entry
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "Talio"
  
  ; Remove firewall rule
  nsExec::ExecToLog 'netsh advfirewall firewall delete rule name="Talio"'
!macroend

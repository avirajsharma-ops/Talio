; Custom NSIS Installer Script for Talio Activity Monitor
; Beautiful installation with Talio theming and comprehensive permissions
; © 2025 Talio HRMS - Productivity Monitoring Solution

!macro customInstall
  ; =====================================================
  ; AUTO-START AT BOOT
  ; =====================================================
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "TalioActivityMonitor" '"$INSTDIR\Talio Activity Monitor.exe" --hidden'

  ; =====================================================
  ; APPLICATION DATA DIRECTORIES
  ; =====================================================
  CreateDirectory "$APPDATA\talio-activity-monitor"
  CreateDirectory "$APPDATA\talio-activity-monitor\logs"
  CreateDirectory "$APPDATA\talio-activity-monitor\screenshots"
  CreateDirectory "$APPDATA\talio-activity-monitor\data"

  ; =====================================================
  ; BACKGROUND TASK REGISTRATION
  ; =====================================================
  WriteRegDWORD HKCU "Software\TalioActivityMonitor" "BackgroundEnabled" 1
  WriteRegDWORD HKCU "Software\TalioActivityMonitor" "ScreenCaptureEnabled" 1
  WriteRegDWORD HKCU "Software\TalioActivityMonitor" "AutoStartEnabled" 1

!macroend

!macro customUnInstall
  ; Remove auto-start registry keys
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "TalioActivityMonitor"

  ; Clean registry
  DeleteRegKey HKCU "Software\TalioActivityMonitor"
!macroend

; Custom NSIS Installer Script for Tailo Activity Monitor
; This script runs during installation to configure Windows-specific settings

!macro customInstall
  ; Set registry key for auto-start
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "TalioActivityMonitor" "$INSTDIR\Talio Activity Monitor.exe"
  
  ; Create firewall rule to allow application
  nsExec::ExecToLog 'netsh advfirewall firewall add rule name="Talio Activity Monitor" dir=in action=allow program="$INSTDIR\Talio Activity Monitor.exe" enable=yes profile=any'
  
  ; Grant full permissions to installation directory
  AccessControl::GrantOnFile "$INSTDIR" "(S-1-5-32-545)" "FullAccess"
  
  ; Create application data directory
  CreateDirectory "$APPDATA\tailo-activity-monitor"
  CreateDirectory "$APPDATA\tailo-activity-monitor\logs"
  
  ; Set permissions for app data
  AccessControl::GrantOnFile "$APPDATA\tailo-activity-monitor" "(S-1-5-32-545)" "FullAccess"
!macroend

!macro customUnInstall
  ; Remove auto-start registry key
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "TalioActivityMonitor"
  
  ; Remove firewall rule
  nsExec::ExecToLog 'netsh advfirewall firewall delete rule name="Talio Activity Monitor"'
  
  ; Remove application data (optional - uncomment to delete user data)
  ; RMDir /r "$APPDATA\tailo-activity-monitor"
!macroend

!macro customHeader
  ; Custom header text
  !define MUI_TEXT_INSTALLING_TITLE "Installing Talio Activity Monitor"
  !define MUI_TEXT_INSTALLING_SUBTITLE "Please wait while Talio Activity Monitor is being installed on your computer."
  !define MUI_TEXT_FINISH_TITLE "Installation Complete"
  !define MUI_TEXT_FINISH_SUBTITLE "Talio Activity Monitor has been successfully installed."
!macroend

; Custom install page
!macro customInstallPage
  ; Add custom page for consent
  Page custom ConsentPage ConsentPageLeave
  
  Function ConsentPage
    !insertmacro MUI_HEADER_TEXT "Employee Activity Monitoring Notice" "Please read and accept the monitoring policy"
    
    nsDialogs::Create 1018
    Pop $0
    
    ${NSD_CreateLabel} 0 0 100% 40u "This application will monitor your computer activity including screenshots, active windows, and application usage. All data is sent to your employer's Tailo HRMS system.$\n$\nBy clicking Next, you acknowledge and consent to this monitoring."
    Pop $1
    
    ${NSD_CreateCheckbox} 0 45u 100% 10u "I understand and consent to activity monitoring"
    Pop $2
    
    nsDialogs::Show
  FunctionEnd
  
  Function ConsentPageLeave
    ${NSD_GetState} $2 $0
    ${If} $0 != ${BST_CHECKED}
      MessageBox MB_OK "You must accept the monitoring policy to continue installation."
      Abort
    ${EndIf}
  FunctionEnd
!macroend

; Custom finish actions
!macro customFinishPage
  ; Show message about system tray
  !define MUI_FINISHPAGE_RUN_TEXT "Start Talio Activity Monitor (will run in system tray)"
  !define MUI_FINISHPAGE_RUN_NOTCHECKED
  !define MUI_FINISHPAGE_SHOWREADME
  !define MUI_FINISHPAGE_SHOWREADME_TEXT "View README"
  !define MUI_FINISHPAGE_SHOWREADME_FUNCTION ShowReadme
  
  Function ShowReadme
    ExecShell "open" "$INSTDIR\README.md"
  FunctionEnd
!macroend

; Pre-installation checks
!macro preInstall
  ; Check Windows version
  ${If} ${AtLeastWin10}
    ; Windows 10 or higher - OK
  ${Else}
    MessageBox MB_YESNO "This application is designed for Windows 10 or later. Installation may not work correctly. Continue anyway?" IDYES continue
    Abort
    continue:
  ${EndIf}
  
  ; Check for existing installation
  ReadRegStr $0 HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\TalioActivityMonitor" "UninstallString"
  ${If} $0 != ""
    MessageBox MB_YESNO "Tailo Activity Monitor is already installed. Do you want to uninstall it first?" IDYES uninst
    Abort
    uninst:
      ExecWait '$0 _?=$INSTDIR'
  ${EndIf}
!macroend

; Custom NSIS Installer Script for Talio
; Universal installer for both 32-bit and 64-bit Windows
; © 2025 Talio HRMS

!macro customInit
  ; Detect system architecture and set appropriate install directory
  ${If} ${RunningX64}
    SetRegView 64
    StrCpy $INSTDIR "$LOCALAPPDATA\Programs\${PRODUCT_NAME}"
  ${Else}
    SetRegView 32
    StrCpy $INSTDIR "$LOCALAPPDATA\Programs\${PRODUCT_NAME}"
  ${EndIf}
!macroend

!macro customInstall
  ; Log the architecture for debugging
  ${If} ${RunningX64}
    DetailPrint "Installing 64-bit version of Talio"
  ${Else}
    DetailPrint "Installing 32-bit version of Talio"
  ${EndIf}

  ; =====================================================
  ; AUTO-START AT BOOT
  ; =====================================================
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "Talio" '"$INSTDIR\Talio.exe" --hidden'

  ; =====================================================
  ; APPLICATION DATA DIRECTORIES
  ; =====================================================
  CreateDirectory "$APPDATA\talio"
  CreateDirectory "$APPDATA\talio\logs"
  CreateDirectory "$APPDATA\talio\screenshots"
  CreateDirectory "$APPDATA\talio\data"

  ; =====================================================
  ; BACKGROUND TASK REGISTRATION
  ; =====================================================
  WriteRegDWORD HKCU "Software\Talio" "BackgroundEnabled" 1
  WriteRegDWORD HKCU "Software\Talio" "ScreenCaptureEnabled" 1
  WriteRegDWORD HKCU "Software\Talio" "AutoStartEnabled" 1

!macroend

!macro customUnInstall
  ; Remove auto-start registry keys
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "Talio"

  ; Clean registry
  DeleteRegKey HKCU "Software\Talio"
  
  ; Clean app data (optional - comment out if you want to preserve user data)
  RMDir /r "$APPDATA\talio"
!macroend

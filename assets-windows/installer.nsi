!include "MUI2.nsh"
!include "FileAssociation.nsh"

Name "Crunch 2"
BrandingText "A Matthew Dean app"

# set the icon
!define MUI_ICON "favicon.ico"
!define MUI_UNICON "favicon.ico"

# define the resulting installer's name:
OutFile "..\dist\CrunchSetup.exe"

# set the installation directory
InstallDir "$PROGRAMFILES\Crunch\"

# app dialogs
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_INSTFILES

!define MUI_FINISHPAGE_RUN_TEXT "Start Crunch 2"
!define MUI_FINISHPAGE_RUN "$INSTDIR\Crunch 2.exe"

!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_LANGUAGE "English"

# default section start
Section

  # delete the installed files
  RMDir /r $INSTDIR

  # define the path to which the installer should install
  SetOutPath $INSTDIR

  # specify the files to go in the output path
  File /r "..\build\Crunch 2\win32\*"
  
  # Store installation folder
  WriteRegStr HKCU "Software\Crunch 2" "" $INSTDIR

  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\Crunch 2" \
                   "DisplayName" "Crunch 2"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\Crunch 2" \
                   "Publisher" "Matthew Dean"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\Crunch 2" \
                   "UninstallString" "$\"$INSTDIR\Uninstall_Crunch_2.exe$\""

  # create the uninstaller
  WriteUninstaller "$INSTDIR\Uninstall_Crunch_2.exe"

  # create shortcuts in the start menu and on the desktop
  CreateShortCut "$SMPROGRAMS\Crunch 2.lnk" "$INSTDIR\Crunch 2.exe"
  # CreateShortCut "$SMPROGRAMS\Crunch 2\Uninstall Crunch 2.lnk" "$INSTDIR\Uninstall_Crunch_2.exe"
  CreateShortCut "$DESKTOP\Crunch 2.lnk" "$INSTDIR\Crunch 2.exe"

  ${registerExtension} "$INSTDIR\Crunch 2.exe" ".less" "Less file"

SectionEnd

# create a section to define what the uninstaller does
Section "Uninstall"

  # delete the installed files
  RMDir /r $INSTDIR

  # delete the shortcuts
  Delete "$SMPROGRAMS\Crunch 2.lnk"
  # Delete "$SMPROGRAMS\Crunch 2\Uninstall Crunch 2.lnk"
  Delete "$DESKTOP\Crunch 2.lnk"
  RMDir /r "$SMPROGRAMS\Crunch 2\"

  DeleteRegKey /ifempty HKCU "Software\Crunch 2"
  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\Crunch 2"

  ${unregisterExtension} ".less" "Less file" 

SectionEnd

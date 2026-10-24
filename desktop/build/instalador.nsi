; ============================================================
; Instalador de Windows (por usuario, sin permisos de administrador)
; Lo compila make.js con: makensis -DAPPNAME=… -DVERSION=… instalador.nsi
; ============================================================
Unicode true
ManifestDPIAware true
SetCompressor /SOLID lzma
SetCompressorDictSize 64
RequestExecutionLevel user

!define APPEXE "${APPNAME}.exe"
!define UNINST "Desinstalar ${APPNAME}.exe"
!define UKEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPID}"
!define CLS "${APPNAME}.Proyecto"
; FEXT: extensión de los proyectos (.fsp); EXT: la de versiones anteriores (.fmst), que se sigue abriendo
!ifndef FEXT
  !define FEXT "${EXT}"
!endif

Name "${APPNAME}"
OutFile "${OUTFILE}"
InstallDir "$LOCALAPPDATA\Programs\${APPNAME}"
InstallDirRegKey HKCU "Software\${APPNAME}" "InstallDir"
BrandingText "${APPNAME} ${VERSION}"

VIProductVersion "${VERSION}.0"
VIAddVersionKey /LANG=1034 "ProductName" "${APPNAME}"
VIAddVersionKey /LANG=1034 "FileDescription" "Instalador de ${APPNAME}"
VIAddVersionKey /LANG=1034 "CompanyName" "${PUBLISHER}"
VIAddVersionKey /LANG=1034 "LegalCopyright" "© ${PUBLISHER}"
VIAddVersionKey /LANG=1034 "FileVersion" "${VERSION}"
VIAddVersionKey /LANG=1034 "ProductVersion" "${VERSION}"

!include "MUI2.nsh"
!include "FileFunc.nsh"
!include "LogicLib.nsh"

!define MUI_ICON "icon.ico"
!define MUI_WELCOMEFINISHPAGE_BITMAP "bienvenida.bmp"
!define MUI_UNWELCOMEFINISHPAGE_BITMAP "bienvenida.bmp"
!define MUI_HEADERIMAGE
!define MUI_HEADERIMAGE_RIGHT
!define MUI_HEADERIMAGE_BITMAP "encabezado.bmp"
!define MUI_HEADERIMAGE_UNBITMAP "encabezado.bmp"
!define MUI_UNICON "icon.ico"
!define MUI_ABORTWARNING
!define MUI_WELCOMEPAGE_TITLE "Instalar ${APPNAME} ${VERSION}"
!define MUI_WELCOMEPAGE_TEXT "Desglose, storyboard 3D, animatic, plan de rodaje, presupuesto y hoja de script.$\r$\n$\r$\nIncluye ${TRIAL} días de prueba de ${APPNAME} Pro; después sigue funcionando como ${APPNAME} Free hasta que actives tu licencia.$\r$\n$\r$\nTus proyectos se guardan en la carpeta Documentos\${APPNAME}. Desinstalar el programa no los borra.$\r$\n$\r$\nHaz clic en Siguiente para continuar."
!define MUI_FINISHPAGE_RUN "$INSTDIR\${APPEXE}"
!define MUI_FINISHPAGE_RUN_TEXT "Abrir ${APPNAME}"

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_LICENSE "licencia.txt"
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "Spanish"

; si el programa está abierto, se pide cerrarlo (para poder actualizar sus archivos)
!macro WAIT_CLOSED
  ${Do}
    FindWindow $0 "Chrome_WidgetWin_1" "${APPNAME}"
    ${If} $0 == 0
      ${Break}
    ${EndIf}
    MessageBox MB_RETRYCANCEL|MB_ICONEXCLAMATION "${APPNAME} está abierto. Ciérralo y pulsa Reintentar.$\r$\n(Tu trabajo ya está guardado.)" IDRETRY +2
    Abort
  ${Loop}
!macroend

Function .onInit
  !insertmacro WAIT_CLOSED
FunctionEnd

Section "Instalar"
  SetOutPath "$INSTDIR"
  ; versión anterior: se reemplaza por completo, sin tocar los proyectos (están en Documentos)
  RMDir /r "$INSTDIR\resources"
  RMDir /r "$INSTDIR\locales"
  File /r "${SRC}/*.*"
  WriteUninstaller "$INSTDIR\${UNINST}"

  CreateShortCut "$DESKTOP\${APPNAME}.lnk" "$INSTDIR\${APPEXE}" "" "$INSTDIR\${APPEXE}" 0
  CreateShortCut "$SMPROGRAMS\${APPNAME}.lnk" "$INSTDIR\${APPEXE}" "" "$INSTDIR\${APPEXE}" 0

  ; archivos .fsp (y los .fmst anteriores) → se abren con el programa
  WriteRegStr HKCU "Software\Classes\.${FEXT}" "" "${CLS}"
  WriteRegStr HKCU "Software\Classes\.${EXT}" "" "${CLS}"
  WriteRegStr HKCU "Software\Classes\${CLS}" "" "Proyecto de ${APPNAME}"
  WriteRegStr HKCU "Software\Classes\${CLS}\DefaultIcon" "" "$INSTDIR\resources\doc.ico"
  WriteRegStr HKCU "Software\Classes\${CLS}\shell\open\command" "" '"$INSTDIR\${APPEXE}" "%1"'
  System::Call 'shell32::SHChangeNotify(i 0x08000000, i 0, p 0, p 0)'

  ; Agregar o quitar programas
  ${GetSize} "$INSTDIR" "/S=0K" $0 $1 $2
  WriteRegStr HKCU "${UKEY}" "DisplayName" "${APPNAME}"
  WriteRegStr HKCU "${UKEY}" "DisplayVersion" "${VERSION}"
  WriteRegStr HKCU "${UKEY}" "Publisher" "${PUBLISHER}"
  WriteRegStr HKCU "${UKEY}" "DisplayIcon" "$INSTDIR\${APPEXE}"
  WriteRegStr HKCU "${UKEY}" "InstallLocation" "$INSTDIR"
  WriteRegStr HKCU "${UKEY}" "UninstallString" '"$INSTDIR\${UNINST}"'
  WriteRegStr HKCU "${UKEY}" "QuietUninstallString" '"$INSTDIR\${UNINST}" /S'
  WriteRegDWORD HKCU "${UKEY}" "EstimatedSize" $0
  WriteRegDWORD HKCU "${UKEY}" "NoModify" 1
  WriteRegDWORD HKCU "${UKEY}" "NoRepair" 1
  WriteRegStr HKCU "Software\${APPNAME}" "InstallDir" "$INSTDIR"
SectionEnd

Function un.onInit
  !insertmacro WAIT_CLOSED
FunctionEnd

Section "Uninstall"
  Delete "$DESKTOP\${APPNAME}.lnk"
  Delete "$SMPROGRAMS\${APPNAME}.lnk"
  ; solo se borra la carpeta si de verdad es la del programa
  ${If} ${FileExists} "$INSTDIR\${APPEXE}"
    RMDir /r "$INSTDIR"
  ${EndIf}
  ReadRegStr $0 HKCU "Software\Classes\.${EXT}" ""
  ${If} $0 == "${CLS}"
    DeleteRegKey HKCU "Software\Classes\.${EXT}"
  ${EndIf}
  ReadRegStr $0 HKCU "Software\Classes\.${FEXT}" ""
  ${If} $0 == "${CLS}"
    DeleteRegKey HKCU "Software\Classes\.${FEXT}"
  ${EndIf}
  DeleteRegKey HKCU "Software\Classes\${CLS}"
  DeleteRegKey HKCU "${UKEY}"
  DeleteRegKey HKCU "Software\${APPNAME}"
  System::Call 'shell32::SHChangeNotify(i 0x08000000, i 0, p 0, p 0)'
SectionEnd

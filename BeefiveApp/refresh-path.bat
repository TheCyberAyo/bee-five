@echo off
REM Refresh PATH in current Command Prompt session
setx PATH "%PATH%;%LOCALAPPDATA%\Android\Sdk\platform-tools" >nul 2>&1
set PATH=%PATH%;%LOCALAPPDATA%\Android\Sdk\platform-tools
echo PATH refreshed! You can now use 'adb' command.
adb version














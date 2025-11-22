@echo off
echo Building extension...

REM Use npx to run vsce without requiring global installation
call npx @vscode/vsce package

if %ERRORLEVEL% EQU 0 (
    echo [32mBuild successful![0m
) else (
    echo [31mBuild failed.[0m
    exit /b 1
)

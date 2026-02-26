# Build a contained EXE

This project is a static web app. To run it as a single contained desktop executable:

1. On Windows, run either:
   - `build_exe.bat` (Command Prompt), or
   - `build_exe.ps1` (PowerShell).
2. The generated EXE will be at `dist/WathPicker.exe`.

## What the EXE does
- Starts a local server on `http://127.0.0.1:4173` (or the next available port if 4173 is busy).
- Opens your default browser to the picker UI.
- Serves bundled app files from inside the executable.

> Note: Keep `fastest finger first.mp3` in the same folder as the EXE at runtime if you want countdown music.

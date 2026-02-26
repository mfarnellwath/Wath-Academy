@echo off
setlocal

REM Build a single-file Windows executable from launcher.py
python -m pip install --upgrade pip
python -m pip install pyinstaller

python -m PyInstaller --noconfirm --onefile --name WathPicker ^
  --add-data "index.html;." ^
  --add-data "styles.css;." ^
  --add-data "script.js;." ^
  --add-data "logo.svg;." ^
  launcher.py

echo Build complete. Output: dist\WathPicker.exe

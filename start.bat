@echo off
echo Запуск каталога исполнителей...
echo.

echo Установка зависимостей...
cd backend
pip install -r requirements.txt

echo.
echo Запуск сервера...
echo Сайт будет доступен по адресу: http://localhost:5000
echo.
python app.py

pause

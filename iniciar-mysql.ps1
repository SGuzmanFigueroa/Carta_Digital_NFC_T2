# Prepara MySQL para la T2 y levanta el backend Spring Boot.
# Uso (desde la raíz del repo):
#   powershell -ExecutionPolicy Bypass -File .\iniciar-mysql.ps1
# Pide tu usuario y clave de MySQL; no se guardan en ningún archivo.

$ErrorActionPreference = 'Stop'
$repo = $PSScriptRoot
$sql = Join-Path $repo 'backend\carta_digital_t2.sql'

# 1. Buscar mysql.exe
$mysql = Get-ChildItem 'C:\Program Files\MySQL' -Recurse -Filter mysql.exe -ErrorAction SilentlyContinue |
    Where-Object { $_.DirectoryName -like '*\bin' } | Select-Object -First 1 -ExpandProperty FullName
if (-not $mysql) { $cmd = Get-Command mysql -ErrorAction SilentlyContinue; if ($cmd) { $mysql = $cmd.Source } }
if (-not $mysql) { Write-Host 'No encontré mysql.exe. ¿Está instalado MySQL Server 8?' -ForegroundColor Red; exit 1 }
Write-Host "MySQL: $mysql" -ForegroundColor DarkGray

# 2. Pedir credenciales
$user = Read-Host 'Usuario de MySQL [root]'
if ([string]::IsNullOrWhiteSpace($user)) { $user = 'root' }
$secure = Read-Host "Clave de $user" -AsSecureString
$pass = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure))

# 3. Crear la base, las tablas y los datos de ejemplo
$env:MYSQL_PWD = $pass
Write-Host "`nEjecutando carta_digital_t2.sql..." -ForegroundColor Cyan
Get-Content -Raw -Encoding UTF8 $sql | & $mysql --default-character-set=utf8mb4 -u $user --table
if ($LASTEXITCODE -ne 0) {
    Remove-Item Env:MYSQL_PWD
    Write-Host 'No se pudo ejecutar el script. Revisa el usuario y la clave.' -ForegroundColor Red
    exit 1
}
Remove-Item Env:MYSQL_PWD
Write-Host 'Base carta_digital_t2 lista.' -ForegroundColor Green

# 4. Levantar el backend con esas credenciales (Ctrl+C para detenerlo)
$env:DB_USERNAME = $user
$env:DB_PASSWORD = $pass
Write-Host "`nLevantando el backend en http://localhost:8080/api ..." -ForegroundColor Cyan
Set-Location (Join-Path $repo 'backend')
.\mvnw.cmd spring-boot:run

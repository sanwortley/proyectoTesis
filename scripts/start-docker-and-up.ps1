$dockerDesktopPath = "C:\Program Files\Docker\Docker\Docker Desktop.exe"

function Wait-Docker {
    Write-Host "Esperando a que Docker esté listo..."
    for ($i = 0; $i -lt 30; $i++) {
        try {
            docker info > $null 2>&1
            Write-Host "Docker está listo."
            return
        } catch {
            Start-Sleep -Seconds 2
        }
    }
    throw "Docker no se inició en el tiempo esperado. Abre Docker Desktop manualmente y vuelve a intentarlo."
}

try {
    docker info > $null 2>&1
    Write-Host "Docker ya estaba ejecutándose."
} catch {
    if (-Not (Test-Path $dockerDesktopPath)) {
        throw "No se encontró Docker Desktop en '$dockerDesktopPath'. Instala Docker Desktop o ajusta la ruta en este script."
    }
    Write-Host "Iniciando Docker Desktop..."
    Start-Process -FilePath $dockerDesktopPath
    Wait-Docker
}

Set-Location (Join-Path $PSScriptRoot "..")

docker compose up --build

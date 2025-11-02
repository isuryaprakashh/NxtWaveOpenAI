# PowerShell script to help setup Ollama for Windows
Write-Host "=== Ollama Setup for AI Email Assistant ===" -ForegroundColor Cyan
Write-Host ""

# Check if Ollama is already installed
Write-Host "Checking if Ollama is installed..." -ForegroundColor Yellow
try {
    $ollamaVersion = ollama --version 2>$null
    if ($ollamaVersion) {
        Write-Host "✓ Ollama is already installed!" -ForegroundColor Green
        ollama --version
    }
} catch {
    Write-Host "✗ Ollama is not installed" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Ollama manually:" -ForegroundColor Yellow
    Write-Host "1. Visit: https://ollama.ai/download" -ForegroundColor Cyan
    Write-Host "2. Download the Windows installer" -ForegroundColor Cyan
    Write-Host "3. Run the installer" -ForegroundColor Cyan
    Write-Host "4. Restart your terminal/PowerShell" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Or use winget (if available):" -ForegroundColor Yellow
    Write-Host "  winget install Ollama.Ollama" -ForegroundColor Cyan
    Write-Host ""
    exit 1
}

Write-Host ""
Write-Host "Checking if Ollama service is running..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:11434/api/tags" -TimeoutSec 2 -ErrorAction Stop
    Write-Host "✓ Ollama service is running!" -ForegroundColor Green
} catch {
    Write-Host "✗ Ollama service is not running" -ForegroundColor Red
    Write-Host "Please start Ollama or restart your computer" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

Write-Host ""
Write-Host "Checking installed models..." -ForegroundColor Yellow
$models = ollama list
Write-Host $models

Write-Host ""
Write-Host "Checking for recommended model (llama3.1:8b)..." -ForegroundColor Yellow
$hasModel = $models -match "llama3.1"
if (-not $hasModel) {
    Write-Host "✗ Recommended model not found" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Pulling llama3.1:8b model (this may take a few minutes)..." -ForegroundColor Cyan
    Write-Host "Size: ~4.7GB - Make sure you have enough disk space" -ForegroundColor Yellow
    Write-Host ""
    $confirm = Read-Host "Do you want to download it now? (y/n)"
    if ($confirm -eq 'y' -or $confirm -eq 'Y') {
        ollama pull llama3.1:8b
        Write-Host ""
        Write-Host "✓ Model downloaded successfully!" -ForegroundColor Green
    } else {
        Write-Host "You can download it later with: ollama pull llama3.1:8b" -ForegroundColor Yellow
    }
} else {
    Write-Host "✓ Recommended model is available!" -ForegroundColor Green
}

Write-Host ""
Write-Host "=== Setup Complete! ===" -ForegroundColor Green
Write-Host "You can now run: python app.py" -ForegroundColor Cyan


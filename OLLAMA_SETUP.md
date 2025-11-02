# 🚀 Quick Ollama Setup Guide

## Step 1: Install Ollama

### Windows:
1. Visit: **https://ollama.ai/download**
2. Download the **Windows installer** (OllamaSetup.exe)
3. Run the installer
4. **Restart your terminal/PowerShell** after installation

### Alternative (if you have winget):
```powershell
winget install Ollama.Ollama
```

### Verify Installation:
```powershell
ollama --version
```

## Step 2: Start Ollama Service

Ollama should start automatically after installation. If not:

1. Open Ollama from Start Menu, OR
2. Run in terminal: `ollama serve`

Verify it's running:
```powershell
# Check if service responds
curl http://localhost:11434/api/tags
```

## Step 3: Download the Model

Download the ChatGPT-equivalent model:

```powershell
ollama pull llama3.1:8b
```

**This will download ~4.7GB**. It may take a few minutes depending on your internet speed.

### Alternative models (if you have more RAM):
```powershell
ollama pull llama3.1:70b    # Best quality (needs 40GB+ RAM)
ollama pull qwen2.5:72b      # GPT-4 level
ollama pull mixtral:8x7b     # Excellent reasoning
```

## Step 4: Verify Setup

Check if model is available:
```powershell
ollama list
```

Test the model:
```powershell
ollama run llama3.1:8b "Hello, summarize this email: Meeting tomorrow at 3pm"
```

## Step 5: Run Your Application

```powershell
python app.py
```

## Troubleshooting

### "Ollama is not recognized"
- Restart your terminal/PowerShell after installation
- Check if Ollama is in your PATH

### "Connection refused" or "Could not connect"
- Make sure Ollama is running
- Check if port 11434 is available
- Try: `ollama serve` in a separate terminal

### "Model not found"
- Run: `ollama pull llama3.1:8b`
- Check: `ollama list` to see available models

### Model takes too long to respond
- Try a smaller model: `ollama pull llama3.1:8b` (instead of 70b)
- Check your RAM usage
- Close other applications

## Quick Setup Script

Run the PowerShell setup script:
```powershell
.\setup_ollama.ps1
```

This will check everything and guide you through setup!

## Need Help?

- Ollama Docs: https://ollama.ai
- Check if Ollama is running: Open http://localhost:11434 in browser
- View models: `ollama list`


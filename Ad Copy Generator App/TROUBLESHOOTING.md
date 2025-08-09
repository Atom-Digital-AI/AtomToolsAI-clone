# Troubleshooting Guide

## Common Issues and Solutions

### 1. "No API key provided" Error

**Problem**: The app shows "No API key provided" error when trying to generate ad copy.

**Solutions**:

#### Option A: Use the Launcher Script (Recommended)

```bash
python3 run_app.py
```

#### Option B: Check Environment Variables

```bash
python3 debug_env.py
```

#### Option C: Manual Environment Setup

```bash
export OPENAI_API_KEY="your_api_key_here"
python3 app.py
```

### 2. Environment Variables Not Loading

**Problem**: The `.env` file exists but environment variables aren't being loaded.

**Solutions**:

1. **Check .env file format**:

   ```
   OPENAI_API_KEY=your_api_key_here
   GOOGLE_ADS_CUSTOMER_ID=your_customer_id
   ```

   - No spaces around the `=` sign
   - No quotes around the values
   - No trailing spaces

2. **Verify .env file location**:

   ```bash
   ls -la .env
   cat .env
   ```

3. **Test environment loading**:
   ```bash
   python3 debug_env.py
   ```

### 3. Flask App Not Starting

**Problem**: The Flask app fails to start or shows errors.

**Solutions**:

1. **Check dependencies**:

   ```bash
   pip3 install -r requirements.txt
   ```

2. **Use the launcher script**:

   ```bash
   python3 run_app.py
   ```

3. **Check port availability**:
   ```bash
   lsof -i :5000
   ```

### 4. Language Detection Issues

**Problem**: Language detection is not working correctly.

**Solutions**:

1. **Test language detection**:

   ```bash
   python3 test_language_detection.py
   ```

2. **Test API functionality**:

   ```bash
   python3 test_api_functionality.py
   ```

3. **Check langdetect installation**:
   ```bash
   pip3 install langdetect==1.0.9
   ```

### 5. API Calls Failing

**Problem**: OpenAI API calls are failing.

**Solutions**:

1. **Verify API key**:

   - Check that your API key is valid
   - Ensure you have sufficient credits
   - Verify the API key format (should start with `sk-`)

2. **Test API connection**:

   ```bash
   python3 test_api_functionality.py
   ```

3. **Check network connectivity**:
   ```bash
   curl -I https://api.openai.com
   ```

### 6. CSV Upload Issues

**Problem**: CSV files are not being processed correctly.

**Solutions**:

1. **Check CSV format**:

   - Ensure proper column headers
   - Check for encoding issues (use UTF-8)
   - Verify no empty rows

2. **Test with example CSV**:
   ```bash
   # Use the provided example
   cat example_mixed_language.csv
   ```

### 7. Web Interface Issues

**Problem**: The web interface is not working properly.

**Solutions**:

1. **Check Flask app**:

   ```bash
   python3 run_app.py
   ```

2. **Access the app**:

   - Open browser to `http://localhost:8080`
   - Check browser console for errors

3. **Clear browser cache**:
   - Hard refresh (Ctrl+F5 or Cmd+Shift+R)
   - Clear browser cache and cookies

## Quick Diagnostic Commands

### Check System Status

```bash
# Check Python version
python3 --version

# Check installed packages
pip3 list | grep -E "(flask|openai|langdetect|dotenv)"

# Check environment variables
python3 debug_env.py

# Test API functionality
python3 test_api_functionality.py

# Test language detection
python3 test_language_detection.py
```

### Start App Properly

```bash
# Method 1: Use launcher script (recommended)
python3 run_app.py

# Method 2: Direct execution
python3 app.py

# Method 3: With environment variables
export OPENAI_API_KEY="your_key_here"
python3 app.py
```

## Environment Setup

### 1. Install Environment Variables

Create a `.env` file in the app directory:

```
OPENAI_API_KEY=your_openai_api_key_here
GOOGLE_ADS_CUSTOMER_ID=your_google_ads_customer_id
```

### 2. Install Dependencies

```bash
pip3 install -r requirements.txt
```

### 3. Test Installation

```bash
python3 debug_env.py
python3 test_api_functionality.py
```

## Getting Help

If you're still experiencing issues:

1. **Check the logs**: Look for error messages in the terminal output
2. **Test individual components**: Use the test scripts to isolate issues
3. **Verify API key**: Ensure your OpenAI API key is valid and has credits
4. **Check network**: Ensure you have internet connectivity
5. **Update dependencies**: Make sure all packages are up to date

## Common Error Messages

| Error Message               | Solution                                      |
| --------------------------- | --------------------------------------------- |
| "No API key provided"       | Use `python3 run_app.py` or check `.env` file |
| "Module not found"          | Run `pip3 install -r requirements.txt`        |
| "Port already in use"       | Kill existing process or use different port   |
| "Language detection failed" | Check `langdetect` installation               |
| "CSV parsing error"         | Check CSV format and encoding                 |

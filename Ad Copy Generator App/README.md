# Ad Copy Generator App

A Flask-based web application that generates Google Ads copy and SEO content using OpenAI's GPT models. The app can process individual requests or bulk CSV files for efficient ad copy generation.

## Features

- **Ad Copy Generation**: Create compelling Google Ads headlines and descriptions
- **SEO Content Generation**: Generate optimized page titles and meta descriptions
- **Bulk Processing**: Handle CSV files with multiple campaigns and keywords
- **Language Detection**: Automatically detect and adapt to different languages
- **Keyword Research**: Integrated keyword research functionality
- **CSV Export**: Export results in Google Ads Editor compatible format

## Installation

### Prerequisites

- Python 3.8 or higher
- OpenAI API key

### Setup

1. **Clone the repository**:

   ```bash
   git clone <repository-url>
   cd "Ad Copy Generator App"
   ```

2. **Create a virtual environment**:

   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**:

   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables**:
   Create a `.env` file in the project root:
   ```env
   OPENAI_API_KEY=your_openai_api_key_here
   SECRET_KEY=your_secret_key_here
   FLASK_DEBUG=False
   HOST=0.0.0.0
   PORT=8080
   ```

## Usage

### Running the Application

#### Option 1: Direct Python execution

```bash
python app.py
```

#### Option 2: Using the launcher script

```bash
python run_app.py
```

#### Option 3: Using the executable (if built)

```bash
./dist/AdCopyGenerator
```

The application will be available at `http://localhost:8080`

### Building the Executable

To create a standalone executable:

```bash
python build_exe.py
```

The executable will be created in the `dist/` directory.

## API Documentation

### Endpoints

#### `GET /`

- **Description**: Main application page
- **Response**: HTML form for ad copy generation

#### `POST /`

- **Description**: Process ad copy generation requests
- **Parameters**:
  - `target_url`: URL to analyze for content
  - `target_keywords`: Comma-separated keywords
  - `brand_name`: Brand name for the ads
  - `selling_points`: Optional selling points
  - `case_type`: Text case (sentence, title, uppercase)
- **Response**: Generated ad copy or CSV file

### Request Types

1. **Single Ad Generation**: Generate ad copy for a single URL/keyword combination
2. **Bulk CSV Processing**: Upload a CSV file with multiple campaigns
3. **SEO Content Generation**: Generate page titles and meta descriptions
4. **Bulk SEO Generation**: Process multiple URLs for SEO content

## Configuration

### Environment Variables

| Variable            | Description                | Default        |
| ------------------- | -------------------------- | -------------- |
| `OPENAI_API_KEY`    | OpenAI API key             | Required       |
| `SECRET_KEY`        | Flask secret key           | Auto-generated |
| `FLASK_DEBUG`       | Enable debug mode          | False          |
| `HOST`              | Server host                | 0.0.0.0        |
| `PORT`              | Server port                | 8080           |
| `OPENAI_MODEL`      | OpenAI model to use        | gpt-3.5-turbo  |
| `OPENAI_MAX_TOKENS` | Maximum tokens per request | 1000           |
| `REQUEST_TIMEOUT`   | Request timeout in seconds | 30             |
| `MAX_RETRIES`       | Maximum API retry attempts | 3              |

### File Structure

```
Ad Copy Generator App/
├── app.py                 # Main Flask application
├── config.py             # Configuration management
├── requirements.txt      # Python dependencies
├── build_exe.py         # Executable build script
├── launcher.py          # Application launcher
├── services/            # Business logic services
│   └── openai_service.py
├── utils/               # Utility functions
│   ├── validators.py
│   └── logger.py
├── templates/           # HTML templates
├── tests/              # Unit tests
└── dist/               # Built executable (if built)
```

## Testing

### Running Tests

```bash
# Run all tests
python -m unittest discover tests

# Run specific test file
python -m unittest tests.test_validators

# Run with coverage
pip install coverage
coverage run -m unittest discover tests
coverage report
```

### Test Files

- `tests/test_validators.py`: Input validation tests
- `test_api_functionality.py`: API integration tests
- `test_language_detection.py`: Language detection tests

## Troubleshooting

### Common Issues

1. **"No API key provided" Error**

   - Ensure your `.env` file contains `OPENAI_API_KEY`
   - Check that the `.env` file is in the correct location

2. **Flask App Not Starting**

   - Verify all dependencies are installed: `pip install -r requirements.txt`
   - Check if port 8080 is available
   - Ensure Python 3.8+ is being used

3. **File Upload Issues**

   - Ensure uploaded files are CSV format
   - Check file size (max 10MB)
   - Verify file encoding (UTF-8 recommended)

4. **API Rate Limiting**
   - The app includes retry logic with exponential backoff
   - Check your OpenAI API usage limits
   - Consider upgrading your OpenAI plan if needed

### Debug Mode

Enable debug mode for detailed error messages:

```bash
export FLASK_DEBUG=True
python app.py
```

## Security Considerations

- **API Key Protection**: Never commit API keys to version control
- **Input Validation**: All user inputs are validated and sanitized
- **File Upload Security**: File types and sizes are restricted
- **Error Handling**: Sensitive information is not exposed in error messages

## Performance Optimization

- **Caching**: Consider implementing Redis for response caching
- **Async Processing**: For bulk operations, consider using Celery
- **Database**: For production, consider adding a database for user management

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For issues and questions:

1. Check the troubleshooting guide
2. Review the test files for examples
3. Create an issue in the repository

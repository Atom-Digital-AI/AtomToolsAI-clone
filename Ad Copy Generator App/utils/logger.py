import logging
import os
from datetime import datetime
from typing import Optional

def setup_logger(name: str = 'ad_copy_generator', 
                level: str = 'INFO',
                log_file: Optional[str] = None) -> logging.Logger:
    """
    Set up a logger with consistent formatting and optional file output.
    
    Args:
        name: Logger name
        level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        log_file: Optional log file path
        
    Returns:
        Configured logger instance
    """
    logger = logging.getLogger(name)
    
    # Avoid adding handlers multiple times
    if logger.handlers:
        return logger
    
    # Set log level
    logger.setLevel(getattr(logging, level.upper()))
    
    # Create formatter
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(funcName)s:%(lineno)d - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    # Console handler
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)
    
    # File handler (if specified)
    if log_file:
        # Create logs directory if it doesn't exist
        log_dir = os.path.dirname(log_file)
        if log_dir and not os.path.exists(log_dir):
            os.makedirs(log_dir)
        
        file_handler = logging.FileHandler(log_file)
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)
    
    return logger

def log_api_call(logger: logging.Logger, 
                function_name: str,
                success: bool,
                error_message: Optional[str] = None,
                **kwargs):
    """
    Log API call details for monitoring and debugging.
    
    Args:
        logger: Logger instance
        function_name: Name of the function making the API call
        success: Whether the API call was successful
        error_message: Error message if the call failed
        **kwargs: Additional context to log
    """
    if success:
        logger.info(f"API call successful: {function_name}", extra=kwargs)
    else:
        logger.error(f"API call failed: {function_name} - {error_message}", extra=kwargs)

def log_user_action(logger: logging.Logger,
                   action: str,
                   user_input: dict,
                   success: bool,
                   error_message: Optional[str] = None):
    """
    Log user actions for analytics and debugging.
    
    Args:
        logger: Logger instance
        action: Description of the user action
        user_input: Dictionary of user inputs (sanitized)
        success: Whether the action was successful
        error_message: Error message if the action failed
    """
    # Sanitize user input for logging (remove sensitive data)
    sanitized_input = {}
    for key, value in user_input.items():
        if 'key' in key.lower() or 'password' in key.lower() or 'secret' in key.lower():
            sanitized_input[key] = '***REDACTED***'
        else:
            sanitized_input[key] = str(value)[:100]  # Limit length
    
    log_data = {
        'action': action,
        'user_input': sanitized_input,
        'success': success,
        'timestamp': datetime.now().isoformat()
    }
    
    if error_message:
        log_data['error'] = error_message
    
    if success:
        logger.info(f"User action: {action}", extra=log_data)
    else:
        logger.error(f"User action failed: {action}", extra=log_data)

def log_performance(logger: logging.Logger,
                   operation: str,
                   duration: float,
                   **kwargs):
    """
    Log performance metrics for monitoring.
    
    Args:
        logger: Logger instance
        operation: Description of the operation
        duration: Duration in seconds
        **kwargs: Additional metrics to log
    """
    log_data = {
        'operation': operation,
        'duration_seconds': duration,
        'timestamp': datetime.now().isoformat()
    }
    log_data.update(kwargs)
    
    logger.info(f"Performance: {operation} took {duration:.2f}s", extra=log_data)

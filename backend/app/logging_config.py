"""
AI Interview Feedback MVP - Centralized Logging Configuration

This module provides a unified logging setup across the application:
- Structured JSON and console logging
- Different log levels for different modules
- Timestamp and request tracking
- Debug mode support (configured in settings)

Usage:
    from app.logging_config import get_logger
    logger = get_logger(__name__)
    logger.info("Operation completed successfully")

Author: AI Interview Assistant Team
"""

import logging
import logging.config
import sys
from app.config import settings


# ============================================
# Custom Formatter with Colors and Symbols
# ============================================

class ColoredFormatter(logging.Formatter):
    """Custom formatter with colors and emoji indicators."""
    
    # ANSI color codes
    COLORS = {
        'DEBUG': '\033[36m',     # Cyan
        'INFO': '\033[32m',      # Green
        'WARNING': '\033[33m',   # Yellow
        'ERROR': '\033[31m',     # Red
        'CRITICAL': '\033[35m',  # Magenta
    }
    
    SYMBOLS = {
        'DEBUG': '🔍',
        'INFO': '✓',
        'WARNING': '⚠',
        'ERROR': '✗',
        'CRITICAL': '💥',
    }
    
    RESET = '\033[0m'
    
    def format(self, record):
        color = self.COLORS.get(record.levelname, '')
        symbol = self.SYMBOLS.get(record.levelname, '')
        record.colored_levelname = f"{color}{record.levelname:8}{self.RESET}"
        record.symbol = symbol
        return super().format(record)


# ============================================
# Logger Configuration Dictionary
# ============================================

LOGGING_CONFIG = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "[%(asctime)s] %(levelname)-8s [%(name)s:%(funcName)s:%(lineno)d] %(message)s",
            "datefmt": "%Y-%m-%d %H:%M:%S"
        },
        "simple": {
            "format": "%(symbol)s %(colored_levelname)s | %(message)s"
        },
        "file": {
            "format": "[%(asctime)s] %(levelname)-8s [%(name)s:%(funcName)s:%(lineno)d] %(message)s",
            "datefmt": "%Y-%m-%d %H:%M:%S"
        }
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "level": "DEBUG" if settings.debug else "INFO",
            "formatter": "verbose",  # Will be replaced for colored output
            "stream": "ext://sys.stdout"
        },
        "file": {
            "class": "logging.handlers.RotatingFileHandler",
            "level": "DEBUG",
            "formatter": "file",
            "filename": "backend.log",
            "maxBytes": 10485760,  # 10MB
            "backupCount": 5
        }
    },
    "loggers": {
        "app": {
            "level": "DEBUG" if settings.debug else "INFO",
            "handlers": ["console", "file"],
            "propagate": False
        },
        "uvicorn": {
            "level": "INFO",
            "handlers": ["console"],
            "propagate": False
        },
        "uvicorn.access": {
            "level": "INFO",
            "handlers": ["console"],
            "propagate": False
        }
    },
    "root": {
        "level": "DEBUG" if settings.debug else "INFO",
        "handlers": ["console", "file"]
    }
}

# Apply logging configuration
logging.config.dictConfig(LOGGING_CONFIG)

# Replace console handler with colored formatter
console_handler = logging.getLogger().handlers[0] if logging.getLogger().handlers else None
if console_handler and isinstance(console_handler, logging.StreamHandler):
    colored_formatter = ColoredFormatter(
        "%(symbol)s [%(asctime)s] %(colored_levelname)s | %(name)s | %(message)s",
        datefmt="%H:%M:%S"
    )
    console_handler.setFormatter(colored_formatter)


def get_logger(name: str) -> logging.Logger:
    """
    Get or create a logger instance.
    
    Args:
        name: Module name (typically __name__)
    
    Returns:
        logging.Logger: Configured logger instance
    
    Example:
        logger = get_logger(__name__)
        logger.info("API endpoint called")
    """
    return logging.getLogger(name)

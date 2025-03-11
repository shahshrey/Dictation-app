#!/usr/bin/env python3
"""
Whisper Dictation App - Transcription Module
This script handles audio transcription using OpenAI's Whisper model.
"""

import argparse
import json
import os
import sys
import logging
from typing import Dict, Any

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger("whisper_transcribe")

def setup_argparse() -> argparse.Namespace:
    """Set up command line argument parsing."""
    parser = argparse.ArgumentParser(description="Transcribe audio using Whisper")
    parser.add_argument("--audio_path", type=str, required=True, help="Path to audio file")
    parser.add_argument("--model", type=str, default="base", choices=["tiny", "base", "small", "medium", "large"], 
                        help="Whisper model size")
    parser.add_argument("--language", type=str, default=None, help="Language code (optional)")
    return parser.parse_args()

def check_dependencies() -> bool:
    """Check if required dependencies are installed."""
    try:
        import whisper
        import torch
        import numpy
        return True
    except ImportError as e:
        logger.exception(f"Missing dependency: {e}")
        return False

def transcribe_audio(audio_path: str, model_name: str = "base", language: str = None) -> Dict[str, Any]:
    """
    Transcribe audio using Whisper model.
    
    Args:
        audio_path: Path to the audio file
        model_name: Whisper model size (tiny, base, small, medium, large)
        language: Language code (optional)
        
    Returns:
        Dictionary with transcription results
    """
    try:
        # Only import whisper if we're actually going to use it
        import whisper
        
        # Check if audio file exists
        if not os.path.exists(audio_path):
            return {"error": f"Audio file not found: {audio_path}"}
        
        # Load the model
        logger.info(f"Loading Whisper model: {model_name}")
        model = whisper.load_model(model_name)
        
        # Transcribe audio
        logger.info(f"Transcribing audio: {audio_path}")
        result = model.transcribe(
            audio_path,
            language=language,
            fp16=False  # Use fp16=True for GPU acceleration if available
        )
        
        return {
            "text": result["text"],
            "segments": result["segments"],
            "language": result["language"]
        }
    except Exception as e:
        logger.exception(f"Transcription error: {e}")
        return {"error": str(e)}

def main():
    """Main entry point for the script."""
    try:
        # Parse command line arguments
        args = setup_argparse()
        
        # Check dependencies
        if not check_dependencies():
            result = {"error": "Missing required dependencies"}
            print(json.dumps(result))
            sys.exit(1)
        
        # Transcribe audio
        result = transcribe_audio(
            audio_path=args.audio_path,
            model_name=args.model,
            language=args.language
        )
        
        # Output result as JSON
        print(json.dumps(result))
        
    except Exception as e:
        logger.exception(f"Unexpected error: {e}")
        result = {"error": str(e)}
        print(json.dumps(result))
        sys.exit(1)

if __name__ == "__main__":
    main() 
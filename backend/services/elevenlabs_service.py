import io
import re
import logging
from typing import Optional, Dict, Any, Iterator
from backend.config import ELEVENLABS_API_KEY, is_elevenlabs_configured

logger = logging.getLogger("medivoice.elevenlabs")

# Matches ElevenLabs Scribe non-speech event tags such as [outro jingle], [music], (silence), etc.
_NON_SPEECH_TAG_RE = re.compile(r"\[[^\]]*\]|\([^\)]*\)")

# Default voice for medical receptionist (Alice - clear, warm professional female receptionist)
DEFAULT_VOICE_ID = "Xb7hH8MSUJpSbSDYk0k2"
DEFAULT_TTS_MODEL = "eleven_flash_v2_5"
DEFAULT_STT_MODEL = "scribe_v1"

class ElevenLabsService:
    def __init__(self):
        self.client = None
        self._init_client()

    def _init_client(self):
        if is_elevenlabs_configured():
            try:
                from elevenlabs.client import ElevenLabs
                self.client = ElevenLabs(api_key=ELEVENLABS_API_KEY)
                logger.info("Initialized ElevenLabs client successfully.")
            except Exception as e:
                logger.error(f"Failed to initialize ElevenLabs client: {e}")
                self.client = None
        else:
            self.client = None

    def is_ready(self) -> bool:
        return self.client is not None and is_elevenlabs_configured()

    def text_to_speech(
        self,
        text: str,
        voice_id: str = DEFAULT_VOICE_ID,
        output_format: str = "mp3_44100_128"
    ) -> Dict[str, Any]:
        """
        Converts text to speech audio bytes using ElevenLabs TTS.
        Returns dict with {'success': bool, 'audio_bytes': bytes, 'error': Optional[str]}
        """
        if not self.is_ready():
            return {
                "success": False,
                "audio_bytes": None,
                "error": "ELEVENLABS_API_KEY is not configured. Please add your key in backend/.env."
            }

        if not text or not text.strip():
            return {"success": False, "audio_bytes": None, "error": "Empty text provided"}

        try:
            audio_generator = self.client.text_to_speech.convert(
                voice_id=voice_id,
                text=text.strip(),
                model_id=DEFAULT_TTS_MODEL,
                output_format=output_format
            )
            # Collect audio bytes from generator
            audio_bytes = b"".join(audio_generator)
            return {
                "success": True,
                "audio_bytes": audio_bytes,
                "content_type": "audio/mpeg" if "mp3" in output_format else "audio/wav",
                "error": None
            }
        except Exception as e:
            logger.error(f"ElevenLabs TTS conversion failed: {e}", exc_info=True)
            return {
                "success": False,
                "audio_bytes": None,
                "error": f"ElevenLabs TTS failed: {str(e)}"
            }

    def speech_to_text(
        self,
        audio_data: bytes,
        filename: str = "audio.webm",
        language_code: Optional[str] = "en"
    ) -> Dict[str, Any]:
        """
        Converts spoken audio data into transcribed text using ElevenLabs STT.
        Returns dict with {'success': bool, 'text': str, 'error': Optional[str]}
        """
        if not self.is_ready():
            return {
                "success": False,
                "text": "",
                "error": "ELEVENLABS_API_KEY is not configured. Please add your key in backend/.env."
            }

        if not audio_data or len(audio_data) < 100:
            return {"success": False, "text": "", "error": "Audio data is empty or too short."}

        try:
            audio_file = io.BytesIO(audio_data)
            # Ensure the filename has the correct extension for content-type detection
            if not filename.endswith(('.webm', '.wav', '.mp3', '.ogg', '.m4a', '.flac')):
                filename = "caller_audio.webm"
            audio_file.name = filename

            logger.info(f"ElevenLabs STT: sending {len(audio_data)} bytes, filename={filename}")

            response = self.client.speech_to_text.convert(
                file=audio_file,
                model_id=DEFAULT_STT_MODEL,
                language_code=language_code,
                tag_audio_events=False,
            )

            raw_text = (getattr(response, "text", "") or "").strip()
            # Strip any residual non-speech event tags like [outro jingle], [music], (silence)
            cleaned_text = _NON_SPEECH_TAG_RE.sub("", raw_text).strip()
            logger.info(f"ElevenLabs STT result: raw='{raw_text[:100]}', cleaned='{cleaned_text[:100]}'")
            if not cleaned_text:
                return {
                    "success": False,
                    "text": "",
                    "error": f"No intelligible speech detected (raw='{raw_text}')"
                }
            return {
                "success": True,
                "text": cleaned_text,
                "error": None
            }
        except Exception as e:
            logger.error(f"ElevenLabs STT conversion failed: {e}", exc_info=True)
            return {
                "success": False,
                "text": "",
                "error": f"ElevenLabs STT failed: {str(e)}"
            }

elevenlabs_service = ElevenLabsService()

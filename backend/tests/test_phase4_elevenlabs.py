from backend.services.elevenlabs_service import elevenlabs_service, DEFAULT_VOICE_ID, DEFAULT_TTS_MODEL, DEFAULT_STT_MODEL
from backend.config import is_elevenlabs_configured

def test_elevenlabs_service():
    # 1. Verify default configurations
    assert DEFAULT_VOICE_ID == "21m00Tcm4TlvDq8ikWAM"
    assert DEFAULT_TTS_MODEL == "eleven_multilingual_v2"
    assert DEFAULT_STT_MODEL == "scribe_v1"
    
    # 2. Test TTS behavior with unconfigured or placeholder key
    tts_res = elevenlabs_service.text_to_speech("Good morning, welcome to Metropolitan Health Clinic.")
    assert "success" in tts_res
    assert "error" in tts_res
    
    if not is_elevenlabs_configured():
        assert tts_res["success"] is False
        assert "ELEVENLABS_API_KEY is not configured" in tts_res["error"]
        print("Verified safe ElevenLabs TTS error response when key is unconfigured.")
    else:
        print("ElevenLabs key is configured; TTS output received.")
        
    # 3. Test STT behavior with empty or unconfigured key
    stt_res = elevenlabs_service.speech_to_text(b"RIFFdummydata")
    assert "success" in stt_res
    if not is_elevenlabs_configured():
        assert stt_res["success"] is False
        assert "ELEVENLABS_API_KEY is not configured" in stt_res["error"]
        print("Verified safe ElevenLabs STT error response when key is unconfigured.")
    
    print("PHASE 4 ELEVENLABS STT/TTS SERVICE TEST: ALL PASSED!")

if __name__ == "__main__":
    test_elevenlabs_service()

import os
from backend.services.gemini_service import gemini_service, SYSTEM_INSTRUCTION
from backend.config import is_gemini_configured

def test_gemini_service_structure_and_safe_fallback():
    # 1. Verify system instruction contents
    assert "Metropolitan Health Clinic" in SYSTEM_INSTRUCTION
    assert "CLINICAL BOOKING PROTOCOL" in SYSTEM_INSTRUCTION
    assert "REPEATING" in SYSTEM_INSTRUCTION or "REPEAT the phone number" in SYSTEM_INSTRUCTION
    assert "NEVER claim an appointment is booked" in SYSTEM_INSTRUCTION
    assert "CANCELLATION PROTOCOL" in SYSTEM_INSTRUCTION
    
    # 2. Test response when key is placeholder or invalid
    res = gemini_service.chat([{"role": "user", "content": "I need an appointment with a cardiologist"}])
    assert "response" in res
    assert "error" in res
    
    if not is_gemini_configured():
        assert res["error"] == "GEMINI_API_KEY_MISSING"
        assert "GEMINI_API_KEY" in res["response"]
        print("Verified safe fallback when GEMINI_API_KEY is not yet provided by user.")
    else:
        print("Gemini key is configured; response received:", res["response"])
        
    print("PHASE 3 GEMINI INTEGRATION STRUCTURE TEST: ALL PASSED!")

if __name__ == "__main__":
    test_gemini_service_structure_and_safe_fallback()

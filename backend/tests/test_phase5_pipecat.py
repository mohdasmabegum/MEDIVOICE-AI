from fastapi.testclient import TestClient
from backend.main import app

def test_pipecat_websocket_pipeline():
    client = TestClient(app)
    
    with client.websocket_connect("/ws/call") as websocket:
        # 1. First event is connection_ready
        data = websocket.receive_json()
        assert data["type"] == "connection_ready"
        assert "sessionId" in data
        assert "Pipecat" in data.get("version", "")
        print("Connected! Event:", data["type"])
        
        # 2. Send 'init' event
        websocket.send_json({
            "type": "init",
            "callerPhone": "+1 (555) 321-7654",
            "callerName": "Pipecat Test Caller"
        })
        
        # Read greeting events until listening state
        events = []
        while True:
            msg = websocket.receive_json()
            events.append(msg["type"])
            print("Greeting event received:", msg["type"])
            if msg.get("type") == "call_state" and msg.get("state") == "listening":
                break
        
        assert "llm_response" in events
        
        # 3. Send text message through voice pipeline
        websocket.send_json({
            "type": "text_input",
            "text": "Hello, is Dr. Sarah Chen available today?"
        })
        
        # Read response events until listening state
        reply_events = []
        while True:
            msg = websocket.receive_json()
            reply_events.append(msg["type"])
            print("Response event received:", msg["type"])
            if msg.get("type") == "call_state" and msg.get("state") == "listening":
                break
                
        assert "stt_transcript" in reply_events
        assert "llm_response" in reply_events
        
        # 4. Gracefully end call
        websocket.send_json({"type": "end_call"})
        print("Call ended cleanly.")

    print("PHASE 5 PIPECAT WEBSOCKET VOICE PIPELINE TEST: ALL PASSED!")

if __name__ == "__main__":
    test_pipecat_websocket_pipeline()

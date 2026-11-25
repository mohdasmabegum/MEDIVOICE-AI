import sys, os
sys.path.insert(0, os.path.abspath("."))
import asyncio
from backend.pipeline.pipecat_pipeline import PipecatVoiceSession

class MockWebSocket:
    def __init__(self):
        self.messages = []
    async def send_text(self, text: str):
        self.messages.append(text)

async def run_quick_test():
    ws = MockWebSocket()
    session = PipecatVoiceSession(ws, "test-quick-001")
    await session.greet()
    assert len(ws.messages) >= 2, f"Expected greeting messages, got {len(ws.messages)}"
    
    await session.process_user_utterance("Can I check doctor availability?")
    assert len(ws.messages) >= 4, f"Expected response messages, got {len(ws.messages)}"
    
    await session.finish_and_save()
    print("PHASE 5 PIPECAT VOICE PIPELINE TEST: ALL PASSED!")

if __name__ == "__main__":
    asyncio.run(run_quick_test())

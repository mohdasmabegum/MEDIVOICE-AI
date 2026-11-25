import sys, os
sys.path.insert(0, os.path.abspath("."))
import asyncio
from backend.pipeline.pipecat_pipeline import PipecatVoiceSession

print("BEFORE LOOP", flush=True)

async def test():
    print("INSIDE TEST", flush=True)

loop = asyncio.new_event_loop()
asyncio.set_event_loop(loop)
loop.run_until_complete(test())
loop.close()
print("AFTER LOOP", flush=True)

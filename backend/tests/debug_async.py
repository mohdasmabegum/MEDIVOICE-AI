import sys, asyncio
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

async def test():
    print("INSIDE TEST SUCCESSFUL", flush=True)

asyncio.run(test())
print("OUTSIDE TEST SUCCESSFUL", flush=True)

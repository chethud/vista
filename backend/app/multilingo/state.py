from concurrent.futures import ThreadPoolExecutor

processing_status: dict = {}
executor = ThreadPoolExecutor(max_workers=1)

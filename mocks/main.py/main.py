import requests
import threading
import time
import statistics
from queue import Queue

# --- Configuration ---
TARGET_URL = "https://assessment-hub-kc.onrender.com/"  # *** REPLACE WITH YOUR TARGET URL ***
NUM_THREADS = 50                   # Number of concurrent requests (threads)
REQUEST_COUNT = 50000                # Total number of requests to make
TIMEOUT_SECONDS = 10               # Maximum time to wait for a response

# --- Global Variables ---
response_times = []
successful_requests = 0
failed_requests = 0
request_queue = Queue()

def worker():
    """Worker function that threads will execute to send requests."""
    global successful_requests, failed_requests
    while True:
        try:
            # Get a task from the queue. If queue is empty, get() will block.
            # This is a simple way to control the total number of requests.
            request_id = request_queue.get(timeout=1)
        except:
            # Queue is empty and no more tasks will be added, so thread exits.
            break

        start_time = time.time()
        try:
            response = requests.get(TARGET_URL, timeout=TIMEOUT_SECONDS)
            response_time = time.time() - start_time

            if response.status_code == 200:
                response_times.append(response_time)
                successful_requests += 1
            else:
                print(f"Request {request_id}: Failed with status code {response.status_code} in {response_time:.4f}s")
                failed_requests += 1
        except requests.exceptions.Timeout:
            print(f"Request {request_id}: Timed out after {TIMEOUT_SECONDS}s")
            failed_requests += 1
        except requests.exceptions.RequestException as e:
            print(f"Request {request_id}: Error - {e}")
            failed_requests += 1
        finally:
            request_queue.task_done() # Mark the task as done

def run_stress_test():
    """Initiates and manages the stress testing process."""
    print(f"--- Starting Stress Test ---")
    print(f"Target URL: {TARGET_URL}")
    print(f"Threads: {NUM_THREADS}")
    print(f"Total Requests: {REQUEST_COUNT}")
    print(f"Timeout: {TIMEOUT_SECONDS}s")
    print("-" * 30)

    # Populate the queue with tasks
    for i in range(REQUEST_COUNT):
        request_queue.put(i + 1)

    threads = []
    for _ in range(NUM_THREADS):
        thread = threading.Thread(target=worker)
        thread.daemon = True  # Allow main thread to exit even if threads are running
        thread.start()
        threads.append(thread)

    # Wait for all tasks in the queue to be processed
    request_queue.join()

    # Note: Since threads are daemons, they might not all finish exactly at queue.join().
    # For a more precise wait for threads, you could iterate through the 'threads' list
    # and call thread.join() on each, but queue.join() is generally sufficient for this pattern.

    print("\n" + "-" * 30)
    print("--- Stress Test Complete ---")
    print(f"Total Requests Sent: {successful_requests + failed_requests}")
    print(f"Successful Requests: {successful_requests}")
    print(f"Failed Requests: {failed_requests}")

    if response_times:
        print(f"Average Response Time: {statistics.mean(response_times):.4f}s")
        print(f"Median Response Time: {statistics.median(response_times):.4f}s")
        print(f"Minimum Response Time: {min(response_times):.4f}s")
        print(f"Maximum Response Time: {max(response_times):.4f}s")
        try:
            print(f"Standard Deviation: {statistics.stdev(response_times):.4f}s")
        except statistics.StatisticsError:
            print("Standard Deviation: Not enough data to calculate")
    else:
        print("No successful requests to calculate response times.")
    print("-" * 30)

if __name__ == "__main__":
    # Basic input validation
    if not TARGET_URL or TARGET_URL == "http://example.com":
        print("Error: Please update TARGET_URL with a valid website address.")
    elif NUM_THREADS <= 0:
        print("Error: NUM_THREADS must be a positive integer.")
    elif REQUEST_COUNT <= 0:
        print("Error: REQUEST_COUNT must be a positive integer.")
    else:
        start_time_test = time.time()
        run_stress_test()
        end_time_test = time.time()
        print(f"Total test duration: {end_time_test - start_time_test:.2f} seconds")

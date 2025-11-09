import psutil
import json
import time
from flask import Flask, jsonify, request
from flask_cors import CORS

# --- Configuration ---
HOST = '127.0.0.1'
PORT = 5000

app = Flask(__name__)
# Enable CORS to allow the frontend (running on a different port/host) to fetch data
CORS(app) 

# --- System Data Collection Function ---

def get_system_metrics():
    """Collects real-time system usage metrics."""
    
    # 1. CPU Usage
    # interval=None means non-blocking (returns immediate result)
    cpu_percent = psutil.cpu_percent(interval=0.4, percpu=False)
    
    # 2. Memory Usage
    memory = psutil.virtual_memory()
    mem_used_gb = round(memory.used / (1024 ** 3), 1)
    mem_total_gb = round(memory.total / (1024 ** 3), 1)
    mem_percent = memory.percent

    # 3. Temperature (Platform-dependent, so we use a safe simulation)
    # If running on Linux/macOS, psutil.sensors_temps() might be used, but we simulate for portability.
    # Simulation: Generate a realistic CPU temperature (30C + up to 15C based on CPU usage)
    base_temp = 30 
    temp_c = round(base_temp + (cpu_percent * 0.15))

    # 4. GPU Usage (Highly platform-dependent, so we use a simulation)
    # If using NVIDIA, you'd use 'pynvml'. If AMD, another tool.
    # Simulation: GPU usage is often correlated with system activity, so link it to a function of CPU%
    gpu_percent = round((cpu_percent * 0.5) % 100) # Simple formula for simulation

    return {
        'cpu_percent': cpu_percent,
        'mem_used_gb': mem_used_gb,
        'mem_total_gb': mem_total_gb,
        'mem_percent': mem_percent,
        'temp_c': temp_c,
        'gpu_percent': gpu_percent
    }

# --- API Endpoint ---

@app.route('/api/metrics', methods=['GET'])
def metrics_endpoint():
    """Returns system usage metrics as JSON."""
    try:
        metrics = get_system_metrics()
        print(metrics)
        return jsonify(metrics)
    except Exception as e:
        app.logger.error(f"Error collecting metrics: {e}")
        return jsonify({"error": "Failed to collect system metrics"}), 500

# --- Server Startup ---

if __name__ == '__main__':
    print(f"--- System Monitor Backend Running ---")
    print(f"Access API at: http://{HOST}:{PORT}/api/metrics")
    print(f"Press Ctrl+C to stop.")
    
    # Run the server
    # Set debug=False for production
    app.run(host=HOST, port=PORT, debug=True)
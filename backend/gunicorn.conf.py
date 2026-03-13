import os

bind = "0.0.0.0:8000"
backlog = 2048
workers = 2
worker_class = "uvicorn.workers.UvicornWorker"
worker_connections = 500
max_requests = 1000
max_requests_jitter = 50
timeout = 120
keepalive = 5
accesslog = "-"
errorlog = "-"
loglevel = os.getenv("LOG_LEVEL", "info")
proc_name = "crypto_platform_api"
daemon = False
pidfile = None
umask = 0
user = None
group = None
tmp_upload_dir = None
limit_request_line = 4096
limit_request_fields = 100
limit_request_field_size = 8190

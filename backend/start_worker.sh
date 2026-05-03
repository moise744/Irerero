#!/bin/bash
celery -A irerero_backend worker --loglevel=info --concurrency=4

#!/usr/bin/env bash
# Render.com build script for Irerero backend
set -o errexit

pip install -r requirements.txt

python manage.py collectstatic --noinput 2>/dev/null || true
python manage.py migrate

#!/bin/bash
# Start Irerero backend — run this after docker-compose up -d
set -e
echo "Running migrations..."
python manage.py migrate
echo "Seeding demo data..."
python manage.py seed_demo_data
echo "Starting Django..."
python manage.py runserver 0.0.0.0:8000

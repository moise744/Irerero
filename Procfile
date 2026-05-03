web: cd backend && daphne -b 0.0.0.0 -p $PORT irerero_backend.asgi:application
worker: cd backend && celery -A irerero_backend worker -l info --pool=threads
beat: cd backend && celery -A irerero_backend beat -l info

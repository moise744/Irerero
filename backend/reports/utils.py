# auth_module/utils.py
from .models import AuditLog

def log_action(user, action, table_name, record_id="", old_value=None, new_value=None, request=None):
    """
    Centralized helper to write an audit log entry — NFR-022.
    """
    ip = None
    if request:
        ip = request.META.get("REMOTE_ADDR")
    
    AuditLog.objects.create(
        user=user,
        action=action,
        table_name=table_name,
        record_id=str(record_id),
        old_value=old_value,
        new_value=new_value,
        ip_address=ip
    )
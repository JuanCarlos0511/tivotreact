"""
Dependencias compartidas de la API.
"""
from app.db.session import get_db
from app.core.security import verify_admin_key

__all__ = ["get_db", "verify_admin_key"]

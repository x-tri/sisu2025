"""Storage module - Data persistence and history management"""
from .history import HistoryManager
from .export import ExportManager
from .supabase_client import SupabaseClient

__all__ = ['HistoryManager', 'ExportManager', 'SupabaseClient']

# Legacy PostgreSQL client (requires psycopg2)
try:
    from .database import DatabaseStorage
    __all__.append('DatabaseStorage')
except ImportError:
    pass

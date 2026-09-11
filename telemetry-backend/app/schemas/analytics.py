from pydantic import BaseModel
from typing import Dict

class MetricsSummary(BaseModel):
    """Resumen de métricas para el dashboard de administración."""
    total_participants: int
    completed_participants: int
    active_sessions: int
    avg_time_by_level: Dict[int, float]
    ai_hint_effectiveness_rate: float
    dropout_rate_by_level: Dict[int, float]

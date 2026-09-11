"""Esquema inicial Zero-PII de telemetría.

Revision ID: 20260911_0001
Revises:
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "20260911_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    json_type = sa.JSON().with_variant(postgresql.JSONB(), "postgresql")
    op.create_table(
        "sessions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("participant_id", sa.String(length=64), nullable=False),
        sa.Column("condition", sa.String(length=64), nullable=False),
        sa.Column("has_assent", sa.Boolean(), nullable=False),
        sa.Column("started_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_sessions_participant_id", "sessions", ["participant_id"])
    op.create_index("ix_sessions_condition", "sessions", ["condition"])

    op.create_table(
        "telemetry_events",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("session_id", sa.Uuid(), nullable=False),
        sa.Column("participant_id", sa.String(length=64), nullable=False),
        sa.Column("level_id", sa.Integer(), nullable=False),
        sa.Column("step_index", sa.Integer(), nullable=True),
        sa.Column("event_type", sa.String(length=64), nullable=False),
        sa.Column("is_success", sa.Boolean(), nullable=True),
        sa.Column("attempt_number", sa.Integer(), nullable=True),
        sa.Column("active_time_ms", sa.Integer(), nullable=True),
        sa.Column("idle_time_ms", sa.Integer(), nullable=True),
        sa.Column("error_category", sa.String(length=64), nullable=True),
        sa.Column("error_message_snippet", sa.String(length=250), nullable=True),
        sa.Column("ai_hint_type", sa.String(length=64), nullable=True),
        sa.Column("ai_hint_effective", sa.Boolean(), nullable=True),
        sa.Column("autonomy_score", sa.Float(), nullable=True),
        sa.Column("payload", json_type, nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.ForeignKeyConstraint(["session_id"], ["sessions.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_telemetry_events_session_id", "telemetry_events", ["session_id"])
    op.create_index("ix_telemetry_events_participant_id", "telemetry_events", ["participant_id"])
    op.create_index("ix_telemetry_events_level_id", "telemetry_events", ["level_id"])
    op.create_index("ix_telemetry_events_event_type", "telemetry_events", ["event_type"])

    op.create_table(
        "survey_responses",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("session_id", sa.Uuid(), nullable=False),
        sa.Column("participant_id", sa.String(length=64), nullable=False),
        sa.Column("sus_score", sa.Float(), nullable=True),
        sa.Column("tam_perceived_usefulness", sa.Float(), nullable=False),
        sa.Column("tam_perceived_ease_of_use", sa.Float(), nullable=False),
        sa.Column("tam_ai_scaffolding", sa.Float(), nullable=False),
        sa.Column("tam_ai_trust", sa.Float(), nullable=False),
        sa.Column("tam_intention_to_use", sa.Float(), nullable=False),
        sa.Column("raw_answers", json_type, nullable=True),
        sa.Column("submitted_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.ForeignKeyConstraint(["session_id"], ["sessions.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("session_id"),
    )
    op.create_index("ix_survey_responses_participant_id", "survey_responses", ["participant_id"])


def downgrade() -> None:
    op.drop_index("ix_survey_responses_participant_id", table_name="survey_responses")
    op.drop_table("survey_responses")
    op.drop_index("ix_telemetry_events_event_type", table_name="telemetry_events")
    op.drop_index("ix_telemetry_events_level_id", table_name="telemetry_events")
    op.drop_index("ix_telemetry_events_participant_id", table_name="telemetry_events")
    op.drop_index("ix_telemetry_events_session_id", table_name="telemetry_events")
    op.drop_table("telemetry_events")
    op.drop_index("ix_sessions_condition", table_name="sessions")
    op.drop_index("ix_sessions_participant_id", table_name="sessions")
    op.drop_table("sessions")

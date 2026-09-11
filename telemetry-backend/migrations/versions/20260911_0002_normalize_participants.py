"""Normaliza participantes y completa los contratos de telemetría.

Revision ID: 20260911_0002
Revises: 20260911_0001
"""
from datetime import timezone
import uuid

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260911_0002"
down_revision = "20260911_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    json_type = sa.JSON().with_variant(postgresql.JSONB(), "postgresql")
    op.create_table(
        "participants",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("anonymous_code", sa.String(length=64), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.Column("metadata", json_type, nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("anonymous_code"),
    )
    op.create_index(
        "ix_participants_anonymous_code",
        "participants",
        ["anonymous_code"],
    )

    connection = op.get_bind()
    if connection.dialect.name == "postgresql":
        op.execute(
            """
            INSERT INTO participants (id, anonymous_code, created_at, metadata)
            SELECT md5(anonymous_code)::uuid,
                   anonymous_code,
                   min(observed_at) AT TIME ZONE 'UTC',
                   '{}'::jsonb
            FROM (
                SELECT participant_id AS anonymous_code, started_at AS observed_at
                FROM sessions
                UNION ALL
                SELECT participant_id, created_at
                FROM telemetry_events
                UNION ALL
                SELECT participant_id, submitted_at
                FROM survey_responses
            ) AS observations
            GROUP BY anonymous_code
            """
        )
    else:
        sessions = sa.table(
            "sessions",
            sa.column("participant_id", sa.String()),
            sa.column("started_at", sa.DateTime()),
        )
        participants = sa.table(
            "participants",
            sa.column("id", sa.Uuid()),
            sa.column("anonymous_code", sa.String()),
            sa.column("created_at", sa.DateTime(timezone=True)),
            sa.column("metadata", json_type),
        )
        existing_codes = connection.execute(
            sa.select(
                sessions.c.participant_id,
                sa.func.min(sessions.c.started_at).label("created_at"),
            ).group_by(sessions.c.participant_id)
        ).all()
        for anonymous_code, created_at in existing_codes:
            if created_at is not None and created_at.tzinfo is None:
                created_at = created_at.replace(tzinfo=timezone.utc)
            connection.execute(
                participants.insert().values(
                    id=uuid.uuid4(),
                    anonymous_code=anonymous_code,
                    created_at=created_at,
                    metadata={},
                )
            )

    op.create_foreign_key(
        "fk_sessions_participant_code",
        "sessions",
        "participants",
        ["participant_id"],
        ["anonymous_code"],
        ondelete="RESTRICT",
    )
    op.create_foreign_key(
        "fk_telemetry_events_participant_code",
        "telemetry_events",
        "participants",
        ["participant_id"],
        ["anonymous_code"],
        ondelete="RESTRICT",
    )
    op.create_foreign_key(
        "fk_survey_responses_participant_code",
        "survey_responses",
        "participants",
        ["participant_id"],
        ["anonymous_code"],
        ondelete="RESTRICT",
    )

    op.add_column(
        "survey_responses",
        sa.Column("tam_scores", json_type, server_default=sa.text("'{}'"), nullable=False),
    )
    op.add_column(
        "survey_responses",
        sa.Column("sus_scores", json_type, server_default=sa.text("'{}'"), nullable=False),
    )
    if connection.dialect.name == "postgresql":
        op.execute(
            """
            UPDATE survey_responses
            SET tam_scores = jsonb_build_object(
                    'perceived_usefulness', tam_perceived_usefulness,
                    'perceived_ease_of_use', tam_perceived_ease_of_use,
                    'ai_scaffolding', tam_ai_scaffolding,
                    'ai_trust', tam_ai_trust,
                    'intention_to_use', tam_intention_to_use
                ),
                sus_scores = jsonb_build_object(
                    'answers', COALESCE(raw_answers -> 'sus', 'null'::jsonb),
                    'score', sus_score
                )
            """
        )
    op.alter_column("survey_responses", "tam_scores", server_default=None)
    op.alter_column("survey_responses", "sus_scores", server_default=None)

    op.alter_column(
        "sessions",
        "started_at",
        type_=sa.DateTime(timezone=True),
        postgresql_using="started_at AT TIME ZONE 'UTC'",
    )
    op.alter_column(
        "sessions",
        "completed_at",
        type_=sa.DateTime(timezone=True),
        postgresql_using="completed_at AT TIME ZONE 'UTC'",
    )
    op.alter_column(
        "telemetry_events",
        "created_at",
        new_column_name="timestamp",
        type_=sa.DateTime(timezone=True),
        postgresql_using="created_at AT TIME ZONE 'UTC'",
    )
    op.alter_column(
        "survey_responses",
        "submitted_at",
        type_=sa.DateTime(timezone=True),
        postgresql_using="submitted_at AT TIME ZONE 'UTC'",
    )


def downgrade() -> None:
    op.alter_column(
        "survey_responses",
        "submitted_at",
        type_=sa.DateTime(),
        postgresql_using="submitted_at AT TIME ZONE 'UTC'",
    )
    op.alter_column(
        "telemetry_events",
        "timestamp",
        new_column_name="created_at",
        type_=sa.DateTime(),
        postgresql_using='"timestamp" AT TIME ZONE \'UTC\'',
    )
    op.alter_column(
        "sessions",
        "completed_at",
        type_=sa.DateTime(),
        postgresql_using="completed_at AT TIME ZONE 'UTC'",
    )
    op.alter_column(
        "sessions",
        "started_at",
        type_=sa.DateTime(),
        postgresql_using="started_at AT TIME ZONE 'UTC'",
    )
    op.drop_column("survey_responses", "sus_scores")
    op.drop_column("survey_responses", "tam_scores")
    op.drop_constraint(
        "fk_survey_responses_participant_code",
        "survey_responses",
        type_="foreignkey",
    )
    op.drop_constraint(
        "fk_telemetry_events_participant_code",
        "telemetry_events",
        type_="foreignkey",
    )
    op.drop_constraint(
        "fk_sessions_participant_code",
        "sessions",
        type_="foreignkey",
    )
    op.drop_index("ix_participants_anonymous_code", table_name="participants")
    op.drop_table("participants")

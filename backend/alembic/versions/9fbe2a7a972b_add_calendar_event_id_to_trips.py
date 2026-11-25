"""add_calendar_event_id_to_trips

Revision ID: 9fbe2a7a972b
Revises: 
Create Date: 2026-11-23 23:24:44.851634

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9fbe2a7a972b'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add calendar_event_id column if not exists
    conn = op.get_bind()
    insp = sa.inspect(conn)
    columns = [c['name'] for c in insp.get_columns('trips')]
    if 'calendar_event_id' not in columns:
        op.add_column('trips', sa.Column('calendar_event_id', sa.String(length=100), nullable=True))
        op.create_index(op.f('ix_trips_calendar_event_id'), 'trips', ['calendar_event_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_trips_calendar_event_id'), table_name='trips')
    op.drop_column('trips', 'calendar_event_id')


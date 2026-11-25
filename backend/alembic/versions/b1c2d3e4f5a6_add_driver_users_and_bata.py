"""add_driver_users_and_bata

Revision ID: b1c2d3e4f5a6
Revises: 9fbe2a7a972b
Create Date: 2026-11-25 16:53:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b1c2d3e4f5a6'
down_revision: Union[str, None] = '9fbe2a7a972b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    insp = sa.inspect(conn)
    tables = insp.get_table_names()

    # 1. Create driver_users table if not exists
    if 'driver_users' not in tables:
        op.create_table(
            'driver_users',
            sa.Column('id', sa.String(length=36), primary_key=True),
            sa.Column('username', sa.String(length=50), nullable=False, unique=True),
            sa.Column('full_name', sa.String(length=100), nullable=False),
            sa.Column('password_hash', sa.String(length=255), nullable=False),
            sa.Column('is_owner_driver', sa.Boolean(), nullable=False, default=False),
            sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        )
        op.create_index(op.f('ix_driver_users_username'), 'driver_users', ['username'], unique=True)

    # 2. Add columns to trips if not exist
    trip_columns = [c['name'] for c in insp.get_columns('trips')]
    if 'driver_username' not in trip_columns:
        op.add_column('trips', sa.Column('driver_username', sa.String(length=50), nullable=True))
        op.create_index(op.f('ix_trips_driver_username'), 'trips', ['driver_username'], unique=False)
    if 'driver_bata_inr' not in trip_columns:
        op.add_column('trips', sa.Column('driver_bata_inr', sa.Float(), nullable=False, server_default='0.0'))


def downgrade() -> None:
    conn = op.get_bind()
    insp = sa.inspect(conn)
    trip_columns = [c['name'] for c in insp.get_columns('trips')]
    if 'driver_bata_inr' in trip_columns:
        op.drop_column('trips', 'driver_bata_inr')
    if 'driver_username' in trip_columns:
        op.drop_index(op.f('ix_trips_driver_username'), table_name='trips')
        op.drop_column('trips', 'driver_username')
    tables = insp.get_table_names()
    if 'driver_users' in tables:
        op.drop_index(op.f('ix_driver_users_username'), table_name='driver_users')
        op.drop_table('driver_users')

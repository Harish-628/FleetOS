"""add_itemized_road_expenses

Revision ID: c2d3e4f5a6b7
Revises: b1c2d3e4f5a6
Create Date: 2026-11-25 18:35:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c2d3e4f5a6b7'
down_revision: Union[str, None] = 'b1c2d3e4f5a6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    insp = sa.inspect(conn)
    tables = insp.get_table_names()
    if 'trips' in tables:
        existing_columns = [col['name'] for col in insp.get_columns('trips')]

        if 'toll_amount_inr' not in existing_columns:
            op.add_column('trips', sa.Column('toll_amount_inr', sa.Float(), nullable=False, server_default='0.0'))
        if 'rto_amount_inr' not in existing_columns:
            op.add_column('trips', sa.Column('rto_amount_inr', sa.Float(), nullable=False, server_default='0.0'))
        if 'parking_amount_inr' not in existing_columns:
            op.add_column('trips', sa.Column('parking_amount_inr', sa.Float(), nullable=False, server_default='0.0'))
        if 'other_expenses_inr' not in existing_columns:
            op.add_column('trips', sa.Column('other_expenses_inr', sa.Float(), nullable=False, server_default='0.0'))


def downgrade() -> None:
    op.drop_column('trips', 'other_expenses_inr')
    op.drop_column('trips', 'parking_amount_inr')
    op.drop_column('trips', 'rto_amount_inr')
    op.drop_column('trips', 'toll_amount_inr')

"""add sort_order to items and vacation_dates to settings

Revision ID: a1b2c3d4e5f6
Revises: 26da73bdb3b6
Create Date: 2026-05-25 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '26da73bdb3b6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('items', sa.Column('sort_order', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('user_settings', sa.Column('vacation_dates', sa.String(length=2000), nullable=True))


def downgrade() -> None:
    op.drop_column('user_settings', 'vacation_dates')
    op.drop_column('items', 'sort_order')

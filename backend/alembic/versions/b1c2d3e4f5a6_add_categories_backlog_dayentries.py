"""add categories, backlog_items, day_entries

Revision ID: b1c2d3e4f5a6
Revises: a1b2c3d4e5f6
Create Date: 2026-05-25 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'b1c2d3e4f5a6'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'categories',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('color', sa.String(length=20), nullable=False, server_default='#6366f1'),
        sa.Column('icon', sa.String(length=10), nullable=False, server_default='📺'),
        sa.Column('type', sa.String(length=20), nullable=False, server_default='other'),
        sa.Column('weekly_goal_minutes', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='1'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_categories_id', 'categories', ['id'])

    op.create_table(
        'backlog_items',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('category_id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('synopsis', sa.Text(), nullable=True),
        sa.Column('image_url', sa.String(length=1000), nullable=True),
        sa.Column('external_id', sa.String(length=255), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='queued'),
        sa.Column('total_units', sa.Integer(), nullable=True),
        sa.Column('current_unit', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('unit_label', sa.String(length=50), nullable=True),
        sa.Column('session_duration_minutes', sa.Integer(), nullable=False, server_default='30'),
        sa.Column('sort_order', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.ForeignKeyConstraint(['category_id'], ['categories.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_backlog_items_id', 'backlog_items', ['id'])

    op.create_table(
        'day_entries',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('item_id', sa.Integer(), nullable=False),
        sa.Column('category_id', sa.Integer(), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('start_time', sa.String(length=5), nullable=False, server_default='18:00'),
        sa.Column('duration_minutes', sa.Integer(), nullable=False, server_default='30'),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='pending'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.ForeignKeyConstraint(['item_id'], ['backlog_items.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['category_id'], ['categories.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_day_entries_id', 'day_entries', ['id'])

    # Seed initial categories from activities
    op.execute("""
        INSERT INTO categories (title, color, icon, type, weekly_goal_minutes, is_active)
        SELECT
            title,
            color,
            CASE
                WHEN lower(title) LIKE '%serie%' THEN '📺'
                WHEN lower(title) LIKE '%videojuego%' OR lower(title) LIKE '%juego%' THEN '🎮'
                WHEN lower(title) LIKE '%leer%' OR lower(title) LIKE '%libro%' THEN '📚'
                WHEN lower(title) LIKE '%anime%' THEN '🍥'
                WHEN lower(title) LIKE '%manga%' THEN '📖'
                WHEN lower(title) LIKE '%podcast%' THEN '🎙️'
                WHEN lower(title) LIKE '%ejerci%' THEN '🏃'
                ELSE '⭐'
            END,
            CASE
                WHEN lower(title) LIKE '%serie%' THEN 'series'
                WHEN lower(title) LIKE '%videojuego%' OR lower(title) LIKE '%juego%' THEN 'game'
                WHEN lower(title) LIKE '%leer%' OR lower(title) LIKE '%libro%' THEN 'book'
                WHEN lower(title) LIKE '%anime%' THEN 'anime'
                WHEN lower(title) LIKE '%manga%' THEN 'manga'
                WHEN lower(title) LIKE '%podcast%' THEN 'podcast'
                ELSE 'other'
            END,
            target_per_week * duration_minutes,
            is_active
        FROM activities
    """)

    # Migrate existing items to backlog_items
    op.execute("""
        INSERT INTO backlog_items (category_id, title, status, current_unit, session_duration_minutes, sort_order, created_at)
        SELECT
            c.id,
            i.title,
            CASE
                WHEN i.status = 'active' THEN 'active'
                WHEN i.status = 'done' THEN 'done'
                ELSE 'queued'
            END,
            i.progress,
            a.duration_minutes,
            i.sort_order,
            i.created_at
        FROM items i
        JOIN activities a ON i.activity_id = a.id
        JOIN categories c ON c.title = a.title
    """)


def downgrade() -> None:
    op.drop_index('ix_day_entries_id', table_name='day_entries')
    op.drop_table('day_entries')
    op.drop_index('ix_backlog_items_id', table_name='backlog_items')
    op.drop_table('backlog_items')
    op.drop_index('ix_categories_id', table_name='categories')
    op.drop_table('categories')

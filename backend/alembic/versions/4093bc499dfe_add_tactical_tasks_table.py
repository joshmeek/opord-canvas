"""Add tactical tasks table

Revision ID: 4093bc499dfe
Revises: 9f6755b77302
Create Date: 2025-05-16 10:03:49.450435

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from pgvector.sqlalchemy import Vector


# revision identifiers, used by Alembic.
revision: str = '4093bc499dfe'
down_revision: Union[str, None] = '9f6755b77302'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Enable pgvector extension
    op.execute('CREATE EXTENSION IF NOT EXISTS vector')
    
    # Create tactical_tasks table
    op.create_table(
        'tactical_tasks',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('definition', sa.Text(), nullable=False),
        sa.Column('page_number', sa.String(), nullable=False),
        sa.Column('image_path', sa.String(), nullable=True),
        sa.Column('embedding', Vector(1536), nullable=True),
        sa.Column('source_reference', sa.String(), nullable=False),
        sa.Column('related_figures', sa.ARRAY(sa.String()), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_tactical_tasks_id'), 'tactical_tasks', ['id'], unique=False)
    op.create_index(op.f('ix_tactical_tasks_name'), 'tactical_tasks', ['name'], unique=True)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_tactical_tasks_name'), table_name='tactical_tasks')
    op.drop_index(op.f('ix_tactical_tasks_id'), table_name='tactical_tasks')
    op.drop_table('tactical_tasks')
    op.execute('DROP EXTENSION IF EXISTS vector')

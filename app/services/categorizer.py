from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.database import get_session
from app.models.models import Category
from app.schemas.schemas import CategoryResponse, CategoryCreate, CategoryUpdate

router = APIRouter(prefix="/categories", tags=["categories"])

TEMP_HOUSEHOLD_ID = UUID("00000000-0000-0000-0000-000000000002")

@router.get("", response_model=list[CategoryResponse])
async def list_categories(
    include_inactive: bool = False,
    session: AsyncSession = Depends(get_session),
):
    """List all categories for the household."""
    query = select(Category).where(Category.household_id == TEMP_HOUSEHOLD_ID)
    if not include_inactive:
        query = query.where(Category.is_active == True)
    query = query.order_by(Category.sort_order)
    
    result = await session.execute(query)
    return result.scalars().all()

@router.post("", response_model=CategoryResponse)
async def create_category(
    data: CategoryCreate,
    session: AsyncSession = Depends(get_session),
):
    """Create a new category."""
    # Check slug uniqueness
    existing = await session.execute(
        select(Category)
        .where(Category.household_id == TEMP_HOUSEHOLD_ID)
        .where(Category.slug == data.slug)
    )
    if existing.first():
        raise HTTPException(400, f"Category with slug '{data.slug}' already exists")
    
    category = Category(
        household_id=TEMP_HOUSEHOLD_ID,
        name=data.name,
        slug=data.slug,
        icon=data.icon,
        sort_order=data.sort_order,
    )
    session.add(category)
    await session.commit()
    await session.refresh(category)
    return category

@router.patch("/{category_id}", response_model=CategoryResponse)
async def update_category(
    category_id: UUID,
    data: CategoryUpdate,
    session: AsyncSession = Depends(get_session),
):
    """Update a category."""
    category = await session.get(Category, category_id)
    if not category or category.household_id != TEMP_HOUSEHOLD_ID:
        raise HTTPException(404, "Category not found")
    
    if data.name is not None:
        category.name = data.name
    if data.slug is not None:
        category.slug = data.slug
    if data.icon is not None:
        category.icon = data.icon
    if data.is_active is not None:
        category.is_active = data.is_active
    if data.sort_order is not None:
        category.sort_order = data.sort_order
    
    await session.commit()
    await session.refresh(category)
    return category

@router.delete("/{category_id}")
async def delete_category(
    category_id: UUID,
    session: AsyncSession = Depends(get_session),
):
    """Soft-delete a category (sets is_active=False)."""
    category = await session.get(Category, category_id)
    if not category or category.household_id != TEMP_HOUSEHOLD_ID:
        raise HTTPException(404, "Category not found")
    
    category.is_active = False
    await session.commit()
    return {"deleted": True}
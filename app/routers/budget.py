from datetime import datetime
from decimal import Decimal
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func
from sqlmodel import select
from calendar import monthrange

from app.database import get_session
from app.config import settings
from app.models.models import Receipt, Budget, Category
from app.schemas.schemas import (
    BudgetDashboard, BudgetCategorySummary, BudgetSetRequest, 
    ReceiptListItem, CategoryResponse
)

router = APIRouter(prefix="/budget", tags=["budget"])

TEMP_USER_ID = UUID("00000000-0000-0000-0000-000000000001")
TEMP_HOUSEHOLD_ID = UUID("00000000-0000-0000-0000-000000000002")

def category_to_response(cat: Category) -> CategoryResponse:
    return CategoryResponse(
        id=cat.id,
        name=cat.name,
        slug=cat.slug,
        icon=cat.icon,
        is_active=cat.is_active,
        sort_order=cat.sort_order,
    )

@router.get("", response_model=BudgetDashboard)
async def get_budget_dashboard(
    session: AsyncSession = Depends(get_session),
    year: int = Query(default=None),
    month: int = Query(default=None, ge=1, le=12),
):
    """Get budget overview for a specific month. Defaults to current month."""
    now = datetime.utcnow()
    
    # Use provided year/month or default to current
    target_year = year if year else now.year
    target_month = month if month else now.month
    
    # Calculate month boundaries
    month_start = datetime(target_year, target_month, 1, 0, 0, 0)
    last_day = monthrange(target_year, target_month)[1]
    month_end = datetime(target_year, target_month, last_day, 23, 59, 59)
    
    month_str = f"{target_year}-{target_month:02d}"
    
    # Get all active categories
    cat_query = select(Category).where(
        Category.household_id == TEMP_HOUSEHOLD_ID,
        Category.is_active == True
    ).order_by(Category.sort_order)
    cat_result = await session.execute(cat_query)
    categories = {c.id: c for c in cat_result.scalars().all()}
    
    # Get spending by category for target month (use transaction_date, fall back to created_at)
    spending_query = (
        select(Receipt.category_id, func.sum(Receipt.grand_total))
        .where(Receipt.user_id == TEMP_USER_ID)
        .where(
            func.coalesce(Receipt.transaction_date, Receipt.created_at) >= month_start
        )
        .where(
            func.coalesce(Receipt.transaction_date, Receipt.created_at) <= month_end
        )
        .where(Receipt.category_id != None)
        .group_by(Receipt.category_id)
    )
    spending_result = await session.execute(spending_query)
    spending_by_cat = {row[0]: row[1] for row in spending_result.all()}
    
    # Get budget limits (use limits that were effective during target month)
    budget_query = (
        select(Budget)
        .where(Budget.household_id == TEMP_HOUSEHOLD_ID)
        .where(Budget.effective_from <= month_end)
        .where((Budget.effective_to == None) | (Budget.effective_to >= month_start))
    )
    budget_result = await session.execute(budget_query)
    budgets = {b.category_id: b.monthly_limit for b in budget_result.scalars().all()}
    
    # Build category summaries
    category_summaries = []
    total_budget = Decimal("0")
    total_spent = Decimal("0")
    
    for cat_id, category in categories.items():
        limit = budgets.get(cat_id, Decimal("0"))
        spent = spending_by_cat.get(cat_id, Decimal("0"))
        remaining = limit - spent
        percent = float(spent / limit * 100) if limit > 0 else 0
        
        total_budget += limit
        total_spent += spent
        
        if limit > 0 or spent > 0:
            category_summaries.append(BudgetCategorySummary(
                category=category_to_response(category),
                monthly_limit=limit,
                spent_this_month=spent,
                remaining=remaining,
                percent_used=round(percent, 1),
            ))
    
    # Get recent receipts for target month (use transaction_date, fall back to created_at)
    recent_query = (
        select(Receipt)
        .where(Receipt.user_id == TEMP_USER_ID)
        .where(
            func.coalesce(Receipt.transaction_date, Receipt.created_at) >= month_start
        )
        .where(
            func.coalesce(Receipt.transaction_date, Receipt.created_at) <= month_end
        )
        .order_by(func.coalesce(Receipt.transaction_date, Receipt.created_at).desc())
        .limit(10)
    )
    recent_result = await session.execute(recent_query)
    recent_receipts = [
        ReceiptListItem(
            id=r.id,
            merchant_name=r.merchant_name,
            transaction_date=r.transaction_date,
            grand_total=r.grand_total,
            category=category_to_response(categories[r.category_id]) if r.category_id in categories else None,
            expense_type=r.expense_type,
            needs_review=r.category_confidence < settings.category_confidence_threshold,
            created_at=r.created_at,
        )
        for r in recent_result.scalars().all()
    ]
    
    return BudgetDashboard(
        month=month_str,
        total_budget=total_budget,
        total_spent=total_spent,
        total_remaining=total_budget - total_spent,
        by_category=category_summaries,
        recent_receipts=recent_receipts,
    )

@router.put("/categories/{category_id}")
async def set_category_budget(
    category_id: UUID,
    request: BudgetSetRequest,
    session: AsyncSession = Depends(get_session),
):
    """Set or update budget limit for a category for a specific month."""
    category = await session.get(Category, category_id)
    if not category or category.household_id != TEMP_HOUSEHOLD_ID:
        raise HTTPException(404, "Category not found")
    
    now = datetime.utcnow()
    
    # Determine effective date - start of specified month or now
    if request.year and request.month:
        effective_date = datetime(request.year, request.month, 1, 0, 0, 0)
        last_day = monthrange(request.year, request.month)[1]
        month_end = datetime(request.year, request.month, last_day, 23, 59, 59)
    else:
        effective_date = now
        month_end = None
    
    # Expire existing budget for this category that overlaps
    existing_query = (
        select(Budget)
        .where(Budget.household_id == TEMP_HOUSEHOLD_ID)
        .where(Budget.category_id == category_id)
        .where(Budget.effective_from <= (month_end or now))
        .where((Budget.effective_to == None) | (Budget.effective_to >= effective_date))
    )
    existing_result = await session.execute(existing_query)
    for existing in existing_result.scalars().all():
        if existing.effective_from < effective_date:
            existing.effective_to = effective_date
        else:
            await session.delete(existing)
    
    # Create new budget
    new_budget = Budget(
        household_id=TEMP_HOUSEHOLD_ID,
        category_id=category_id,
        monthly_limit=request.monthly_limit,
        effective_from=effective_date,
        effective_to=month_end if request.year and request.month else None,
    )
    session.add(new_budget)
    await session.commit()
    
    return {
        "category": category_to_response(category),
        "monthly_limit": request.monthly_limit
    }
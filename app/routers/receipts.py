from datetime import datetime
from decimal import Decimal
from uuid import UUID
from calendar import monthrange
from fastapi import APIRouter, Depends, File, UploadFile, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func
from sqlmodel import select

from app.database import get_session
from app.config import settings
from app.models.models import Receipt, Category, ExpenseType
from app.schemas.schemas import (
    ReceiptUploadResponse, ReceiptDetail, ReceiptUpdate, ReceiptListItem, 
    ManualEntryRequest, CategoryResponse
)
from app.services.receipt_processor import process_receipt
from app.services.storage import save_receipt_image, get_receipt_url

router = APIRouter(prefix="/receipts", tags=["receipts"])

TEMP_USER_ID = UUID("00000000-0000-0000-0000-000000000001")
TEMP_HOUSEHOLD_ID = UUID("00000000-0000-0000-0000-000000000002")

def category_to_response(cat: Category | None) -> CategoryResponse | None:
    if not cat:
        return None
    return CategoryResponse(
        id=cat.id,
        name=cat.name,
        slug=cat.slug,
        icon=cat.icon,
        is_active=cat.is_active,
        sort_order=cat.sort_order,
    )

@router.post("/manual", response_model=ReceiptDetail)
async def create_manual_entry(
    entry: ManualEntryRequest,
    session: AsyncSession = Depends(get_session),
):
    """Manually add an expense without a receipt image."""
    # Verify category exists
    category = await session.get(Category, entry.category_id)
    if not category or category.household_id != TEMP_HOUSEHOLD_ID:
        raise HTTPException(400, "Invalid category")
    
    receipt = Receipt(
        user_id=TEMP_USER_ID,
        image_path=None,
        merchant_name=entry.merchant_name,
        transaction_date=entry.transaction_date or datetime.utcnow(),
        grand_total=entry.grand_total,
        category_id=entry.category_id,
        category_confidence=1.0,
        category_overridden=True,
        expense_type=entry.expense_type,
    )
    
    session.add(receipt)
    await session.commit()
    await session.refresh(receipt)
    
    return ReceiptDetail(
        id=receipt.id,
        merchant_name=receipt.merchant_name,
        transaction_date=receipt.transaction_date,
        subtotal=receipt.subtotal,
        tax=receipt.tax,
        tip=receipt.tip,
        grand_total=receipt.grand_total,
        payment_method=receipt.payment_method,
        category=category_to_response(category),
        category_confidence=receipt.category_confidence,
        category_overridden=receipt.category_overridden,
        expense_type=receipt.expense_type,
        image_url=None,
        created_at=receipt.created_at,
    )

@router.post("/upload", response_model=ReceiptUploadResponse)
async def upload_receipt(
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_session),
):
    """Upload a receipt image for processing."""
    if file.content_type not in ["image/jpeg", "image/png", "image/webp"]:
        raise HTTPException(400, "File must be JPEG, PNG, or WebP image")
    
    image_bytes = await file.read()
    if len(image_bytes) > settings.max_upload_size_mb * 1024 * 1024:
        raise HTTPException(400, f"File too large. Max {settings.max_upload_size_mb}MB")
    
    image_path = await save_receipt_image(image_bytes, file.filename)
    
    # Get available categories for the processor
    cat_query = select(Category).where(
        Category.household_id == TEMP_HOUSEHOLD_ID,
        Category.is_active == True
    )
    cat_result = await session.execute(cat_query)
    categories = [
        {"id": c.id, "slug": c.slug, "name": c.name} 
        for c in cat_result.scalars().all()
    ]
    
    try:
        result = await process_receipt(image_bytes, file.content_type, categories)
    except Exception as e:
        raise HTTPException(500, f"Failed to process receipt: {str(e)}")
    
    tx_date = None
    if result.get("transaction_date"):
        try:
            tx_date = datetime.fromisoformat(result["transaction_date"])
        except ValueError:
            pass
    
    receipt = Receipt(
        user_id=TEMP_USER_ID,
        image_path=image_path,
        merchant_name=result.get("merchant_name"),
        transaction_date=tx_date,
        subtotal=Decimal(str(result["subtotal"])) if result.get("subtotal") else None,
        tax=Decimal(str(result["tax"])) if result.get("tax") else None,
        tip=Decimal(str(result["tip"])) if result.get("tip") else None,
        grand_total=Decimal(str(result["grand_total"])),
        payment_method=result.get("payment_method"),
        category_id=result.get("category_id"),
        category_confidence=result["category_confidence"],
        raw_extraction=result["raw_extraction"],
    )
    
    session.add(receipt)
    await session.commit()
    await session.refresh(receipt)
    
    # Load category for response
    category = await session.get(Category, receipt.category_id) if receipt.category_id else None
    needs_review = receipt.category_confidence < settings.category_confidence_threshold
    
    return ReceiptUploadResponse(
        id=receipt.id,
        merchant_name=receipt.merchant_name,
        transaction_date=receipt.transaction_date,
        grand_total=receipt.grand_total,
        category=category_to_response(category),
        category_confidence=receipt.category_confidence,
        needs_review=needs_review,
        image_url=get_receipt_url(receipt.image_path),
    )

@router.get("", response_model=list[ReceiptListItem])
async def list_receipts(
    session: AsyncSession = Depends(get_session),
    category_id: UUID | None = None,
    year: int | None = Query(default=None),
    month: int | None = Query(default=None, ge=1, le=12),
    limit: int = Query(default=50, le=100),
    offset: int = 0,
):
    """List receipts with optional filtering."""
    query = select(Receipt).where(Receipt.user_id == TEMP_USER_ID)
    
    if category_id:
        query = query.where(Receipt.category_id == category_id)
    
    # Filter by month if provided
    if year and month:
        month_start = datetime(year, month, 1, 0, 0, 0)
        last_day = monthrange(year, month)[1]
        month_end = datetime(year, month, last_day, 23, 59, 59)
        query = query.where(
            func.coalesce(Receipt.transaction_date, Receipt.created_at) >= month_start
        ).where(
            func.coalesce(Receipt.transaction_date, Receipt.created_at) <= month_end
        )
    
    query = query.order_by(
        func.coalesce(Receipt.transaction_date, Receipt.created_at).desc()
    ).offset(offset).limit(limit)
    result = await session.execute(query)
    receipts = result.scalars().all()
    
    # Load categories
    cat_ids = [r.category_id for r in receipts if r.category_id]
    categories = {}
    if cat_ids:
        cat_result = await session.execute(select(Category).where(Category.id.in_(cat_ids)))
        categories = {c.id: c for c in cat_result.scalars().all()}
    
    return [
        ReceiptListItem(
            id=r.id,
            merchant_name=r.merchant_name,
            transaction_date=r.transaction_date,
            grand_total=r.grand_total,
            category=category_to_response(categories.get(r.category_id)),
            expense_type=r.expense_type,
            needs_review=r.category_confidence < settings.category_confidence_threshold,
            created_at=r.created_at,
        )
        for r in receipts
    ]

@router.get("/{receipt_id}", response_model=ReceiptDetail)
async def get_receipt(
    receipt_id: UUID,
    session: AsyncSession = Depends(get_session),
):
    """Get receipt details."""
    receipt = await session.get(Receipt, receipt_id)
    if not receipt or receipt.user_id != TEMP_USER_ID:
        raise HTTPException(404, "Receipt not found")
    
    category = await session.get(Category, receipt.category_id) if receipt.category_id else None
    
    return ReceiptDetail(
        id=receipt.id,
        merchant_name=receipt.merchant_name,
        transaction_date=receipt.transaction_date,
        subtotal=receipt.subtotal,
        tax=receipt.tax,
        tip=receipt.tip,
        grand_total=receipt.grand_total,
        payment_method=receipt.payment_method,
        category=category_to_response(category),
        category_confidence=receipt.category_confidence,
        category_overridden=receipt.category_overridden,
        expense_type=receipt.expense_type,
        image_url=get_receipt_url(receipt.image_path) if receipt.image_path else None,
        created_at=receipt.created_at,
    )

@router.patch("/{receipt_id}", response_model=ReceiptDetail)
async def update_receipt(
    receipt_id: UUID,
    update: ReceiptUpdate,
    session: AsyncSession = Depends(get_session),
):
    """Update receipt category or other fields."""
    receipt = await session.get(Receipt, receipt_id)
    if not receipt or receipt.user_id != TEMP_USER_ID:
        raise HTTPException(404, "Receipt not found")
    
    if update.category_id is not None:
        category = await session.get(Category, update.category_id)
        if not category or category.household_id != TEMP_HOUSEHOLD_ID:
            raise HTTPException(400, "Invalid category")
        receipt.category_id = update.category_id
        receipt.category_overridden = True
    if update.expense_type is not None:
        receipt.expense_type = update.expense_type
    if update.merchant_name is not None:
        receipt.merchant_name = update.merchant_name
    if update.grand_total is not None:
        receipt.grand_total = update.grand_total
    if update.transaction_date is not None:
        receipt.transaction_date = update.transaction_date
    
    await session.commit()
    await session.refresh(receipt)
    
    category = await session.get(Category, receipt.category_id) if receipt.category_id else None
    
    return ReceiptDetail(
        id=receipt.id,
        merchant_name=receipt.merchant_name,
        transaction_date=receipt.transaction_date,
        subtotal=receipt.subtotal,
        tax=receipt.tax,
        tip=receipt.tip,
        grand_total=receipt.grand_total,
        payment_method=receipt.payment_method,
        category=category_to_response(category),
        category_confidence=receipt.category_confidence,
        category_overridden=receipt.category_overridden,
        expense_type=receipt.expense_type,
        image_url=get_receipt_url(receipt.image_path) if receipt.image_path else None,
        created_at=receipt.created_at,
    )

@router.delete("/{receipt_id}")
async def delete_receipt(
    receipt_id: UUID,
    session: AsyncSession = Depends(get_session),
):
    """Delete a receipt."""
    receipt = await session.get(Receipt, receipt_id)
    if not receipt or receipt.user_id != TEMP_USER_ID:
        raise HTTPException(404, "Receipt not found")
    
    await session.delete(receipt)
    await session.commit()
    
    return {"deleted": True}
from datetime import datetime
from decimal import Decimal
from uuid import UUID
from pydantic import BaseModel
from app.models.models import ExpenseType

# ============================================================
# CATEGORY SCHEMAS
# ============================================================

class CategoryResponse(BaseModel):
    id: UUID
    name: str
    slug: str
    icon: str | None
    is_active: bool
    sort_order: int

class CategoryCreate(BaseModel):
    name: str
    slug: str
    icon: str | None = None
    sort_order: int = 0

class CategoryUpdate(BaseModel):
    name: str | None = None
    slug: str | None = None
    icon: str | None = None
    is_active: bool | None = None
    sort_order: int | None = None

# ============================================================
# RECEIPT SCHEMAS
# ============================================================

class ReceiptUploadResponse(BaseModel):
    id: UUID
    merchant_name: str | None
    transaction_date: datetime | None
    grand_total: Decimal
    category: CategoryResponse | None
    category_confidence: float
    needs_review: bool
    image_url: str

class ReceiptDetail(BaseModel):
    id: UUID
    merchant_name: str | None
    transaction_date: datetime | None
    subtotal: Decimal | None
    tax: Decimal | None
    tip: Decimal | None
    grand_total: Decimal
    payment_method: str | None
    category: CategoryResponse | None
    category_confidence: float
    category_overridden: bool
    expense_type: ExpenseType
    image_url: str | None
    created_at: datetime

class ReceiptUpdate(BaseModel):
    category_id: UUID | None = None
    expense_type: ExpenseType | None = None
    merchant_name: str | None = None
    grand_total: Decimal | None = None
    transaction_date: datetime | None = None

class ManualEntryRequest(BaseModel):
    merchant_name: str
    grand_total: Decimal
    category_id: UUID
    transaction_date: datetime | None = None
    expense_type: ExpenseType = ExpenseType.PERSONAL

class ReceiptListItem(BaseModel):
    id: UUID
    merchant_name: str | None
    transaction_date: datetime | None
    grand_total: Decimal
    category: CategoryResponse | None
    expense_type: ExpenseType
    needs_review: bool
    created_at: datetime

# ============================================================
# BUDGET SCHEMAS
# ============================================================

class BudgetCategorySummary(BaseModel):
    category: CategoryResponse
    monthly_limit: Decimal
    spent_this_month: Decimal
    remaining: Decimal
    percent_used: float

class BudgetDashboard(BaseModel):
    month: str
    total_budget: Decimal
    total_spent: Decimal
    total_remaining: Decimal
    by_category: list[BudgetCategorySummary]
    recent_receipts: list[ReceiptListItem]

class BudgetSetRequest(BaseModel):
    category_id: UUID
    monthly_limit: Decimal
    year: int | None = None
    month: int | None = None
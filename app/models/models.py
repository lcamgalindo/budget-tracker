from datetime import datetime
from decimal import Decimal
from enum import Enum
from uuid import UUID, uuid4
from sqlmodel import SQLModel, Field, Relationship
from typing import Optional
import sqlalchemy as sa

# ============================================================
# ENUMS
# ============================================================

class ExpenseType(str, Enum):
    PERSONAL = "personal"
    HOUSEHOLD = "household"

# ============================================================
# DATABASE MODELS
# ============================================================

class Household(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    name: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    users: list["User"] = Relationship(back_populates="household")
    receipts: list["Receipt"] = Relationship(back_populates="household")
    budgets: list["Budget"] = Relationship(back_populates="household")
    categories: list["Category"] = Relationship(back_populates="household")

class Category(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    household_id: UUID = Field(foreign_key="household.id", index=True)
    name: str  # Display name: "Dining Out"
    slug: str  # URL/code friendly: "dining-out"
    icon: str | None = None  # Optional emoji or icon name
    is_active: bool = True  # Soft delete
    sort_order: int = 0  # For UI ordering
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    household: Household = Relationship(back_populates="categories")
    receipts: list["Receipt"] = Relationship(back_populates="category_rel")
    budgets: list["Budget"] = Relationship(back_populates="category_rel")

class User(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    email: str = Field(unique=True, index=True)
    name: str
    hashed_password: str  # Add auth later
    household_id: UUID | None = Field(default=None, foreign_key="household.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    household: Household | None = Relationship(back_populates="users")
    receipts: list["Receipt"] = Relationship(back_populates="user")

class Receipt(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(foreign_key="user.id", index=True)
    household_id: UUID | None = Field(default=None, foreign_key="household.id", index=True)
    
    # File storage
    image_path: str | None = None  # Null for manual entries
    
    # Extracted data
    merchant_name: str | None = None
    transaction_date: datetime | None = None
    subtotal: Decimal | None = Field(default=None, sa_type=sa.Numeric(10, 2))
    tax: Decimal | None = Field(default=None, sa_type=sa.Numeric(10, 2))
    tip: Decimal | None = Field(default=None, sa_type=sa.Numeric(10, 2))
    grand_total: Decimal = Field(sa_type=sa.Numeric(10, 2))
    payment_method: str | None = None
    
    # Categorization
    category_id: UUID | None = Field(default=None, foreign_key="category.id", index=True)
    category_confidence: float = 0.0
    category_overridden: bool = False
    expense_type: ExpenseType = Field(default=ExpenseType.PERSONAL)
    
    # Metadata
    raw_extraction: dict = Field(default_factory=dict, sa_type=sa.JSON)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    user: User = Relationship(back_populates="receipts")
    household: Household | None = Relationship(back_populates="receipts")
    category_rel: Category | None = Relationship(back_populates="receipts")

class Budget(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    household_id: UUID = Field(foreign_key="household.id", index=True)
    category_id: UUID = Field(foreign_key="category.id", index=True)
    monthly_limit: Decimal = Field(sa_type=sa.Numeric(10, 2))
    effective_from: datetime
    effective_to: datetime | None = None
    
    household: Household = Relationship(back_populates="budgets")
    category_rel: Category = Relationship(back_populates="budgets")


# ============================================================
# DEFAULT CATEGORIES (seed data)
# ============================================================

DEFAULT_CATEGORIES = [
    {"name": "Groceries", "slug": "groceries", "icon": "🛒", "sort_order": 1},
    {"name": "Dining", "slug": "dining", "icon": "🍽️", "sort_order": 2},
    {"name": "Coffee", "slug": "coffee", "icon": "☕", "sort_order": 3},
    {"name": "Transportation", "slug": "transportation", "icon": "🚗", "sort_order": 4},
    {"name": "Entertainment", "slug": "entertainment", "icon": "🎬", "sort_order": 5},
    {"name": "Shopping", "slug": "shopping", "icon": "🛍️", "sort_order": 6},
    {"name": "Utilities", "slug": "utilities", "icon": "💡", "sort_order": 7},
    {"name": "Healthcare", "slug": "healthcare", "icon": "🏥", "sort_order": 8},
    {"name": "Home", "slug": "home", "icon": "🏠", "sort_order": 9},
    {"name": "Mortgage/Rent", "slug": "mortgage-rent", "icon": "🏦", "sort_order": 10},
    {"name": "Insurance", "slug": "insurance", "icon": "🛡️", "sort_order": 11},
    {"name": "Subscriptions", "slug": "subscriptions", "icon": "📱", "sort_order": 12},
    {"name": "Personal Care", "slug": "personal-care", "icon": "💇", "sort_order": 13},
    {"name": "Daycare", "slug": "daycare", "icon": "👶", "sort_order": 14},
    {"name": "Kids/Family", "slug": "kids-family", "icon": "👨‍👩‍👧", "sort_order": 15},
    {"name": "Pets", "slug": "pets", "icon": "🐕", "sort_order": 16},
    {"name": "Travel", "slug": "travel", "icon": "✈️", "sort_order": 17},
    {"name": "Gifts", "slug": "gifts", "icon": "🎁", "sort_order": 18},
    {"name": "Other", "slug": "other", "icon": "📦", "sort_order": 99},
]
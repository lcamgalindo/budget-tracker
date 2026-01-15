from uuid import UUID
from sqlmodel import SQLModel, select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.config import settings

engine = create_async_engine(settings.database_url, echo=settings.debug)

async_session = sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

async def get_session() -> AsyncSession:
    async with async_session() as session:
        yield session

async def init_db():
    from app.models.models import Household, User, Category, DEFAULT_CATEGORIES
    
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
    
    # Seed default household, user, and categories if empty
    async with async_session() as session:
        # Check if we need to seed
        result = await session.execute(select(Household))
        if result.first() is not None:
            return  # Already seeded
        
        # Create default household
        household = Household(
            id=UUID("00000000-0000-0000-0000-000000000002"),
            name="My Household"
        )
        session.add(household)
        
        # Create default user
        user = User(
            id=UUID("00000000-0000-0000-0000-000000000001"),
            email="user@example.com",
            name="Default User",
            hashed_password="not-implemented",
            household_id=household.id,
        )
        session.add(user)
        
        # Create default categories
        for cat_data in DEFAULT_CATEGORIES:
            category = Category(
                household_id=household.id,
                **cat_data
            )
            session.add(category)
        
        await session.commit()
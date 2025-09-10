from fastapi import Depends, HTTPException, status, Request
from typing import Optional
from datetime import datetime
from passlib.context import CryptContext
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
from models.user import UserInDB
from core.database import get_database

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Session storage (in production, use Redis or database)
sessions = {}

def create_session(user_id: str) -> str:
    """Create a new session for user"""
    import uuid
    session_id = str(uuid.uuid4())
    sessions[session_id] = {
        "user_id": user_id,
        "created_at": datetime.utcnow()
    }
    return session_id

def destroy_session(session_id: str) -> bool:
    """Destroy a session"""
    if session_id in sessions:
        del sessions[session_id]
        return True
    return False

async def get_current_user(
    request: Request,
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> UserInDB:
    """Get current user from session"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
    )
    
    # Get session ID from cookies
    session_id = request.cookies.get("session_id")
    
    if not session_id or session_id not in sessions:
        # For development, create/return superadmin if no session
        return await create_superadmin_user(db)
    
    user_id = sessions[session_id].get("user_id")
    if not user_id:
        raise credentials_exception
    
    user = await get_user_by_id(db, user_id)
    if user is None:
        raise credentials_exception
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled"
        )
    
    return user

async def get_current_active_user(current_user: UserInDB = Depends(get_current_user)) -> UserInDB:
    """Get current active user"""
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled"
        )
    return current_user



def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Hash a password"""
    return pwd_context.hash(password)

async def get_user_by_email(db: AsyncIOMotorDatabase, email: str) -> Optional[UserInDB]:
    """Get user by email from database"""
    user_data = await db.users.find_one({"email": email})
    if user_data:
        user_data["_id"] = str(user_data["_id"])
        return UserInDB(**user_data)
    return None

async def get_user_by_id(db: AsyncIOMotorDatabase, user_id: str) -> Optional[UserInDB]:
    """Get user by ID from database"""
    try:
        user_data = await db.users.find_one({"_id": ObjectId(user_id)})
        if user_data:
            user_data["_id"] = str(user_data["_id"])
            return UserInDB(**user_data)
    except Exception:
        pass
    return None

async def authenticate_user(db: AsyncIOMotorDatabase, email: str, password: str) -> Optional[UserInDB]:
    """Authenticate user with email and password"""
    user = await get_user_by_email(db, email)
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    if not user.is_active:
        return None
    return user

async def create_user(db: AsyncIOMotorDatabase, user_data: dict) -> UserInDB:
    """Create a new user in the database"""
    # Hash the password
    user_data["hashed_password"] = get_password_hash(user_data.pop("password"))
    
    # Set timestamps
    now = datetime.utcnow()
    user_data["created_at"] = now
    user_data["updated_at"] = now
    
    # Insert user
    result = await db.users.insert_one(user_data)
    user_data["_id"] = str(result.inserted_id)
    
    return UserInDB(**user_data)

async def create_superadmin_user(db: AsyncIOMotorDatabase) -> UserInDB:
    """Create default admin user if it doesn't exist"""
    # Check if admin already exists
    existing_admin = await db.users.find_one({"email": "admin@example.com"})
    if existing_admin:
        # Convert ObjectId to string for validation
        existing_admin["_id"] = str(existing_admin["_id"])
        return UserInDB(**existing_admin)
    
    # Create admin user
    admin_data = {
        "name": "Administrator",
        "email": "admin@example.com",
        "password": "admin123",  # Default password - should be changed
        "is_active": True
    }
    
    return await create_user(db, admin_data)
from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime
from typing import List

from core.database import get_database
from core.auth import (
    authenticate_user,
    create_session,
    destroy_session,
    get_current_user,
    get_current_active_user,
    create_user,
    get_user_by_email,
    get_user_by_id,
    get_password_hash,
    verify_password
)
from models.user import (
    LoginRequest,
    LoginResponse,
    UserCreate,
    UserUpdate,
    UserResponse,
    UserInDB,
    ChangePasswordRequest
)
from bson import ObjectId

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=LoginResponse)
async def login(
    login_data: LoginRequest,
    response: Response,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Authenticate user and create session"""
    user = await authenticate_user(db, login_data.email, login_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    # Update last login
    await db.users.update_one(
        {"_id": ObjectId(user.id)},
        {"$set": {"last_login": datetime.utcnow()}}
    )
    
    # Create session
    session_id = create_session(user.id)
    
    # Set session cookie
    response.set_cookie(
        key="session_id",
        value=session_id,
        httponly=True,
        secure=False,  # Set to True in production with HTTPS
        samesite="lax"
    )
    
    return LoginResponse(
        user=UserResponse(
            _id=user.id,
            name=user.name,
            email=user.email,
            is_active=user.is_active,
            created_at=user.created_at,
            updated_at=user.updated_at
        )
    )


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: UserInDB = Depends(get_current_active_user)
):
    """Get current user information"""
    return UserResponse(
        _id=current_user.id,
        name=current_user.name,
        email=current_user.email,
        is_active=current_user.is_active,
        created_at=current_user.created_at,
        updated_at=current_user.updated_at
    )


@router.post("/change-password")
async def change_password(
    password_data: ChangePasswordRequest,
    current_user: UserInDB = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Change user password"""
    # Verify current password
    if not verify_password(password_data.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )
    
    # Update password
    new_hashed_password = get_password_hash(password_data.new_password)
    await db.users.update_one(
        {"_id": ObjectId(current_user.id)},
        {
            "$set": {
                "hashed_password": new_hashed_password,
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    return {"message": "Password changed successfully"}


@router.post("/users", response_model=UserResponse)
async def create_new_user(
    user_data: UserCreate,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: UserInDB = Depends(get_current_active_user)
):
    """Create a new user"""
    # Check if user already exists
    existing_user = await get_user_by_email(db, user_data.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists"
        )
    
    # Create user
    user = await create_user(db, user_data.dict())
    
    return UserResponse(
        _id=user.id,
        name=user.name,
        email=user.email,
        is_active=user.is_active,
        created_at=user.created_at,
        updated_at=user.updated_at
    )


@router.get("/users", response_model=List[UserResponse])
async def get_users(
    skip: int = 0,
    limit: int = 100,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: UserInDB = Depends(get_current_active_user)
):
    """Get list of users"""
    cursor = db.users.find().skip(skip).limit(limit)
    users = await cursor.to_list(length=limit)
    
    return [
        UserResponse(
            _id=str(user["_id"]),
            name=user["name"],
            email=user["email"],
            is_active=user["is_active"],
            created_at=user["created_at"],
            updated_at=user["updated_at"]
        )
        for user in users
    ]


@router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: UserInDB = Depends(get_current_active_user)
):
    """Get user by ID"""
    user = await get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return UserResponse(
        _id=user.id,
        name=user.name,
        email=user.email,
        is_active=user.is_active,
        created_at=user.created_at,
        updated_at=user.updated_at
    )


@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str,
    user_update: UserUpdate,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: UserInDB = Depends(get_current_active_user)
):
    """Update user"""
    user = await get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Prepare update data
    update_data = {"updated_at": datetime.utcnow()}
    
    if user_update.name is not None:
        update_data["name"] = user_update.name
    if user_update.email is not None:
        # Check if email is already taken
        existing_user = await get_user_by_email(db, user_update.email)
        if existing_user and existing_user.id != user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already taken"
            )
        update_data["email"] = user_update.email
    if user_update.is_active is not None:
        update_data["is_active"] = user_update.is_active
    if user_update.password is not None:
        update_data["hashed_password"] = get_password_hash(user_update.password)
    
    # Update user
    await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": update_data}
    )
    
    # Get updated user
    updated_user = await get_user_by_id(db, user_id)
    
    return UserResponse(
        _id=updated_user.id,
        name=updated_user.name,
        email=updated_user.email,
        is_active=updated_user.is_active,
        created_at=updated_user.created_at,
        updated_at=updated_user.updated_at
    )


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: UserInDB = Depends(get_current_active_user)
):
    """Delete user"""
    user = await get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Prevent users from deleting themselves
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot delete your own account"
        )
    
    # Delete user
    await db.users.delete_one({"_id": ObjectId(user_id)})
    
    return {"message": "User deleted successfully"}


@router.post("/logout")
async def logout(
    request: Request,
    response: Response,
    current_user: UserInDB = Depends(get_current_active_user)
):
    """Logout user (destroy session)"""
    session_id = request.cookies.get("session_id")
    if session_id:
        destroy_session(session_id)
    
    # Clear session cookie
    response.delete_cookie(key="session_id")
    
    return {"message": "Successfully logged out"}
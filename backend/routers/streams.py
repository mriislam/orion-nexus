from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from datetime import datetime
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from core.database import get_database
from core.auth import get_current_user
from models.stream import (
    StreamConfig,
    StreamConfigCreate,
    StreamConfigUpdate,
    StreamConfigResponse,
    StreamGridConfig,
    StreamGridConfigCreate,
    StreamGridConfigResponse
)

router = APIRouter(prefix="/streams", tags=["streams"])

# Stream CRUD operations
@router.get("/", response_model=List[StreamConfigResponse])
async def get_streams(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    active_only: bool = Query(True),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get all streams"""
    try:
        # Build query filter
        query_filter = {}
        if active_only:
            query_filter["is_active"] = True
        
        # Get streams with pagination
        cursor = db.streams.find(query_filter).sort("order", 1).skip(skip).limit(limit)
        streams = await cursor.to_list(length=limit)
        
        # Convert to response format
        response_streams = []
        for stream in streams:
            stream["id"] = str(stream["_id"])
            del stream["_id"]
            response_streams.append(StreamConfigResponse(**stream))
        
        return response_streams
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get streams: {str(e)}")

@router.get("/{stream_id}", response_model=StreamConfigResponse)
async def get_stream(
    stream_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get a specific stream by ID"""
    try:
        if not ObjectId.is_valid(stream_id):
            raise HTTPException(status_code=400, detail="Invalid stream ID")
        
        stream = await db.streams.find_one({
            "_id": ObjectId(stream_id)
        })
        
        if not stream:
            raise HTTPException(status_code=404, detail="Stream not found")
        
        stream["id"] = str(stream["_id"])
        del stream["_id"]
        return StreamConfigResponse(**stream)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get stream: {str(e)}")

@router.post("/", response_model=StreamConfigResponse)
async def create_stream(
    stream_data: StreamConfigCreate,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Create a new stream"""
    try:
        # Create stream document
        stream_dict = {
            **stream_data.dict(),
            "user_id": "default_user",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "is_active": True
        }
        
        # Insert stream
        result = await db.streams.insert_one(stream_dict)
        
        # Get the created stream
        created_stream = await db.streams.find_one({"_id": result.inserted_id})
        created_stream["id"] = str(created_stream["_id"])
        del created_stream["_id"]
        
        return StreamConfigResponse(**created_stream)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create stream: {str(e)}")

@router.put("/{stream_id}", response_model=StreamConfigResponse)
async def update_stream(
    stream_id: str,
    stream_data: StreamConfigUpdate,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Update a stream"""
    try:
        if not ObjectId.is_valid(stream_id):
            raise HTTPException(status_code=400, detail="Invalid stream ID")
        
        # Check if stream exists
        existing_stream = await db.streams.find_one({
            "_id": ObjectId(stream_id)
        })
        
        if not existing_stream:
            raise HTTPException(status_code=404, detail="Stream not found")
        
        # Prepare update data
        update_data = {k: v for k, v in stream_data.dict().items() if v is not None}
        update_data["updated_at"] = datetime.utcnow()
        
        # Update stream
        await db.streams.update_one(
            {"_id": ObjectId(stream_id)},
            {"$set": update_data}
        )
        
        # Get updated stream
        updated_stream = await db.streams.find_one({"_id": ObjectId(stream_id)})
        updated_stream["id"] = str(updated_stream["_id"])
        del updated_stream["_id"]
        
        return StreamConfigResponse(**updated_stream)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update stream: {str(e)}")

@router.delete("/bulk")
async def delete_all_streams(
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Delete all streams for the current user"""
    try:
        print(f"DEBUG: Attempting to delete streams with user_id: default_user")
        result = await db.streams.delete_many({"user_id": "default_user"})
        print(f"DEBUG: Delete result: {result.deleted_count} streams deleted")
        return {"message": f"Deleted {result.deleted_count} streams"}
        
    except Exception as e:
        print(f"DEBUG: Error in delete_all_streams: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to delete streams: {str(e)}")

@router.delete("/{stream_id}")
async def delete_stream(
    stream_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Delete a stream"""
    try:
        if not ObjectId.is_valid(stream_id):
            raise HTTPException(status_code=400, detail="Invalid stream ID")
        
        # Check if stream exists
        existing_stream = await db.streams.find_one({
            "_id": ObjectId(stream_id)
        })
        
        if not existing_stream:
            raise HTTPException(status_code=404, detail="Stream not found")
        
        # Delete stream
        await db.streams.delete_one({"_id": ObjectId(stream_id)})
        
        return {"message": "Stream deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete stream: {str(e)}")

# Grid configuration endpoints
@router.get("/grid/config", response_model=StreamGridConfigResponse)
async def get_grid_config(
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get user's grid configuration"""
    try:
        grid_config = await db.stream_grids.find_one({"user_id": "default_user"})
        
        if not grid_config:
            # Return default configuration
            return StreamGridConfigResponse(
                id="default",
                user_id="default_user",
                grid_size=4,
                streams=[],
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
        
        grid_config["id"] = str(grid_config["_id"])
        del grid_config["_id"]
        return StreamGridConfigResponse(**grid_config)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get grid config: {str(e)}")

@router.post("/grid/config", response_model=StreamGridConfigResponse)
async def save_grid_config(
    grid_data: StreamGridConfigCreate,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Save user's grid configuration"""
    try:
        # Check if config already exists
        existing_config = await db.stream_grids.find_one({"user_id": "default_user"})
        
        if existing_config:
            # Update existing config
            update_data = {
                **grid_data.dict(),
                "updated_at": datetime.utcnow()
            }
            
            await db.stream_grids.update_one(
                {"user_id": "default_user"},
                {"$set": update_data}
            )
            
            updated_config = await db.stream_grids.find_one({"user_id": "default_user"})
            updated_config["id"] = str(updated_config["_id"])
            del updated_config["_id"]
            return StreamGridConfigResponse(**updated_config)
        else:
            # Create new config
            config_doc = {
                **grid_data.dict(),
                "user_id": "default_user",
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            
            result = await db.stream_grids.insert_one(config_doc)
            created_config = await db.stream_grids.find_one({"_id": result.inserted_id})
            created_config["id"] = str(created_config["_id"])
            del created_config["_id"]
            return StreamGridConfigResponse(**created_config)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save grid config: {str(e)}")

# Bulk operations
@router.post("/bulk", response_model=List[StreamConfigResponse])
async def create_bulk_streams(
    streams_data: List[StreamConfigCreate],
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Create or update multiple streams at once using upsert operations"""
    try:
        updated_streams = []
        
        for stream_data in streams_data:
            # Use stream name and order as unique identifier for upsert
            filter_query = {
                "name": stream_data.name,
                "order": stream_data.order
            }
            
            # Prepare update document
            update_doc = {
                "$set": {
                    **stream_data.dict(),
                    "user_id": "default_user",
                    "updated_at": datetime.utcnow(),
                    "is_active": True
                },
                "$setOnInsert": {
                    "created_at": datetime.utcnow()
                }
            }
            
            # Perform upsert operation
            result = await db.streams.update_one(
                filter_query,
                update_doc,
                upsert=True
            )
            
            # Get the updated/created stream
            if result.upserted_id:
                stream = await db.streams.find_one({"_id": result.upserted_id})
            else:
                stream = await db.streams.find_one(filter_query)
            
            if stream:
                stream["id"] = str(stream["_id"])
                del stream["_id"]
                updated_streams.append(StreamConfigResponse(**stream))
        
        # Sort by order for consistent response
        updated_streams.sort(key=lambda x: x.order)
        return updated_streams
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create/update bulk streams: {str(e)}")
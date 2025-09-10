from pydantic import BaseModel, Field, HttpUrl
from typing import Optional, Dict, Any, List
from datetime import datetime
from bson import ObjectId

class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid objectid")
        return ObjectId(v)

    @classmethod
    def __get_pydantic_json_schema__(cls, field_schema):
        field_schema.update(type="string")
        return field_schema

class StreamConfig(BaseModel):
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    name: str = Field(..., description="Stream display name")
    url: str = Field(..., description="Stream URL")
    headers: Optional[Dict[str, str]] = Field(default=None, description="Custom headers for the stream")
    cookies: Optional[str] = Field(default=None, description="Cookies for the stream")
    order: int = Field(..., description="Display order in the grid")
    user_id: Optional[str] = Field(default=None, description="User who created the stream")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = Field(default=True, description="Whether the stream is active")
    
    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str, datetime: lambda v: v.isoformat()}

class StreamConfigCreate(BaseModel):
    name: str = Field(..., description="Stream display name")
    url: str = Field(..., description="Stream URL")
    headers: Optional[Dict[str, str]] = Field(default=None, description="Custom headers for the stream")
    cookies: Optional[str] = Field(default=None, description="Cookies for the stream")
    order: int = Field(..., description="Display order in the grid")

class StreamConfigUpdate(BaseModel):
    name: Optional[str] = Field(None, description="Stream display name")
    url: Optional[str] = Field(None, description="Stream URL")
    headers: Optional[Dict[str, str]] = Field(None, description="Custom headers for the stream")
    cookies: Optional[str] = Field(None, description="Cookies for the stream")
    order: Optional[int] = Field(None, description="Display order in the grid")
    is_active: Optional[bool] = Field(None, description="Whether the stream is active")

class StreamConfigResponse(BaseModel):
    id: str = Field(..., description="Stream ID")
    name: str = Field(..., description="Stream display name")
    url: str = Field(..., description="Stream URL")
    headers: Optional[Dict[str, str]] = Field(default=None, description="Custom headers for the stream")
    cookies: Optional[str] = Field(default=None, description="Cookies for the stream")
    order: int = Field(..., description="Display order in the grid")
    user_id: Optional[str] = Field(default=None, description="User who created the stream")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")
    is_active: bool = Field(..., description="Whether the stream is active")
    
    class Config:
        json_encoders = {datetime: lambda v: v.isoformat()}

class StreamGridConfig(BaseModel):
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    user_id: str = Field(..., description="User ID")
    grid_size: int = Field(..., description="Grid size (number of streams)")
    streams: List[str] = Field(..., description="List of stream IDs in order")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str, datetime: lambda v: v.isoformat()}

class StreamGridConfigCreate(BaseModel):
    grid_size: int = Field(..., description="Grid size (number of streams)")
    streams: List[str] = Field(..., description="List of stream IDs in order")

class StreamGridConfigResponse(BaseModel):
    id: str = Field(..., description="Grid config ID")
    user_id: str = Field(..., description="User ID")
    grid_size: int = Field(..., description="Grid size (number of streams)")
    streams: List[str] = Field(..., description="List of stream IDs in order")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")
    
    class Config:
        json_encoders = {datetime: lambda v: v.isoformat()}
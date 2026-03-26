"""
Authentication schemas.
"""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class UserBase(BaseModel):
    """Base user schema."""

    email: EmailStr
    display_name: str = Field(min_length=1, max_length=100)


class UserCreate(UserBase):
    """Schema for user registration."""

    password: str = Field(min_length=8, max_length=100)


class UserLogin(BaseModel):
    """Schema for user login."""

    email: EmailStr
    password: str


class UserPreferences(BaseModel):
    """User preferences schema."""

    voice_enabled: bool = True
    auto_play_response: bool = True
    tts_voice: str = "alloy"
    language: str = "zh-CN"


class UserResponse(UserBase):
    """User response schema."""

    id: UUID
    role: str = "user"
    preferences: UserPreferences = Field(default_factory=UserPreferences)
    is_active: bool = True
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    """Token response schema."""

    access_token: str
    token_type: str = "bearer"


class AuthResponse(BaseModel):
    """Full auth response with token and user."""

    access_token: str
    token_type: str = "bearer"
    user: UserResponse

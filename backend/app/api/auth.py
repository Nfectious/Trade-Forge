"""
Authentication API routes
Handles user registration, login, token refresh, and email verification
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select
from datetime import datetime, timedelta, UTC

logger = logging.getLogger(__name__)

from app.core.database import get_session
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
    generate_verification_token,
    validate_password_strength,
    rate_limit_signup,
    rate_limit_auth
)
from app.core.dependencies import get_current_user
from app.models.user import (
    User,
    UserRegister,
    UserLogin,
    UserResponse,
    TokenResponse,
    EmailVerificationToken,
    RefreshToken,
    UserProfile
)
from app.core.config import settings


router = APIRouter()


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
@rate_limit_signup
async def register(
    request: Request,
    user_data: UserRegister,
    session: AsyncSession = Depends(get_session)
):
    """
    Register a new user account
    
    - Creates user account
    - Sends verification email
    - Returns user data (email not verified yet)
    """
    # Validate password strength
    is_valid, error_message = validate_password_strength(user_data.password)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_message
        )
    
    # Check if email already exists
    result = await session.execute(
        select(User).where(User.email == user_data.email)
    )
    existing_user = result.scalar_one_or_none()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Check if nickname is taken (if provided)
    if user_data.nickname:
        result = await session.execute(
            select(UserProfile).where(UserProfile.nickname == user_data.nickname)
        )
        existing_nickname = result.scalar_one_or_none()
        
        if existing_nickname:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Nickname already taken"
            )
    
    # Create user
    new_user = User(
        email=user_data.email,
        password_hash=hash_password(user_data.password)
    )
    
    session.add(new_user)
    await session.commit()
    await session.refresh(new_user)
    
    # Update profile with nickname if provided
    if user_data.nickname:
        result = await session.execute(
            select(UserProfile).where(UserProfile.user_id == new_user.id)
        )
        profile = result.scalar_one()
        profile.nickname = user_data.nickname
        await session.commit()
    
    # Generate verification token
    verification_token = generate_verification_token()
    expires_at = datetime.now(UTC) + timedelta(hours=24)
    
    token_record = EmailVerificationToken(
        user_id=new_user.id,
        token=verification_token,
        expires_at=expires_at
    )
    
    session.add(token_record)
    await session.commit()
    
    # TODO: Send verification email via aiosmtplib (email service to be implemented)
    logger.debug("Verification token generated for user_id=%s", new_user.id)
    
    return new_user


@router.post("/login", response_model=TokenResponse)
@rate_limit_auth
async def login(
    request: Request,
    credentials: UserLogin,
    response: Response,
    session: AsyncSession = Depends(get_session)
):
    """
    Login with email and password
    
    - Validates credentials
    - Returns access token
    - Sets refresh token in HTTP-only cookie
    """
    # Find user by email
    result = await session.execute(
        select(User).where(User.email == credentials.email)
    )
    user = result.scalar_one_or_none()
    
    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    # Check if user is banned or suspended
    if user.status == "banned":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is banned"
        )
    
    if user.status == "suspended":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is suspended"
        )
    
    # Update last login
    user.last_login = datetime.now(UTC)
    await session.commit()
    
    # Create tokens
    access_token = create_access_token(data={"sub": str(user.id)})
    refresh_token = create_refresh_token(data={"sub": str(user.id)})
    
    # Save refresh token to database
    expires_at = datetime.now(UTC) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    token_record = RefreshToken(
        user_id=user.id,
        token=refresh_token,
        expires_at=expires_at
    )
    session.add(token_record)
    await session.commit()
    
    # Set refresh token in HTTP-only cookie
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=settings.ENVIRONMENT == "production",
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60
    )
    
    return TokenResponse(
        access_token=access_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )


@router.get("/verify")
async def verify_email(
    token: str,
    session: AsyncSession = Depends(get_session)
):
    """
    Verify email address with token
    
    - Validates verification token
    - Activates user account
    """
    # Find token
    result = await session.execute(
        select(EmailVerificationToken).where(
            EmailVerificationToken.token == token,
            EmailVerificationToken.used == False
        )
    )
    token_record = result.scalar_one_or_none()
    
    if not token_record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification token"
        )
    
    # Check if token is expired
    if token_record.expires_at < datetime.now(UTC):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification token has expired"
        )
    
    # Mark token as used
    token_record.used = True
    
    # Update user status
    result = await session.execute(
        select(User).where(User.id == token_record.user_id)
    )
    user = result.scalar_one()
    user.status = "active"
    user.verified_at = datetime.now(UTC)
    
    await session.commit()
    
    return {
        "message": "Email verified successfully",
        "email": user.email
    }


@router.post("/refresh", response_model=TokenResponse)
async def refresh_access_token(
    request: Request,
    response: Response,
    session: AsyncSession = Depends(get_session)
):
    """
    Refresh access token using refresh token from httpOnly cookie.

    - Reads refresh_token from cookie (not request body)
    - Validates and rotates the token
    - Issues new access token
    """
    # Read refresh token from httpOnly cookie
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No refresh token provided"
        )

    # Decode refresh token
    try:
        payload = decode_token(refresh_token)
    except HTTPException:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )
    
    # Validate token type
    if payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type"
        )
    
    # Check if token exists in database and is not revoked
    result = await session.execute(
        select(RefreshToken).where(
            RefreshToken.token == refresh_token,
            RefreshToken.revoked == False
        )
    )
    token_record = result.scalar_one_or_none()
    
    if not token_record:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token not found or revoked"
        )
    
    # Check if token is expired
    if token_record.expires_at < datetime.now(UTC):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token has expired"
        )
    
    user_id = payload.get("sub")
    
    # Create new tokens
    new_access_token = create_access_token(data={"sub": user_id})
    new_refresh_token = create_refresh_token(data={"sub": user_id})
    
    # Revoke old refresh token
    token_record.revoked = True
    
    # Save new refresh token
    new_expires_at = datetime.now(UTC) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    new_token_record = RefreshToken(
        user_id=token_record.user_id,
        token=new_refresh_token,
        expires_at=new_expires_at
    )
    session.add(new_token_record)
    await session.commit()
    
    # Set new refresh token in cookie
    response.set_cookie(
        key="refresh_token",
        value=new_refresh_token,
        httponly=True,
        secure=settings.ENVIRONMENT == "production",
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60
    )
    
    return TokenResponse(
        access_token=new_access_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )


@router.post("/logout")
async def logout(
    response: Response,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Logout user
    
    - Revokes all refresh tokens for user
    - Clears refresh token cookie
    """
    # Revoke all refresh tokens for this user
    result = await session.execute(
        select(RefreshToken).where(
            RefreshToken.user_id == current_user.id,
            RefreshToken.revoked == False
        )
    )
    tokens = result.scalars().all()
    
    for token in tokens:
        token.revoked = True
    
    await session.commit()
    
    # Clear cookie
    response.delete_cookie("refresh_token")
    
    return {"message": "Logged out successfully"}


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user)
):
    """Get current authenticated user information"""
    return current_user

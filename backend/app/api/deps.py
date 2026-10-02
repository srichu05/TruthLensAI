from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login", auto_error=False)

import time
import requests
import base64

_JWKS_CACHE = {}

def get_supabase_jwks():
    global _JWKS_CACHE
    if _JWKS_CACHE and time.time() - _JWKS_CACHE.get("_fetched_at", 0) < 3600:
        return _JWKS_CACHE.get("keys", {})
    supabase_url = getattr(settings, "SUPABASE_URL", None) or "https://wybtalijyhyvysjduhgq.supabase.co"
    try:
        r = requests.get(f"{supabase_url.rstrip('/')}/auth/v1/.well-known/jwks.json", timeout=3.0)
        if r.status_code == 200:
            keys_dict = {k.get("kid"): k for k in r.json().get("keys", []) if k.get("kid")}
            _JWKS_CACHE = {"keys": keys_dict, "_fetched_at": time.time()}
            return keys_dict
    except Exception:
        pass
    return _JWKS_CACHE.get("keys", {})

def get_current_user(
    db: Session = Depends(get_db),
    token: Optional[str] = Depends(oauth2_scheme)
) -> Optional[User]:
    if not token:
        return None
    try:
        header = jwt.get_unverified_header(token)
        alg = header.get("alg", settings.ALGORITHM)
        kid = header.get("kid")
        payload = None

        if alg == "ES256":
            jwks_keys = get_supabase_jwks()
            key = jwks_keys.get(kid) if kid else (next(iter(jwks_keys.values())) if jwks_keys else None)
            if key:
                try:
                    payload = jwt.decode(
                        token,
                        key,
                        algorithms=["ES256"],
                        options={"verify_aud": False}
                    )
                except Exception:
                    pass

        if not payload:
            # Fall back to symmetric HMAC (HS256) using SUPABASE_JWT_SECRET or SECRET_KEY
            secrets_to_try = []
            if settings.SUPABASE_JWT_SECRET:
                secrets_to_try.append(settings.SUPABASE_JWT_SECRET)
                try:
                    secrets_to_try.append(base64.b64decode(settings.SUPABASE_JWT_SECRET))
                except Exception:
                    pass
            if settings.SECRET_KEY:
                secrets_to_try.append(settings.SECRET_KEY)

            for s in secrets_to_try:
                try:
                    payload = jwt.decode(
                        token,
                        s,
                        algorithms=["HS256"],
                        options={"verify_aud": False}
                    )
                    if payload:
                        break
                except Exception:
                    continue

        if not payload:
            return None
        user_id: str = payload.get("sub")
        if not user_id:
            return None
    except Exception:
        return None

    # Query user profile by UUID string
    user = db.query(User).filter(User.id == str(user_id)).first()
    
    # Auto-provision profile from JWT claims if trigger hasn't fired yet
    if not user and user_id:
        user_meta = payload.get("user_metadata") or {}
        name = user_meta.get("name") or payload.get("email", "").split("@")[0] or "User"
        email = payload.get("email") or f"{user_id}@truthlens.ai"
        user = User(
            id=str(user_id),
            name=name,
            email=email,
            avatar=user_meta.get("avatar")
        )
        try:
            db.add(user)
            db.commit()
            db.refresh(user)
        except Exception:
            db.rollback()
            user = db.query(User).filter(User.id == str(user_id)).first()

    return user


def require_current_user(
    current_user: Optional[User] = Depends(get_current_user)
) -> User:
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return current_user

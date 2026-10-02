import uuid
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.limiter import limiter
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import UserCreate, UserLogin, Token, UserOut, UserUpdate
from app.core.security import create_access_token
from app.api.deps import require_current_user

router = APIRouter(prefix="/auth", tags=["Auth"])

@router.post("/signup", response_model=Token)
@limiter.limit(settings.RATE_LIMIT_SIGNUP)
def signup(request: Request, user_in: UserCreate, db: Session = Depends(get_db)):
    """
    Fallback/local signup endpoint. In production, signups occur directly via Supabase Auth.
    """
    existing_user = db.query(User).filter(User.email == user_in.email.lower()).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists."
        )
    
    user = User(
        id=str(uuid.uuid4()),
        name=user_in.name,
        email=user_in.email.lower(),
    )
    try:
        db.add(user)
        db.commit()
        db.refresh(user)
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Direct backend signup is retired in Supabase mode. Please authenticate using Supabase Auth."
        )
    
    access_token = create_access_token(subject=user.id)
    return Token(access_token=access_token, user=UserOut.model_validate(user))

@router.post("/login", response_model=Token)
@limiter.limit(settings.RATE_LIMIT_LOGIN)
def login(request: Request, login_data: UserLogin, db: Session = Depends(get_db)):
    """
    Fallback/local login endpoint. In production, authentication occurs directly via Supabase Auth.
    """
    user = db.query(User).filter(User.email == login_data.email.lower()).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password."
        )
        
    access_token = create_access_token(subject=user.id)
    return Token(access_token=access_token, user=UserOut.model_validate(user))

@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(require_current_user)):
    return current_user

@router.patch("/me", response_model=UserOut)
def update_profile(
    user_update: UserUpdate,
    current_user: User = Depends(require_current_user),
    db: Session = Depends(get_db)
):
    if user_update.name is not None:
        current_user.name = user_update.name
    if user_update.avatar is not None:
        current_user.avatar = user_update.avatar
        
    db.commit()
    db.refresh(current_user)
    return current_user


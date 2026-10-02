from slowapi import Limiter
from slowapi.util import get_remote_address

# Shared SlowAPI Limiter instance tracking client IP addresses
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["120/minute"],
)

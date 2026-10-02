import os
import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent / "backend"
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import uvicorn

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    is_prod = os.environ.get("ENVIRONMENT", "development").lower() in ("production", "prod")
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=not is_prod, app_dir=str(backend_dir))

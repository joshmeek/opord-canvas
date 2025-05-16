from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path

from app.routers import auth, opord, tactical_task, analysis, ai

app = FastAPI(title="OPORD Canvas Editor API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite's default dev server port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Determine base path for static files (assuming main.py is in backend/)
# So, Path(__file__).resolve().parent is /Users/joshmeek/personal_code/mil/backend
backend_dir = Path(__file__).resolve().parent
static_files_dir = backend_dir / "scripts" / "public" / "task_images"

# Create the directory if it doesn't exist, though the script should do this too
static_files_dir.mkdir(parents=True, exist_ok=True)

# Mount static files for task images
# URL: /public/task_images/some_image.png -> serves from backend/scripts/public/task_images/some_image.png
app.mount("/public/task_images", StaticFiles(directory=static_files_dir), name="task_images")

# Include routers
app.include_router(auth.router)
app.include_router(opord.router)
app.include_router(tactical_task.router)
app.include_router(analysis.router)
app.include_router(ai.router)

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"} 
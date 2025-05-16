from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import auth, opord

app = FastAPI(title="OPORD Canvas Editor API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite's default dev server port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(opord.router)

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"} 
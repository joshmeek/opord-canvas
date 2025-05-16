# OPORD Canvas Editor - Implementation Checklist (v2.3 - Aligned with Current Summary)

## I. Project Setup & Configuration

-   [x] Initialize project repository (Git) - `N/A`
-   [x] Set up Python backend environment (e.g., simple venv, pip) - `N/A`
-   [x] Set up React frontend environment (e.g., Create React App, Vite) - `N/A`
-   [x] Define project structure (backend, frontend, docker, docs, scripts, public/assets for PDF & images) - `N/A`
-   [ ] Configure linters and formatters (e.g., Black, Flake8, Prettier, ESLint) - `N/A`

## II. Backend Development (Python, FastAPI, Pydantic)

### A. Core API Setup
-   [x] Initialize FastAPI application - `main.py`
-   [x] Implement basic health check endpoint - `routers/health.py`
-   [x] Configure CORS settings - `main.py`

### B. User Authentication (OAuth2/JWT)
-   [x] Define User Pydantic models (UserCreate, UserInDB, Token) - `models/user.py`
-   [x] Implement password hashing utility - `utils/security.py`
-   [x] Create user registration endpoint - `routers/auth.py`
-   [x] Create user login endpoint (issue JWT token) - `routers/auth.py`
-   [x] Implement token verification and user retrieval dependency - `dependencies/auth.py`
-   [x] Secure relevant endpoints requiring authentication - `routers/opord.py`, `routers/ai.py`, `routers/analysis.py`

### C. OPORD Management
-   [x] Define OPORD Pydantic models (OPORDCreate, OPORDUpdate, OPORDInDB) - `models/opord.py`
-   [x] Implement CRUD operations for OPORDs:
    -   [x] Create OPORD endpoint - `routers/opord.py`
    -   [x] Get OPORD by ID endpoint - `routers/opord.py`
    -   [x] Get all OPORDs for a user endpoint - `routers/opord.py`
    -   [x] Update OPORD endpoint - `routers/opord.py`
    -   [x] Delete OPORD endpoint - `routers/opord.py`
-   [x] Ensure OPORDs are associated with users - `models/opord.py`, `crud/opord.py`

### D. Tactical Task Recognition & Definition Store (FM 3-90, NER, pgvector)
-   [ ] **Data Preparation (Run as a script):**
    -   [ ] Develop script to download/access FM 3-90 PDF - `scripts/prepare_tactical_data.py`
    -   [ ] Implement PDF text extraction for relevant sections (e.g., Annex B for "Occupy", "Secure", "Seize" from pages B-10, B-11) - `scripts/prepare_tactical_data.py`
    -   [ ] Extract task names, their full definitions, **page numbers in FM 3-90**, and **references to associated images/diagrams** (e.g., Figure B-23 for "Occupy"). - `scripts/prepare_tactical_data.py`
    -   [ ] Implement logic to extract images/diagrams related to tasks from the PDF (e.g., using `PyMuPDF`). Store images in a designated assets folder (e.g., `public/assets/doctrinal_images/`). - `scripts/prepare_tactical_data.py`
    -   [ ] Clean and structure extracted data (task, definition, page number, image path/identifier) - `scripts/prepare_tactical_data.py`
    -   [ ] Generate embeddings for task definitions (using Gemini) if using semantic search for definitions - `scripts/prepare_tactical_data.py`
    -   [ ] Store task names, definitions, page numbers, image paths/identifiers, and optional embeddings in PostgreSQL (using `pgvector` for embedding column) - `scripts/prepare_tactical_data.py` (calls `crud/tactical_task.py`)
-   [ ] **Database Model & CRUD for Tactical Tasks:**
    -   [ ] Define SQLAlchemy model for Tactical Tasks (name, definition, page_number, image_path, embedding vector if used) - `db/models.py`
    -   [ ] Define Pydantic model for Tactical Task data (including page_number, image_path) - `models/tactical_task.py`
    -   [ ] Implement CRUD functions for Tactical Tasks - `crud/tactical_task.py`
-   [ ] **NER Implementation & Service (Leveraging Gemini):**
    -   [ ] Develop prompts and logic to leverage Gemini for NER to identify tactical task terms ("Occupy", "Secure", "Seize", etc.) in context from user input. - `services/ner_service.py` (calls Gemini)
    -   [ ] Implement service to process input text:
        -   [ ] Identify tactical task mentions using Gemini NER. - `services/tactical_analysis_service.py`
        -   [ ] For each identified task, retrieve its definition, page number, image path, and other metadata from the PostgreSQL database. Use `pgvector` for similarity search if definitions are also embedded and fuzzy matching is desired. - `services/tactical_analysis_service.py`
-   [ ] **API Endpoint:**
    -   [ ] Create/Update endpoint to receive text, perform tactical task recognition and definition lookup, and return structured data (task, position in text, definition, page_number, image_path). - `routers/analysis.py`
    -   [ ] Configure FastAPI to serve static image assets from the designated folder. - `main.py` (using `StaticFiles`)

### E. AI Text Enhancement (Gemini)
-   [ ] Define Pydantic models for AI enhancement request/response - `models/ai.py`
-   [ ] Integrate with Gemini API for text enhancement - `services/ai_enhancer_service.py`
    -   [ ] Develop prompts for Gemini to suggest improvements to military text.
-   [ ] Create endpoint to receive text selection and return AI suggestion from Gemini - `routers/ai.py`

## III. Database (PostgreSQL with pgvector)

-   [ ] Install and configure `pgvector` extension in PostgreSQL - `Dockerfile` for Postgres / DB setup scripts
-   [ ] Design database schema (users, opords, tactical_tasks tables with new fields) - `db/schema.sql` or Alembic migrations
-   [ ] Set up SQLAlchemy (or other ORM/query builder) - `db/session.py`, `db/base.py`
-   [ ] Define SQLAlchemy models (User, OPORD, TacticalTask with vector field, page_number, image_path) - `db/models.py`
-   [ ] Implement CRUD database functions for Users - `crud/user.py`
-   [ ] Implement CRUD database functions for OPORDs - `crud/opord.py`
-   [ ] Implement CRUD database functions for TacticalTasks (including vector storage/retrieval and new fields) - `crud/tactical_task.py`
-   [ ] Implement database migrations (e.g., Alembic) - `alembic/`

## IV. Frontend Development (React, Tailwind CSS)

### A. Core UI Setup
-   [ ] Initialize React application with Tailwind CSS - `src/index.css`, `tailwind.config.js`
-   [ ] Set up routing (e.g., React Router) - `src/App.js`
-   [ ] Create basic layout components (Navbar, Footer, Main Content Area) - `src/components/layout/`
-   [ ] **Styling:** Implement a sleek, modern design with a military/cyberpunk aesthetic using Tailwind CSS. - `All Components`
-   [ ] Place FM 3-90 PDF in `public` folder for direct access. - `public/FM_3-90.pdf`

### B. User Authentication UI
-   [ ] Create Login page/component - `src/pages/LoginPage.js`
-   [ ] Create Registration page/component - `src/pages/RegisterPage.js`
-   [ ] Implement forms for login and registration - `src/components/auth/LoginForm.js`, `src/components/auth/RegisterForm.js`
-   [ ] Implement API calls to backend auth endpoints - `src/services/authService.js`
-   [ ] Implement logic to store/clear auth token (e.g., localStorage, Context) - `src/context/AuthContext.js`
-   [ ] Implement protected routes for authenticated users - `src/components/auth/ProtectedRoute.js`

### C. OPORD Canvas Interface
-   [ ] Design the "canvas" component (e.g., a rich text editor like Tiptap/Plate.js, or a carefully styled `textarea` with overlay capabilities for highlighting) - `src/components/opord/OpordCanvas.js`
-   [ ] Implement text input and editing functionality - `src/components/opord/OpordCanvas.js`
-   [ ] Implement saving OPORD content (manual or auto-save) - `src/components/opord/OpordCanvas.js`, `src/services/opordService.js`
-   [ ] Implement loading existing OPORD content - `src/components/opord/OpordCanvas.js`, `src/services/opordService.js`
-   [ ] Create OPORD list/dashboard page - `src/pages/DashboardPage.js`

### D. Tactical Task Recognition UI
-   [ ] Implement logic to send OPORD text to backend for analysis as user types or on demand - `src/components/opord/OpordCanvas.js`
-   [ ] Display highlighted tactical tasks within the canvas (e.g., using decorations in rich text editor or overlay elements over a textarea) - `src/components/opord/OpordCanvas.js`
-   [ ] Implement hover tooltips for highlighted tasks showing definitions, **page numbers from FM 3-90, and associated extracted images/diagrams** (fetched via API). - `src/components/opord/TacticalTaskTooltip.js`
-   [ ] Ensure UI is polished and integrates seamlessly with the canvas.

### E. State Management (e.g., React Context, Zustand, Redux)
-   [ ] Set up chosen state management solution - `src/context/` or `src/store/`
-   [ ] Manage OPORD text state - `src/context/OpordContext.js` or similar
-   [ ] Manage user authentication state (already covered by AuthContext) - `src/context/AuthContext.js`
-   [ ] Manage AI suggestions state (text, status: pending/accepted/rejected) - `src/context/AiContext.js` or similar
-   [ ] Ensure state persistence for OPORDs (via backend).

### F. AI Text Enhancement UI (Gemini)
-   [ ] Implement UI for text selection within the canvas - `src/components/opord/OpordCanvas.js`
-   [ ] Implement button/action to trigger AI enhancement for selected text - `src/components/opord/OpordCanvas.js`
-   [ ] Display AI suggestions (from Gemini) to the user (e.g., inline diff, modal) - `src/components/ai/SuggestionDisplay.js`
-   [ ] Implement accept/reject functionality for AI suggestions, updating the canvas content accordingly - `src/components/ai/SuggestionDisplay.js`

### G. General UI/UX
-   [ ] Ensure responsive design for different screen sizes. - `All Components`
-   [ ] Implement intuitive navigation and user flow. - `All Components`
-   [ ] Focus on a clean, polished, and highly usable interface following the specified aesthetic. - `All Components`

### H. Doctrine Library / PDF Viewer
-   [ ] Create a new route and page for the Doctrine Library - `src/pages/DoctrineLibraryPage.js`
-   [ ] Implement a PDF viewer component on this page (e.g., using `react-pdf` or embedding an iframe to the PDF in the `public` folder). - `src/components/doctrine/PdfViewer.js`
-   [ ] Provide a way for users to navigate to this library (e.g., link in Navbar).
-   [ ] In tooltips (IV.D), provide a link/button that opens the Doctrine Library and ideally navigates the PDF viewer to the specific `page_number` associated with the tactical task.

## V. Dockerization

-   [x] Create Dockerfile for the Python backend - `backend/Dockerfile`
-   [x] Create Dockerfile for the React frontend (multi-stage build for serving static files, including PDF and extracted images) - `frontend/Dockerfile`
-   [x] Create `docker-compose.yml` to orchestrate backend, frontend, and Postgres (with `pgvector`) database - `docker-compose.yml`
-   [x] Configure environment variables for Docker containers - `.env` files, `docker-compose.yml`
-   [ ] Add scripts for building and running Docker containers (e.g., in `Makefile` or `package.json`) - `Makefile`

## VI. Testing (Comprehensive Coverage)

### A. Backend Tests (Pytest)
-   [ ] Set up Pytest framework and necessary plugins (e.g., `pytest-fastapi-deps`). - `backend/tests/`
-   [ ] Write comprehensive unit tests for utility functions, Pydantic models, CRUD operations, and service logic (tactical task processing including image/page number handling, AI enhancer). - `backend/tests/unit/`
-   [ ] Write thorough integration tests for all API endpoints, covering various scenarios and edge cases. - `backend/tests/integration/`
-   [ ] Include tests for NER logic (using Gemini) and database interaction with `pgvector`.
-   [ ] Test PDF parsing script for accuracy of text, page number, and image extraction.

### B. Frontend Tests (Jest, React Testing Library)
-   [ ] Set up Jest and React Testing Library. - `frontend/src/tests/`
-   [ ] Write comprehensive unit tests for components (including new tooltip content and PDF viewer), utility functions, and state management logic. - `frontend/src/tests/components/`, `frontend/src/tests/context/`
-   [ ] Write thorough integration tests for user flows (login, registration, OPORD creation/editing, task highlighting with full details, AI enhancement interaction, accessing Doctrine Library). - `frontend/src/tests/integration/`
-   [ ] Test PDF viewer functionality and navigation if advanced features are implemented.

## VII. Documentation & Deliverables

-   [ ] Prepare an architecture diagram including data flow for PDF processing, tactical task recognition (Gemini NER), image handling, and AI enhancement. - `docs/architecture.md` or image
-   [ ] Document API endpoints (e.g., using FastAPI's automatic docs, supplemented with manual descriptions). - `docs/api.md`
-   [ ] Write a `README.md` with detailed setup, configuration (including `pgvector`, Gemini API key handling, and PDF/image asset paths), and run instructions. - `README.md`
-   [ ] List any tradeoffs made during development. - `docs/tradeoffs.md`
-   [ ] Prepare for presentation/demo. - `N/A`
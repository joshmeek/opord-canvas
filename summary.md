# Project Summary: OPORD Canvas Editor (v2.2 Alignment)

## 1. Objective

Develop a sophisticated full-stack web application, the "OPORD Canvas Editor," allowing users to create, edit, and enhance military Operation Orders (OPORDs) via a dynamic "canvas" interface. This project will showcase advanced skills in UI/UX design (with a specific aesthetic), backend development, database management (including vector databases), AI integration (leveraging Gemini), and comprehensive testing. All features, including those initially listed as "bonus" in the candidate project document, are considered core to this implementation.

## 2. Core Technologies

* **Backend:** Python with FastAPI and Pydantic.
* **Frontend:** React with Tailwind CSS.
* **Database:** PostgreSQL with the `pgvector` extension.
* **AI Engine:** Gemini (for Named Entity Recognition and text enhancement).
* **Containerization:** Docker.

## 3. Key Features (All Mandatory)

### a. Dynamic OPORD Canvas
* An intuitive, sleek, and modern web-based interface with a military/cyberpunk design aesthetic for typing and editing OPORD documents.
* The canvas tool should be user-friendly, potentially using a rich text editor for better UX.

### b. Advanced Tactical Task Recognition & Definition Display
* **Data Source:** The system will use the U.S. Army publication FM 3-90 Tactics (`https://armypubs.army.mil/epubs/DR pubs/DR a/ARN38160-FM 3-90-000-WEB-1.pdf`) as the primary source for tactical task definitions.
* **Preprocessing:** A script will parse the FM 3-90 PDF to extract specified tactical tasks (initially "Occupy," "Secure," "Seize," as per page references B-10, B-11), their definitions, page numbers, and references to associated images/diagrams (e.g., Figure B-23 for "Occupy"). Extracted images will be stored.
* **Storage:** This data (task name, definition, page number, image path, and optionally text embeddings of definitions) will be stored in a PostgreSQL database utilizing the `pgvector` extension.
* **Recognition (Gemini NER):** The system will employ Gemini for Named Entity Recognition to automatically detect these tactical tasks within the OPORD text.
* **Display & Tooltips:** Recognized tasks will be highlighted directly on the canvas. Hovering over a highlighted task will display a tooltip with its definition, the relevant page number from FM 3-90, and any associated extracted image/diagram.

### c. State Management (Frontend - React)
* A robust, centralized state management solution (e.g., React Context, Zustand, Redux) will manage:
    * The current OPORD text and its structure.
    * User authentication state.
    * AI-enhanced text suggestions from Gemini (including the suggestion, its status, and accept/reject functionality).
* State related to OPORDs will persist for authenticated users through backend storage.

### d. Database Persistence (PostgreSQL with pgvector)
* OPORD documents will be stored in PostgreSQL.
* User accounts will be stored securely with hashed passwords.
* Tactical tasks, their definitions, page numbers, image paths, and (if implemented) their embeddings will be stored in a dedicated table, utilizing `pgvector`.

### e. User Authentication
* Secure user login system (OAuth2 with JWT is suggested).
* Protected routes and API endpoints for all authenticated actions.

### f. AI Text Enhancement (with Gemini)
* Users can select a section of OPORD text and request AI-generated enhancements.
* The backend will use the Gemini API to provide suggested edits.
* The UI will clearly present these suggestions, allowing users to accept or reject them, with changes reflected in the canvas.

### g. Doctrine Library (PDF Reference)
* A dedicated section or page in the application will provide users with a simple way to view the FM 3-90 PDF document.
* This feature is intended as a direct reference tool, likely using an embedded PDF viewer (e.g., `react-pdf` or an iframe).
* Tooltips for tactical tasks may include a link that, when clicked, opens the Doctrine Library and ideally navigates the PDF viewer to the specific page number associated with the task, staying within the scope of providing convenient access to the source material.

### h. Comprehensive Unit Testing
* Extensive unit and integration tests for both backend (Python/FastAPI) and frontend (React) components to ensure reliability and cover edge cases.

### i. Polished UI/UX
* The user interface will be clean, intuitive, responsive, and adhere to the specified sleek, modern, military/cyberpunk aesthetic. This includes clear visual feedback for all interactions.

## 4. Deliverables

* **Core Application:**
    * Fully functional OPORD canvas with all described features.
    * Secure user authentication.
    * Robust API.
    * Advanced tactical task recognition (Gemini NER) with rich tooltips.
    * AI text enhancement (Gemini).
    * Doctrine library for PDF reference.
    * Polished, thematically styled UI.
* **Documentation:**
    * Presentation of features.
    * Link to the code repository.
    * Architecture diagram (including data flow for PDF processing, NER, and AI).
    * List of tradeoffs.
    * Detailed `README.md` for setup and operation.

## 5. Out of Scope (As per original candidate document, unless explicitly expanded above)

* Advanced AI Optimization beyond effective Gemini integration for NER and text enhancement.
* Production-level scalability design (focus on functionality as per project brief).
* Advanced DevOps beyond Docker containerization.
* Excessive frontend animation or custom styling beyond the defined military/cyberpunk theme and usability requirements. The PDF viewer will be functional for reference, not a feature-rich document management system.

## 6. Assessment Criteria (Reflecting full scope)

* **Functionality:** All specified core features are implemented and work correctly.
* **Code Quality & Architecture:** Clean, modular, readable, well-commented code; sound architectural decisions for PDF processing, `pgvector`, Gemini NER, and AI enhancement integration.
* **User Interface & Experience:** UI is clean, intuitive, responsive, and successfully implements the target aesthetic. Tactical task and AI interactions are seamless. PDF reference is accessible and useful.
* **Technical Implementation:** Solid understanding and correct implementation of chosen technologies.
* **AI Integration:** Effective use of Gemini for NER and text enhancement; good UX for AI-suggested edits.
* **Testing:** Thoroughness and quality of unit and integration tests.
* **Development Thought Process:** Clear rationale for technical choices, prioritization, and problem-solving.

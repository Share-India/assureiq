# AssureIQ: Corporate Underwriting & Strategic Risk Assessment System

AssureIQ is an enterprise-grade, AI-powered system designed for risk assessment, underwriting mapping, and automated premium estimation of corporate clients. 

The application leverages the **Google Gemini API** for structured JSON financial extraction and missing indicator prediction, backed by a robust **FastAPI backend** and a beautiful **Next.js frontend** built with Material-UI (MUI), Recharts, and Tailwind CSS.

---

## 🚀 Key Features

* **⚡ Lightning-Fast AI Extraction**: Parses massive PDF annual reports (tested up to 50MB+) in less than 40 seconds using `pypdf` and the Gemini 2.5 Flash model.
* **📂 Duplicate Upload Prevention**: Employs cryptographic SHA-256 hash checks to block uploading duplicate files.
* **📊 Risk Portfolio Analytics**: Computes real-time risk scores, assets/liabilities ratios, coverage gaps, and total premium opportunities.
* **📋 Underwriting Matches & Sub-Policies**: Dynamically maps company industries and scales to policy recommendations based on custom rates from `Products_Industry_Wise.xlsx`. Allows users to expand and toggle specific sub-categories (e.g., General Liability, D&O, Professional Indemnity).
* **📝 Interactive Tooltips & Formulas**: Displays the exact rate coefficients and mathematical formulas used to calculate each estimated premium on hover.
* **📥 PDF Risk Report Export**: Generates and downloads print-ready PDF audit reports summarizing corporate credentials and coverage opportunities.

---

## 🛠️ Technology Stack

### Backend
* **FastAPI**: High-performance async web framework.
* **SQLAlchemy & PyMySQL**: Database ORM connecting to MySQL (with auto-fallback to SQLite).
* **Google GenAI SDK**: Powering structured JSON extraction and missing value predictions.
* **pypdf**: Fast, pure-Python PDF reader for lightning-fast text extraction.

### Frontend
* **Next.js 16 (App Router)**: React application framework.
* **Tailwind CSS**: Modern utility-first CSS styling.
* **Material-UI (MUI)**: Responsive layout controls and card components.
* **Recharts**: Beautiful SVG charts for data visualisations.

---

## 📁 Project Folder Structure

```text
Comp-File-Extractor/
├── backend/                     # FastAPI Backend Application
│   ├── api/                     # API Routers & Endpoint Handlers
│   │   ├── routers/             # Authentication, Company details, Document, and Engine routes
│   │   └── main.py              # Application entry point
│   ├── database/                # Database configurations & models
│   │   ├── db.py                # SQL connection pool configuration
│   │   └── models.py            # SQLAlchemy Database Models (MySQL & SQLite)
│   ├── ai/                      # AI Integrations
│   │   └── gemini_client.py     # Google GenAI SDK interface
│   ├── calculations/            # Underwriting Math
│   │   └── premium_rules.py     # Excel rate mappings & premium equations
│   ├── ocr/                     # PDF and Spreadsheet parsers
│   │   └── ocr_service.py       # pypdf text parsing
│   ├── schemas/                 # Data validation layer
│   │   └── schemas.py           # Pydantic validation models
│   ├── requirements.txt         # Python package dependencies
│   └── .env.example             # Environment configuration template
│
├── frontend/                    # Next.js Frontend Application
│   ├── src/
│   │   └── app/                 # Page layouts & active routing components
│   │       ├── companies/[id]/  # Company profile & Underwriting Workspace
│   │       └── dashboard/       # Portfolio Analytics Hub
│   ├── package.json             # NPM package configurations
│   └── tailwind.config.ts       # CSS themes and parameters
│
├── uploads/                     # Uploaded documents storage
└── docker-compose.yml           # Multi-container Docker configuration
```

---

## ⚙️ Getting Started

### 1. Backend Setup
Navigate to the `backend/` folder:
```bash
cd backend
```
Create a virtual environment and install dependencies:
```bash
python -m venv .venv
.venv\Scripts\activate
uv pip install -r requirements.txt
```
Copy `.env.example` to `.env` and fill in your Gemini API key:
```bash
copy .env.example .env
```
Run the FastAPI application:
```bash
python -m uvicorn api.main:app --reload
```

### 2. Frontend Setup
Navigate to the `frontend/` folder:
```bash
cd ../frontend
```
Install NPM packages and start the Next.js dev server:
```bash
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your web browser.

### 3. Docker Deployment
Start the entire stack (MySQL, FastAPI, Next.js) using Docker Compose:
```bash
docker-compose up --build
```

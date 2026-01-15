# Budget Tracker

A personal/household budget tracking app with receipt scanning and auto-categorization powered by Claude AI.

## Features

- **Receipt Scanning** — Upload or photograph receipts, automatically extract merchant, date, total, and line items using Claude vision
- **Auto-Categorization** — Rule-based merchant matching with Claude fallback for unknown merchants
- **Manual Entry** — Add expenses without receipts
- **Dynamic Categories** — Create, edit, and delete spending categories
- **Budget Tracking** — Set monthly limits per category, track spending vs budget
- **Historical View** — Navigate between months to compare spending over time
- **Budget Versioning** — Change limits without losing historical data

## Tech Stack

**Backend**
- FastAPI
- SQLModel + SQLite
- Claude API (vision + text)

**Frontend**
- React
- Mobile-first responsive design

## Project Structure

```
budget-tracker/
├── app/
│   ├── main.py
│   ├── config.py
│   ├── database.py
│   ├── models/
│   │   └── models.py
│   ├── schemas/
│   │   └── schemas.py
│   ├── routers/
│   │   ├── receipts.py
│   │   ├── budget.py
│   │   └── categories.py
│   └── services/
│       ├── receipt_processor.py
│       └── storage.py
├── frontend/
│   ├── src/
│   │   ├── App.js
│   │   ├── api.js
│   │   ├── styles.js
│   │   ├── components/
│   │   │   └── Icons.js
│   │   └── screens/
│   │       ├── DashboardScreen.js
│   │       ├── UploadScreen.js
│   │       ├── ManualEntryScreen.js
│   │       ├── ReviewScreen.js
│   │       ├── BudgetSettingsScreen.js
│   │       ├── CategoryDetailScreen.js
│   │       ├── CategoryManageScreen.js
│   │       ├── CategoryEditScreen.js
│   │       └── ReceiptEditScreen.js
│   └── .env
├── uploads/
├── requirements.txt
├── .env
└── README.md
```

## Setup

### Backend

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Add your ANTHROPIC_API_KEY to .env

# Run server
uvicorn app.main:app --reload --host 0.0.0.0
```

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
# Edit frontend/.env and app/main.py (CORS) with your local IP for mobile testing:
# REACT_APP_API_URL=http://192.168.x.x:8000
# HOST=0.0.0.0

# Run dev server
npm start
```

Access the app at `http://localhost:3000` or `http://<your-ip>:3000` on mobile.

## API Endpoints

### Receipts
- `POST /receipts/upload` — Upload receipt image for processing
- `POST /receipts/manual` — Create manual expense entry
- `GET /receipts` — List receipts (filterable by category, month)
- `GET /receipts/{id}` — Get receipt details
- `PATCH /receipts/{id}` — Update receipt
- `DELETE /receipts/{id}` — Delete receipt

### Budget
- `GET /budget` — Get budget dashboard (filterable by month)
- `PUT /budget/categories/{id}` — Set budget limit for category

### Categories
- `GET /categories` — List categories
- `POST /categories` — Create category
- `PATCH /categories/{id}` — Update category
- `DELETE /categories/{id}` — Deactivate category

## Cost

- **Hosting**: Minimal (SQLite, local file storage)
- **Claude API**: ~$0.01 per scanned receipt; manual entries are free

## Roadmap

- [ ] User authentication
- [ ] Household sharing (multi-user budgets)
- [ ] PWA support (installable, offline)
- [ ] Receipt image viewer
- [ ] Search/filter receipts
- [ ] CSV export
- [ ] Weekly budget check-in agent
- [ ] Spending alerts and insights

## License

MIT
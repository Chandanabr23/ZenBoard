# ZenBoard
ZenBoard is a unique, aesthetically pleasing infinite canvas for your thoughts. It features a premium glassmorphic UI and persists your sticky notes using a Python FastAPI backend


## Features
- **Infinite Canvas**: Drag your notes anywhere.
- **Glassmorphism**: Beautiful, modern UI with smooth blurs and gradients.
- **Persistence**: Notes are saved automatically to a SQLite database.
- **Tech Stack**: React (Frontend) + Python FastAPI (Backend).
## Setup & Run
### Prerequisites
- Python 3.8+
- Internet connection (for loading React/Babel from CDN)
### 1. Install Backend Dependencies
```bash
python -m pip install -r backend/requirements.txt
```
### 2. Run the Application
Start the server (this serves both the API and the Frontend):
```bash
python backend/main.py
```
### 3. Open in Browser
Visit: [http://localhost:8000](http://localhost:8000)
## Project Structure
- `backend/`: Python server and database logic.
- `frontend/`: React components and styles.
- `zenboard.db`: The SQLite database (created on first run).


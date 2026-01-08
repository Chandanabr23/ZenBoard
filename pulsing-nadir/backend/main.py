from fastapi import FastAPI, HTTPException, Depends
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
import os
from sqlalchemy import create_engine, Column, Integer, String, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from fastapi.middleware.cors import CORSMiddleware
from typing import List
# Database Setup
SQLALCHEMY_DATABASE_URL = "sqlite:///./zenboard.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()
# Models
class NoteModel(Base):
    __tablename__ = "notes"
    id = Column(Integer, primary_key=True, index=True)
    content = Column(String, default="")
    x = Column(Float, default=0.0)
    y = Column(Float, default=0.0)
    color = Column(String, default="#ffffff")
Base.metadata.create_all(bind=engine)
# Pydantic Schemas
class NoteBase(BaseModel):
    content: str
    x: float
    y: float
    color: str
class NoteCreate(NoteBase):
    pass
class Note(NoteBase):
    id: int
    class Config:
        orm_mode = True
# App Init
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all for dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# Static Files Setup
frontend_path = os.path.join(os.path.dirname(__file__), '../frontend')
if os.path.exists(frontend_path):
    app.mount("/assets", StaticFiles(directory=frontend_path), name="static")
@app.get("/")
async def read_root():
    return FileResponse(os.path.join(frontend_path, 'index.html'))
# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
# Routes
@app.get("/notes", response_model=List[Note])
def read_notes(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    notes = db.query(NoteModel).offset(skip).limit(limit).all()
    return notes
@app.post("/notes", response_model=Note)
def create_note(note: NoteCreate, db: Session = Depends(get_db)):
    db_note = NoteModel(**note.dict())
    db.add(db_note)
    db.commit()
    db.refresh(db_note)
    return db_note
@app.put("/notes/{note_id}", response_model=Note)
def update_note(note_id: int, note: NoteCreate, db: Session = Depends(get_db)):
    db_note = db.query(NoteModel).filter(NoteModel.id == note_id).first()
    if db_note is None:
        raise HTTPException(status_code=404, detail="Note not found")
    
    db_note.content = note.content
    db_note.x = note.x
    db_note.y = note.y
    db_note.color = note.color
    
    db.commit()
    db.refresh(db_note)
    return db_note
@app.delete("/notes/{note_id}")
def delete_note(note_id: int, db: Session = Depends(get_db)):
    db_note = db.query(NoteModel).filter(NoteModel.id == note_id).first()
    if db_note is None:
        raise HTTPException(status_code=404, detail="Note not found")
    db.delete(db_note)
    db.commit()
    return {"ok": True}
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

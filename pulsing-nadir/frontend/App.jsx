const { useState, useEffect, useRef, useCallback } = React;
// --- Icons ---
const PlusIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
);
const TrashIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
);
const RefreshIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.3" /></svg>
);
// --- API Utils ---
const API_URL = "http://localhost:8000"; // Assuming local execution
// --- Components ---
function Note({ note, onUpdate, onDelete, onMouseDown }) {
    const handleChange = (e) => {
        onUpdate(note.id, { ...note, content: e.target.value });
    };
    const style = {
        left: note.x,
        top: note.y,
        backgroundColor: note.color === 'red' ? 'var(--note-bg-1)' :
            note.color === 'blue' ? 'var(--note-bg-2)' : 'var(--note-bg-3)',
        borderColor: note.color === 'red' ? 'var(--note-border-1)' :
            note.color === 'blue' ? 'var(--note-border-2)' : 'var(--note-border-3)',
    };
    return (
        <div
            className="sticky-note glass-panel animate-fade-in"
            style={style}
            onMouseDown={(e) => onMouseDown(e, note)}
        >
            <div className="flex justify-end p-1 opacity-50 hover:opacity-100 transition-opacity">
                <button
                    onClick={(e) => { e.stopPropagation(); onDelete(note.id); }}
                    className="text-red-400 hover:text-red-200"
                >
                    <TrashIcon />
                </button>
            </div>
            <textarea
                className="sticky-content"
                value={note.content}
                onChange={handleChange}
                placeholder="Empty thought..."
            />
        </div>
    );
}
function App() {
    const [notes, setNotes] = useState([]);
    const [dragState, setDragState] = useState({ isDragging: false, noteId: null, startX: 0, startY: 0, initialNoteX: 0, initialNoteY: 0 });
    const saveTimeouts = useRef({});
    // Fetch notes on load
    useEffect(() => {
        fetchNotes();
    }, []);
    const fetchNotes = async () => {
        try {
            const res = await fetch(`${API_URL}/notes`);
            const data = await res.json();
            setNotes(data);
        } catch (err) {
            console.error("Failed to fetch notes", err);
        }
    };
    const createNote = async () => {
        const colors = ['red', 'blue', 'yellow'];
        const randomColor = colors[Math.floor(Math.random() * colors.length)];
        // Random position near center
        const x = window.innerWidth / 2 - 100 + (Math.random() * 50);
        const y = window.innerHeight / 2 - 75 + (Math.random() * 50);
        const newNote = {
            content: "",
            x,
            y,
            color: randomColor
        };
        try {
            const res = await fetch(`${API_URL}/notes`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newNote)
            });
            const savedNote = await res.json();
            setNotes([...notes, savedNote]);
        } catch (err) {
            console.error("Failed to create note", err);
        }
    };
    const updateNote = (id, updatedFields) => {
        // 1. Optimistic Update
        let currentNote;
        setNotes(prev => {
            return prev.map(n => {
                if (n.id === id) {
                    currentNote = { ...n, ...updatedFields };
                    return currentNote;
                }
                return n;
            });
        });
        // 2. Debounce Network Sync
        if (saveTimeouts.current[id]) {
            clearTimeout(saveTimeouts.current[id]);
        }
        saveTimeouts.current[id] = setTimeout(async () => {
            if (!currentNote) return;
            try {
                // Ensure we send all fields required by backend Pydantic model
                // We trust 'currentNote' has them all (it should if initialized correctly)
                await fetch(`${API_URL}/notes/${id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(currentNote)
                });
            } catch (err) {
                console.error("Failed to update note", err);
            }
        }, 500);
    };
    const deleteNote = async (id) => {
        setNotes(prev => prev.filter(n => n.id !== id));
        try {
            await fetch(`${API_URL}/notes/${id}`, { method: "DELETE" });
        } catch (err) {
            console.error("Failed to delete note", err);
        }
    };
    // -- Drag Logic --
    const handleMouseDown = (e, note) => {
        if (e.target.tagName.toLowerCase() === 'textarea' || e.target.tagName.toLowerCase() === 'button') return;
        setDragState({
            isDragging: true,
            noteId: note.id,
            startX: e.clientX,
            startY: e.clientY,
            initialNoteX: note.x,
            initialNoteY: note.y
        });
    };
    const handleMouseMove = (e) => {
        if (!dragState.isDragging) return;
        const dx = e.clientX - dragState.startX;
        const dy = e.clientY - dragState.startY;
        setNotes(prev => prev.map(n => {
            if (n.id === dragState.noteId) {
                return {
                    ...n,
                    x: dragState.initialNoteX + dx,
                    y: dragState.initialNoteY + dy
                };
            }
            return n;
        }));
    };
    const handleMouseUp = async () => {
        if (dragState.isDragging) {
            // Save final position
            const note = notes.find(n => n.id === dragState.noteId);
            if (note) {
                await updateNote(note.id, { ...note });
            }
        }
        setDragState({ isDragging: false, noteId: null, startX: 0, startY: 0, initialNoteX: 0, initialNoteY: 0 });
    };
    return (
        <div
            className="w-full h-full relative"
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
        >
            {/* Background Hint */}
            {notes.length === 0 && (
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center opacity-30 pointer-events-none">
                    <h1 className="text-4xl font-bold mb-4">ZenBoard</h1>
                    <p>Click + to create a thought</p>
                </div>
            )}
            {/* Notes */}
            {notes.map(note => (
                <Note
                    key={note.id}
                    note={note}
                    onUpdate={updateNote}
                    onDelete={deleteNote}
                    onMouseDown={handleMouseDown}
                />
            ))}
            {/* Controls */}
            <div className="controls glass-panel">
                <button className="control-btn" onClick={createNote} title="New Note">
                    <PlusIcon />
                </button>
                <button className="control-btn" onClick={fetchNotes} title="Refresh">
                    <RefreshIcon />
                </button>
            </div>
        </div>
    );
}
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
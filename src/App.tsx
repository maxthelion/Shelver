import { useMemo, useState } from 'react';
import type { Analysis, Book } from './types';

const MODEL = 'gpt-5.6-terra';

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [image, setImage] = useState('');
  const [result, setResult] = useState<Analysis | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const books = useMemo(
    () => [...(result?.books || [])].sort((a, b) => (b.rating || 0) - (a.rating || 0)),
    [result],
  );

  async function run() {
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('image', file);
      fd.append('model', MODEL);
      const response = await fetch('/api/analyse', { method: 'POST', body: fd });
      const analysis = await response.json();
      if (!response.ok) throw new Error(analysis.error || 'Analysis failed');
      setResult(analysis);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setBusy(false);
    }
  }

  function pick(nextFile: File | null) {
    setFile(nextFile);
    setResult(null);
    setSelected(null);
    if (nextFile) setImage(URL.createObjectURL(nextFile));
  }

  return <main>
    <header>
      <div>
        <h1>Shelver</h1>
        <p>Photograph a shelf. Identify, rate and locate every book.</p>
      </div>
      <div className="controls">
        <span>GPT-5.6 Terra · two passes</span>
        <button disabled={!file || busy} onClick={run}>{busy ? 'Reading shelf…' : 'Analyse'}</button>
      </div>
    </header>
    <section className="workspace">
      <div className="photo">
        {image ? <>
          <img src={image} />
          <svg viewBox="0 0 1000 1000" preserveAspectRatio="none">
            {result?.books.map(book => <rect
              key={book.id}
              x={book.box.x * 1000}
              y={book.box.y * 1000}
              width={book.box.width * 1000}
              height={book.box.height * 1000}
              className={selected === book.id ? 'active' : ''}
              onClick={() => setSelected(book.id)}
            />)}
          </svg>
        </> : <label className="drop">Upload a shelf photo
          <input type="file" accept="image/*" onChange={event => pick(event.target.files?.[0] || null)} />
        </label>}
      </div>
      <aside>
        <div className="summary">
          <b>{books.length}</b> books {result && <span>via {result.model} · {result.passes} passes</span>}
        </div>
        {error && <p className="error">{error}</p>}
        <ol>{books.map((book: Book, index) => <li
          key={book.id}
          className={selected === book.id ? 'selected' : ''}
          onClick={() => setSelected(book.id)}
        >
          <span className="rank">{index + 1}</span>
          <span><b>{book.title}</b><small>{book.author} · {Math.round(book.confidence * 100)}% match</small></span>
          <span className="rating">{book.rating ? `★ ${book.rating.toFixed(2)}` : '—'}</span>
        </li>)}</ol>
      </aside>
    </section>
  </main>;
}

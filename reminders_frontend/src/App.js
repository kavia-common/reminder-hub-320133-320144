import React, { useEffect, useMemo, useState } from 'react';
import './App.css';
import {
  createReminder,
  deleteReminder,
  getConfiguredApiBaseUrl,
  listReminders,
  setReminderCompleted,
  updateReminder,
} from './apiClient';

function toDatetimeLocalValue(isoString) {
  if (!isoString) return '';
  // Convert ISO to yyyy-MM-ddTHH:mm for <input type="datetime-local">
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

function toIsoFromDatetimeLocal(value) {
  if (!value) return null;
  // datetime-local is local time; convert to ISO with timezone offset encoded by Date
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function formatDue(isoString) {
  if (!isoString) return '—';
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return isoString;
  return d.toLocaleString();
}

// PUBLIC_INTERFACE
function App() {
  /** Main Reminders application component. */
  const [theme, setTheme] = useState('light');
  const apiBaseUrl = useMemo(() => getConfiguredApiBaseUrl(), []);

  const [reminders, setReminders] = useState([]);
  const [includeCompleted, setIncludeCompleted] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const [form, setForm] = useState({
    title: '',
    description: '',
    dueDateLocal: '',
    notificationLocal: '',
  });

  // Effect to apply theme to document element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // PUBLIC_INTERFACE
  const toggleTheme = () => {
    /** Toggle between light/dark themes. */
    setTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  async function refresh() {
    setLoading(true);
    setError('');
    try {
      const data = await listReminders({ includeCompleted });
      setReminders(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.message || 'Failed to load reminders.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [includeCompleted]);

  function openCreate() {
    setEditing(null);
    setForm({
      title: '',
      description: '',
      dueDateLocal: '',
      notificationLocal: '',
    });
    setModalOpen(true);
  }

  function openEdit(r) {
    setEditing(r);
    setForm({
      title: r.title || '',
      description: r.description || '',
      dueDateLocal: toDatetimeLocalValue(r.due_date),
      notificationLocal: toDatetimeLocalValue(r.notification_at),
    });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
    setError('');
  }

  async function submitForm(e) {
    e.preventDefault();
    setError('');

    const dueIso = toIsoFromDatetimeLocal(form.dueDateLocal);
    if (!form.title.trim()) {
      setError('Title is required.');
      return;
    }
    if (!dueIso) {
      setError('Due date is required.');
      return;
    }

    const payload = {
      title: form.title.trim(),
      description: form.description.trim() ? form.description.trim() : null,
      due_date: dueIso,
      notification_at: toIsoFromDatetimeLocal(form.notificationLocal),
    };

    try {
      if (editing) {
        await updateReminder(editing.id, payload);
      } else {
        await createReminder(payload);
      }
      closeModal();
      await refresh();
    } catch (e2) {
      setError(e2?.message || 'Failed to save reminder.');
    }
  }

  async function onToggleCompleted(r) {
    setError('');
    try {
      await setReminderCompleted(r.id, !r.completed);
      await refresh();
    } catch (e) {
      setError(e?.message || 'Failed to update completion.');
    }
  }

  async function onDelete(r) {
    // Keep it simple without blocking confirm UI frameworks.
    // eslint-disable-next-line no-alert
    const ok = window.confirm(`Delete reminder "${r.title}"?`);
    if (!ok) return;

    setError('');
    try {
      await deleteReminder(r.id);
      await refresh();
    } catch (e) {
      setError(e?.message || 'Failed to delete reminder.');
    }
  }

  return (
    <div className="App">
      <header className="appShell">
        <div className="topBar">
          <div className="brand">
            <div className="brandMark" aria-hidden="true">
              R
            </div>
            <div className="brandText">
              <div className="brandTitle">Reminder Hub</div>
              <div className="brandSubtitle">
                {apiBaseUrl ? (
                  <>
                    API: <code className="inlineCode">{apiBaseUrl}</code>
                  </>
                ) : (
                  <>
                    API: <span className="muted">not configured</span>{' '}
                    <span className="hint">
                      (set <code className="inlineCode">REACT_APP_API_BASE_URL</code>)
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="topBarActions">
            <button
              className="btn btnSecondary"
              onClick={() => setIncludeCompleted((v) => !v)}
              type="button"
            >
              {includeCompleted ? 'Hide completed' : 'Show completed'}
            </button>
            <button className="btn btnPrimary" onClick={openCreate} type="button">
              + New reminder
            </button>
            <button
              className="btn btnGhost"
              onClick={toggleTheme}
              type="button"
              aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {theme === 'light' ? 'Dark mode' : 'Light mode'}
            </button>
          </div>
        </div>

        <main className="main">
          {error ? (
            <div className="alert" role="alert">
              {error}
            </div>
          ) : null}

          <div className="card">
            <div className="cardHeader">
              <div className="cardTitle">Reminders</div>
              <div className="cardMeta">
                {loading ? 'Loading…' : `${reminders.length} item(s)`}
              </div>
            </div>

            <div className="list" role="list">
              {reminders.length === 0 && !loading ? (
                <div className="empty">
                  <div className="emptyTitle">No reminders yet</div>
                  <div className="emptySubtitle">
                    Create one to get started. You can also set an optional notification time.
                  </div>
                  <button className="btn btnPrimary" onClick={openCreate} type="button">
                    + New reminder
                  </button>
                </div>
              ) : null}

              {reminders.map((r) => (
                <div className={`row ${r.completed ? 'rowCompleted' : ''}`} key={r.id} role="listitem">
                  <label className="checkbox">
                    <input
                      type="checkbox"
                      checked={!!r.completed}
                      onChange={() => onToggleCompleted(r)}
                      aria-label={`Mark "${r.title}" as ${r.completed ? 'incomplete' : 'completed'}`}
                    />
                    <span className="checkboxLabel" />
                  </label>

                  <div className="rowBody">
                    <div className="rowTop">
                      <div className="rowTitle">{r.title}</div>
                      <div className="rowDue">
                        <span className="pill">{r.completed ? 'Completed' : 'Pending'}</span>
                        <span className="muted">Due: {formatDue(r.due_date)}</span>
                      </div>
                    </div>

                    {r.description ? <div className="rowDesc">{r.description}</div> : null}

                    {r.notification_at ? (
                      <div className="rowNotif">
                        <span className="muted">Notification:</span> {formatDue(r.notification_at)}
                      </div>
                    ) : null}
                  </div>

                  <div className="rowActions">
                    <button className="btn btnSecondary" onClick={() => openEdit(r)} type="button">
                      Edit
                    </button>
                    <button className="btn btnDanger" onClick={() => onDelete(r)} type="button">
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>

        {modalOpen ? (
          <div className="modalOverlay" role="dialog" aria-modal="true" aria-label="Reminder form">
            <div className="modal">
              <div className="modalHeader">
                <div className="modalTitle">{editing ? 'Edit reminder' : 'New reminder'}</div>
                <button className="iconBtn" onClick={closeModal} type="button" aria-label="Close">
                  ×
                </button>
              </div>

              <form className="form" onSubmit={submitForm}>
                <div className="field">
                  <label className="label" htmlFor="title">
                    Title
                  </label>
                  <input
                    id="title"
                    className="input"
                    value={form.title}
                    onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                    placeholder="e.g., Pay rent"
                    required
                  />
                </div>

                <div className="field">
                  <label className="label" htmlFor="desc">
                    Description (optional)
                  </label>
                  <textarea
                    id="desc"
                    className="textarea"
                    value={form.description}
                    onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                    placeholder="Add details…"
                    rows={4}
                  />
                </div>

                <div className="grid2">
                  <div className="field">
                    <label className="label" htmlFor="due">
                      Due date
                    </label>
                    <input
                      id="due"
                      className="input"
                      type="datetime-local"
                      value={form.dueDateLocal}
                      onChange={(e) => setForm((p) => ({ ...p, dueDateLocal: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="field">
                    <label className="label" htmlFor="notif">
                      Notification (optional)
                    </label>
                    <input
                      id="notif"
                      className="input"
                      type="datetime-local"
                      value={form.notificationLocal}
                      onChange={(e) => setForm((p) => ({ ...p, notificationLocal: e.target.value }))}
                    />
                  </div>
                </div>

                {error ? (
                  <div className="alert" role="alert">
                    {error}
                  </div>
                ) : null}

                <div className="formActions">
                  <button className="btn btnSecondary" type="button" onClick={closeModal}>
                    Cancel
                  </button>
                  <button className="btn btnPrimary" type="submit">
                    {editing ? 'Save changes' : 'Create reminder'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : null}
      </header>
    </div>
  );
}

export default App;

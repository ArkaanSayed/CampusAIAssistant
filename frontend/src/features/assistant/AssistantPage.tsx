import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  createChat,
  getChat,
  listChats,
  sendChatMessage,
  studentCourses,
  type AssistantCourse,
  type ChatMessage,
  type ChatSummary,
} from '../../api/assistant';
import { currentCalendar } from '../../api/materials';
import { ApiError } from '../../api/client';
import { Alert } from '../../components/common/Alert';
import { calendarLabel } from '../../components/layout/calendar-label';
import { useAuth } from '../auth/useAuth';

export function AssistantPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [termId, setTermId] = useState<number | null>(null);
  const [termLabel, setTermLabel] = useState('');
  const [classLabel, setClassLabel] = useState<string | null>(null);
  const [courses, setCourses] = useState<AssistantCourse[]>([]);
  const [courseId, setCourseId] = useState<number | null>(null);
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [activeChat, setActiveChat] = useState<ChatSummary | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let active = true;
    currentCalendar()
      .then(async (calendar) => {
        if (!active) {
          return;
        }
        setTermLabel(calendarLabel(calendar));
        const nextTermId = calendar.academicTerm?.id ?? null;
        setTermId(nextTermId);
        if (!nextTermId) {
          return;
        }
        const [courseResult, chatResult] = await Promise.all([studentCourses(nextTermId), listChats()]);
        if (!active) {
          return;
        }
        setClassLabel(courseResult.classLabel);
        setCourses(courseResult.courses);
        setCourseId(courseResult.courses[0]?.id ?? null);
        setChats(chatResult.chats);
      })
      .catch((caught: unknown) => {
        if (active) {
          setError(caught instanceof ApiError ? caught.message : 'Unable to load the assistant.');
        }
      });
    return () => {
      active = false;
    };
  }, []);

  function startNewChat() {
    setActiveChat(null);
    setMessages([]);
    setError(null);
    setDraft('');
  }

  async function openChat(chatId: number) {
    setError(null);
    try {
      const result = await getChat(chatId);
      setActiveChat(result.chat);
      setMessages(result.messages);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Unable to open that chat.');
    }
  }

  async function onSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const question = draft.trim();
    if (!question || sending) {
      return;
    }
    setSending(true);
    setError(null);
    const optimistic: ChatMessage = {
      id: Date.now(),
      role: 'USER',
      content: question,
      sources: [],
      createdAt: new Date().toISOString(),
    };
    setMessages((current) => [...current, optimistic]);
    setDraft('');
    try {
      let chat = activeChat;
      if (!chat) {
        if (!termId || !courseId) {
          throw new ApiError(400, 'Choose a course first.');
        }
        chat = await createChat(courseId, termId);
        setActiveChat(chat);
      }
      const result = await sendChatMessage(chat.id, question);
      setActiveChat(result.chat);
      setMessages((current) => [...current, result.message]);
      setChats((current) => [result.chat, ...current.filter((item) => item.id !== result.chat.id)]);
    } catch (caught) {
      setMessages((current) => current.filter((item) => item.id !== optimistic.id));
      setDraft(question);
      setError(caught instanceof ApiError ? caught.message : 'Unable to send that question.');
    } finally {
      setSending(false);
    }
  }

  async function onLogout() {
    setLoggingOut(true);
    try {
      await logout();
      navigate('/login');
    } catch {
      setError('Could not log out. Try again.');
      setLoggingOut(false);
    }
  }

  const courseName = activeChat?.courseName ?? courses.find((course) => course.id === courseId)?.name ?? 'Course';

  return (
    <div className="chat-shell">
      <aside className="chat-list">
        <p className="brand">Campus Assistant</p>
        <button className="button chat-new" type="button" onClick={startNewChat}>
          New chat
        </button>
        <div className="chat-history">
          {chats.map((chat) => (
            <button
              key={chat.id}
              type="button"
              className={activeChat?.id === chat.id ? 'chat-link active' : 'chat-link'}
              onClick={() => void openChat(chat.id)}
            >
              <strong>{chat.courseName}</strong>
              <span>{chat.title}</span>
            </button>
          ))}
        </div>
      </aside>
      <section className="chat-main">
        <header className="topbar">
          <p className="calendar-chip">
            {classLabel ? `${classLabel} · ` : ''}
            {termLabel}
          </p>
          <p className="topbar-user">{user?.email}</p>
          <button className="button button-secondary" type="button" onClick={() => void onLogout()} disabled={loggingOut}>
            {loggingOut ? 'Signing out...' : 'Log out'}
          </button>
        </header>
        <div className="chat-course">
          {activeChat ? (
            <p>{courseName}</p>
          ) : (
            <label>
              <span className="muted">Course</span>
              <select value={courseId ?? ''} onChange={(event) => setCourseId(Number(event.target.value))}>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.code} · {course.name}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        <div className="chat-transcript">
          {error ? <Alert message={error} /> : null}
          {messages.length === 0 ? <p className="chat-empty">Ask a question about your course materials.</p> : null}
          {messages.map((message) => (
            <article key={message.id} className={message.role === 'USER' ? 'chat-row user' : 'chat-row assistant'}>
              <div className={message.role === 'USER' ? 'chat-bubble user' : 'chat-bubble assistant'}>
                <p>{message.content}</p>
                {message.sources.length > 0 ? (
                  <ul className="chat-sources">
                    {message.sources.map((source) => (
                      <li key={`${source.documentId}-${source.pageNumber ?? 'na'}`}>
                        {source.title}
                        {source.pageNumber ? ` · page ${source.pageNumber}` : ''}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </article>
          ))}
          {sending ? <p className="status">Looking through the course materials...</p> : null}
        </div>
        <form className="chat-composer" onSubmit={(event) => void onSend(event)}>
          <input
            name="question"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Ask about this course..."
            maxLength={2000}
            disabled={!courseId || sending}
          />
          <button className="button" type="submit" disabled={sending || !draft.trim() || !courseId}>
            {sending ? 'Sending...' : 'Send'}
          </button>
        </form>
      </section>
    </div>
  );
}

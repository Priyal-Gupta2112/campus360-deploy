import React, { useEffect, useMemo, useState } from 'react'
import {
  Activity, ArrowDownRight, ArrowRight, Award, BookOpen, CalendarDays, Check,
  ChevronRight, CircleHelp, Clock3, GraduationCap, LayoutDashboard, MapPin,
  Menu, Plus, Search, ShieldCheck, Sparkles, Users, WalletCards, X, Bike,
  Bell, LogOut, LockKeyhole, Target, Trophy, Moon, Sun
} from 'lucide-react'
import { contacts, events, gradeScale, initialChallenges, initialRides, initialSubjects } from './data'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import * as XLSX from 'xlsx'

const getInitialTheme = () => {
  try {
    return localStorage.getItem('campus360-theme') || 'light'
  } catch {
    return 'light'
  }
}

const nav = [
  ['Dashboard', LayoutDashboard], ['Academic Planner', GraduationCap], ['Faculty', BookOpen], ['Timetable', CalendarDays], ['Rides', Bike],
  ['Challenges', Trophy], ['Achievements', Award], ['Campus Guide', MapPin], ['Campus Pulse', CalendarDays], ['SkillSwap', Users],
]

const read = (key, fallback) => {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback } catch { return fallback }
}
const save = (key, value) => localStorage.setItem(key, JSON.stringify(value))

function Badge({ children, tone = 'slate' }) { return <span className={`badge ${tone}`}>{children}</span> }
function Stat({ label, value, hint, icon: Icon }) { return <div className="stat"><div className="stat-top"><span>{label}</span><span className="icon-box"><Icon size={18}/></span></div><strong>{value}</strong><small>{hint}</small></div> }
function SectionTitle({ title, sub, action }) { return <div className="section-title"><div><h2>{title}</h2>{sub && <p>{sub}</p>}</div>{action}</div> }


function CustomSelect({ value, onChange, options, ariaLabel }) {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(Math.max(0, options.findIndex(option => option.value === value)))
  useEffect(() => {
    if (!open) return
    const close = event => { if (!event.target.closest?.('.custom-select-wrap')) setOpen(false) }
    const keydown = event => {
      if (event.key === 'Escape') setOpen(false)
      if (event.key === 'ArrowDown') { event.preventDefault(); setActiveIndex(index => (index + 1) % options.length) }
      if (event.key === 'ArrowUp') { event.preventDefault(); setActiveIndex(index => (index - 1 + options.length) % options.length) }
      if (event.key === 'Enter') { event.preventDefault(); onChange(options[activeIndex]?.value); setOpen(false) }
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', keydown)
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', keydown) }
  }, [open, options, activeIndex, onChange])
  const selected = options.find(option => option.value === value)
  return <div className={`custom-select-wrap${open ? ' is-open' : ''}`}>
    <button type="button" className="auth-select custom-select-trigger" aria-label={ariaLabel} aria-haspopup="listbox" aria-expanded={open} onClick={() => { setOpen(current => !current); setActiveIndex(Math.max(0, options.findIndex(option => option.value === value))) }}>
      <span>{selected?.label ?? ''}</span><ChevronRight className="custom-select-chevron" size={18} />
    </button>
    {open && <div className="custom-select-menu" role="listbox" aria-label={ariaLabel}>
      {options.map((option, index) => <button type="button" role="option" aria-selected={option.value === value} key={option.value} className={`custom-select-option${option.value === value ? ' selected' : ''}${index === activeIndex ? ' active' : ''}`} onMouseEnter={() => setActiveIndex(index)} onClick={() => { onChange(option.value); setOpen(false) }}>{option.label}</button>)}
    </div>}
  </div>
}

function App() {
  const [theme, setTheme] = useState(getInitialTheme)
  const [page, setPage] = useState('Dashboard')
  const [mobileNav, setMobileNav] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [subjects, setSubjects] = useState(() => read('c360_subjects', initialSubjects))
  const [rides, setRides] = useState(() => read('c360_rides', initialRides))
  const [challenges, setChallenges] = useState(() => read('c360_challenges', initialChallenges))
  const [eventsList, setEventsList] = useState(() => read('c360_events', events))
  const [profile, setProfile] = useState(() => read('c360_profile', { name: 'Alex Student', interests: 'Technology, Design', subjects: 'Programming, Mathematics' }))

  // Always logged in on localhost; on live server, preserve session across page refreshes
const [loggedIn, setLoggedIn] = useState(() => {
  try {
    if (import.meta.env.DEV) return true;
    return localStorage.getItem('c360_logged_in') === 'true';
  } catch {
    return false;
  }
});
  const [showLogin, setShowLogin] = useState(false)
  const [notice, setNotice] = useState('')
  const [notifications, setNotifications] = useState(() => read('c360_notifications', []))
  const [showNotifications, setShowNotifications] = useState(false)
  const [search, setSearch] = useState('')
  const [newRide, setNewRide] = useState({ from: '', to: 'Campus Main Gate', time: '', seats: 2, vehicleType: 'Car', paymentMode: 'Pay before ride', fare: '' })
  const [timetable, setTimetable] = useState(() => read('c360_timetable', {}))
  const [achievements, setAchievements] = useState(() => read('c360_achievements', []))
  const [logoutConfirm, setLogoutConfirm] = useState(false)
  const [newChallenge, setNewChallenge] = useState('')
  const [assignments, setAssignments] = useState(() => read('c360_assignments', [
    { id: 1, title: 'Programming Fundamentals Lab Report', subject: 'Programming', due: '2026-10-17', priority: 'High' },
    { id: 2, title: 'Engineering Mathematics Problem Set', subject: 'Mathematics', due: '2026-10-19', priority: 'Medium' },
    { id: 3, title: 'Communication Skills Reflection', subject: 'Communication Skills', due: '2026-10-22', priority: 'Low' },
  ]))
  const [skills, setSkills] = useState(() => read('c360_skills', [
    { id: 1, name: 'Figma basics', category: 'Design', offer: 'Can teach', want: 'React basics', owner: 'Sana K.', contact: 'Campus message' },
    { id: 2, name: 'Python problem solving', category: 'Technology', offer: 'Can teach', want: 'Video editing', owner: 'Aarav M.', contact: 'Campus message' },
    { id: 3, name: 'Public speaking', category: 'Communication', offer: 'Want to learn', wantSkill: 'Presentation practice', owner: 'Rohan P.', contact: 'Campus message' },
  ]))
  const [targetSgpa, setTargetSgpa] = useState('8.5')
  const [activeTab, setActiveTab] = useState('Planner')
  const [authMode, setAuthMode] = useState('login')
  const [authPhone, setAuthPhone] = useState('')
  const [authOtp, setAuthOtp] = useState('')
  const [authOtpSent, setAuthOtpSent] = useState(false)
  const [authName, setAuthName] = useState('')
  const [authYear, setAuthYear] = useState('1st Year')
  const [authBranch, setAuthBranch] = useState('')
  const [authBatch, setAuthBatch] = useState('1')
  const [authRollNo, setAuthRollNo] = useState('')
  const [authError, setAuthError] = useState('')

  useEffect(() => {
    document.body.classList.toggle('dark-mode', theme === 'dark')
    try { localStorage.setItem('campus360-theme', theme) } catch {}
  }, [theme])

  // Sync login state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('c360_logged_in', String(loggedIn))
    } catch {}
  }, [loggedIn])

  useEffect(() => save('c360_subjects', subjects), [subjects])
  useEffect(() => save('c360_rides', rides), [rides])
  useEffect(() => save('c360_challenges', challenges), [challenges])
  useEffect(() => save('c360_events', eventsList), [eventsList])
  useEffect(() => save('c360_assignments', assignments), [assignments])

  useEffect(() => {
    const now = new Date();
    const horizon = 48 * 60 * 60 * 1000;
    const dueAssignments = assignments.filter(a => a.due && new Date(`${a.due}T23:59:00`).getTime() >= now.getTime() && new Date(`${a.due}T23:59:00`).getTime() <= now.getTime() + horizon);
    const closingEvents = eventsList.filter(ev => ev.registrationEnd && new Date(`${ev.registrationEnd}T23:59:00`).getTime() >= now.getTime() && new Date(`${ev.registrationEnd}T23:59:00`).getTime() <= now.getTime() + horizon);
    const alerts = [...dueAssignments.map(a => `Assignment deadline approaching: ${a.title} (${a.due})`), ...closingEvents.map(ev => `Registration closing soon: ${ev.name} (${ev.registrationEnd})`)];
    let seen = [];
    try { seen = JSON.parse(localStorage.getItem('c360_seen_alerts') || '[]') } catch {}
    const unseen = alerts.filter(a => !seen.includes(a));
    if (unseen.length) {
      notify(unseen.slice(0, 2).join(' • '));
      try { localStorage.setItem('c360_seen_alerts', JSON.stringify([...seen, ...unseen])) } catch {}
    }
  }, [assignments, eventsList])

  useEffect(() => save('c360_skills', skills), [skills])
  useEffect(() => save('c360_timetable', timetable), [timetable])
  useEffect(() => save('c360_achievements', achievements), [achievements])

  useEffect(() => {
    const handleChallengeCreate = (event) => {
      setChallenges(old => [event.detail, ...old]);
      notify('Challenge submitted for review.');
    };
    window.addEventListener('campus360-challenge-create', handleChallengeCreate);
    return () => window.removeEventListener('campus360-challenge-create', handleChallengeCreate);
  }, [])

  useEffect(() => save('c360_profile', profile), [profile])

  const points = challenges.filter(c => c.done).reduce((n,c) => n + c.points, 0)
  const marksRows = useMemo(() => subjects.map(s => {
    const needed = s.cutoff - s.internal
    const locked = needed > 100
    const grade = gradeScale.find(g => (s.internal + 60) >= g.min)?.grade || '—'
    return { ...s, needed: Math.max(0, needed), locked, grade }
  }), [subjects])
  const totalCredits = subjects.reduce((a,s) => a + Number(s.credits || 0), 0)
  const targetReachable = subjects.every(s => s.internal + 100 >= s.cutoff && s.internal + 100 >= s.pass)

  function notify(message) {
    const item = { id: Date.now() + Math.random(), message: String(message), time: new Date().toISOString(), read: false }
    setNotifications(old => [item, ...old].slice(0, 30))
    setNotice(String(message))
    window.setTimeout(() => setNotice(current => current === String(message) ? '' : current), 4500)
  }

  useEffect(() => save('c360_notifications', notifications), [notifications])

  function navigate(name) { setPage(name); setMobileNav(false) }
  function runCampusSearch() { navigate('Campus Guide'); if (!search.trim()) notify('Campus directory opened. Type a place, club, or service to search.'); else notify(`Searching campus directory for “${search.trim()}”.`) }
  const unreadNotifications = notifications.filter(n => !n.read).length

  function handleLogout() {
    try {
      localStorage.removeItem('c360_logged_in');
      setLoggedIn(false);
    } catch {}
    setLoggedIn(false);
    setLogoutConfirm(false);
    setShowLogin(false);
    setAuthOtpSent(false);
    setAuthOtp('');
    setAuthError('');
    notify('Logged out successfully.');
  }

  function requestRide(id) {
    setRides(old => old.map(r => r.id === id ? { ...r, requests: [...(r.requests || []), { id: Date.now(), requester: profile.name, status: 'Pending' }] } : r))
    notify('Ride request sent. The provider can accept or reject it.')
  }

  function updateRideRequest(rideId, requestId, status) {
    setRides(old => old.map(r => r.id !== rideId ? r : { ...r, requests: (r.requests || []).map(q => q.id === requestId ? { ...q, status } : q) }))
    notify(`Ride request ${status.toLowerCase()}.`)
  }

  function addRide(e) {
    e.preventDefault()
    if (!newRide.from.trim() || !newRide.to.trim() || !newRide.time.trim()) return notify('Enter pickup point, destination and time.')
    setRides(old => [{ ...newRide, id: Date.now(), seats: Number(newRide.seats), fare: newRide.fare ? Number(newRide.fare) : '', status: 'Available', requests: [], driver: profile.name, verified: true, lat: Number(newRide.lat || 19.0445), lng: Number(newRide.lng || 72.8992) }, ...old])
    setNewRide({ from: '', to: 'Campus Main Gate', time: '', seats: 2, vehicleType: 'Car', paymentMode: 'Pay before ride', fare: '' })
    notify('Your ride is now listed.')
  }

  function addChallenge(e) {
    e.preventDefault()
    if (!newChallenge.trim()) return
    setChallenges(old => [{ id: Date.now(), title: newChallenge.trim(), description: 'Community activity', contact: 'Class representative', className: 'All First Years', points: 25, done: false, status: 'Pending approval' }, ...old])
    setNewChallenge('')
    notify('Challenge posted.')
  }

  function toggleChallenge(id) {
    setChallenges(old => old.map(c => c.id === id ? { ...c, done: !c.done } : c))
    notify('Challenge status updated.')
  }

  function updateSubject(id, key, value) { setSubjects(old => old.map(s => s.id === id ? { ...s, [key]: Number(value) } : s)) }

  async function sendOtp(e) {
    e.preventDefault();

    const digits = authPhone.replace(/\D/g, '');
    if (digits.length !== 10) {
      setAuthError('Enter a valid 10-digit phone number.');
      return;
    }

    setAuthError('');

    try {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: `+91${digits}` }),
      });

      const raw = await response.text();
      let data = {};
      try { data = raw ? JSON.parse(raw) : {}; } catch { data = { error: raw || 'Server returned an unreadable response.' }; }

      if (!response.ok) {
        throw new Error(data.error || 'Could not send OTP.');
      }

      setAuthOtpSent(true);
      notify(data.message || 'OTP request accepted.');
    } catch (error) {
      setAuthError(error.message || 'Unable to send OTP. Check the backend.');
    }
  }

  async function verifyOtp(e) {
    e.preventDefault();

    if (!/^\d{6}$/.test(authOtp)) {
      setAuthError('Enter the six-digit OTP.');
      return;
    }

    if (authMode === 'signup' && !authName.trim()) {
      setAuthError('Enter your name to create a profile.');
      return;
    }
    if (authMode === 'signup' && (!authYear || !authBranch.trim() || !authBatch || !authRollNo.trim())) {
      setAuthError('Please complete your year, branch, batch, and roll number.');
      return;
    }

    setAuthError('');

    try {
      const digits = authPhone.replace(/\D/g, '');
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: `+91${digits}`,
          code: authOtp,
        }),
      });

      const raw = await response.text();
      let data = {};
      try { data = raw ? JSON.parse(raw) : {}; } catch { data = { error: raw || 'Server returned an unreadable response.' }; }

      if (!response.ok) {
        throw new Error(data.error || 'OTP verification failed.');
      }

      if (authMode === 'signup') {
        const studentDetails = {
          name: authName.trim(), year: authYear, branch: authBranch.trim(),
          batch: authBatch, rollNo: authRollNo.trim(), phone: `+91${digits}`,
        };
        setProfile(p => ({ ...p, ...studentDetails }));
        try { localStorage.setItem('c360_student_details', JSON.stringify(studentDetails)); } catch {}
      }

      try {
        localStorage.setItem('c360_logged_in', 'true');
      } catch {}

      setLoggedIn(true);
      setAuthError('');
      notify('OTP verified successfully.');
    } catch (error) {
      setAuthError(error.message || 'Unable to verify OTP.');
    }
  }

  if (!loggedIn) return <div className="auth-page">
    <div className="auth-decoration auth-decoration-one"/><div className="auth-decoration auth-decoration-two"/>
    <div className="auth-brand"><div className="brand-mark"><img src="/logo.png" alt="Campus360 logo" onLoad={e => { const fallback = e.currentTarget.nextElementSibling; if (fallback) fallback.style.display = 'none' }} onError={e => { e.currentTarget.style.display = 'none' }}/><Sparkles className="brand-fallback" size={22}/></div><div><b>Campus<span>360</span></b><small>YOUR COLLEGE COMPANION</small></div></div><button type="button" className="theme-toggle auth-theme-toggle" onClick={() => setTheme(current => current === 'dark' ? 'light' : 'dark')} aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>{theme === 'dark' ? <Sun size={18}/> : <Moon size={18}/>}<span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span></button>
    <div className="auth-layout">
      <section className="auth-intro"><Badge tone="mint"><Sparkles size={13}/> FIRST-YEAR LIFE, SIMPLIFIED</Badge><h1>Your campus.<br/>Your people.<br/><span>Your next step.</span></h1><p>One place to plan your academics, find your way around campus, share rides and learn together.</p><div className="auth-benefits"><div><span><BookOpen size={17}/></span><b>Stay on top of academics</b></div><div><span><Users size={17}/></span><b>Find your campus community</b></div><div><span><MapPin size={17}/></span><b>Make campus feel closer</b></div></div><div className="auth-footnote">Built for first-year students · One connected campus</div></section>
      <section className="auth-card"><div className="auth-card-top"><div className="auth-icon"><ShieldCheck size={22}/></div><span className="secure-label"><LockKeyhole size={12}/> Student access</span></div>
        <h2>{authMode === 'login' ? 'Welcome back' : 'Create your account'}</h2><p className="auth-subtitle">{authMode === 'login' ? 'Sign in with your phone number to continue.' : 'Join Campus360 and make your first year count.'}</p>
        <div className="auth-tabs"><button className={authMode === 'login' ? 'active' : ''} onClick={() => { setAuthMode('login'); setAuthOtpSent(false); setAuthError('') }}>Login</button><button className={authMode === 'signup' ? 'active' : ''} onClick={() => { setAuthMode('signup'); setAuthOtpSent(false); setAuthError('') }}>Sign Up</button></div>
        {authMode === 'signup' && !authOtpSent && <div className="signup-fields">
          <label className="auth-label">Full name<input value={authName} onChange={e => setAuthName(e.target.value)} placeholder="Enter your full name" autoComplete="name" required /></label>
          <div className="signup-fields-grid">
            <label className="auth-label">Academic year
              <CustomSelect value={authYear} onChange={setAuthYear} ariaLabel="Academic year" options={[{value:'1st Year',label:'1st Year'},{value:'2nd Year',label:'2nd Year'},{value:'3rd Year',label:'3rd Year'},{value:'4th Year',label:'4th Year'}]} />
            </label>
            <label className="auth-label">Batch
              <CustomSelect value={authBatch} onChange={setAuthBatch} ariaLabel="Batch" options={[{value:'1',label:'Batch 1'},{value:'2',label:'Batch 2'}]} />
            </label>
            <label className="auth-label">Branch<input value={authBranch} onChange={e => setAuthBranch(e.target.value)} placeholder="Enter your branch" required /></label>
            <label className="auth-label">Roll number<input value={authRollNo} onChange={e => setAuthRollNo(e.target.value)} placeholder="Enter your roll no." required /></label>
          </div>
        </div>}
        <form onSubmit={authOtpSent ? verifyOtp : sendOtp} className="auth-form">
          <label className="auth-label">Phone number<div className="phone-input"><span>+91</span><input value={authPhone} onChange={e => { setAuthPhone(e.target.value); setAuthError('') }} placeholder="10-digit mobile number" inputMode="numeric" autoComplete="tel-national" maxLength={10} required disabled={authOtpSent}/></div></label>
          {authOtpSent && <label className="auth-label">One-time password (OTP)<input value={authOtp} onChange={e => { setAuthOtp(e.target.value); setAuthError('') }} placeholder="Enter 6-digit OTP" inputMode="numeric" maxLength={6} required/>
          <small className="demo-otp">
  Enter the verification code sent to your mobile number.
</small>
          </label>}
          {authError && <div className="auth-error">{authError}</div>}
          {!authOtpSent ? <button className="primary auth-submit" type="submit">Send OTP <ArrowRight size={16}/></button> : <><button className="primary auth-submit" type="submit">Verify OTP and continue <ArrowRight size={16}/></button><button className="auth-back" type="button" onClick={() => { setAuthOtpSent(false); setAuthOtp(''); setAuthError('') }}>Change phone number</button></>}
        </form>
        <div className="auth-divider"><span/> <small>SECURE STUDENT ACCESS</small> <span/></div><p className="auth-legal">By continuing, you agree to use Campus360 respectfully and keep student information private.</p>
        <div className="auth-warning"><b>Secure phone verification</b><span>Campus360 sends a real OTP through MiniMoth over WhatsApp, with SMS fallback when available. Enter the six-digit code you receive.</span></div>
      </section>
    </div>
    <div className="auth-bottom"><span>© Campus360 · Student-first campus space</span><span><ShieldCheck size={13}/> Demo environment</span></div>
  </div>

  return <div className={`app-shell ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
    <aside className={`sidebar ${mobileNav ? 'open' : ''}`}>
      <div className="brand"><div className="brand-mark"><img src="/logo.png" alt="Campus360 logo" onLoad={e => { const fallback = e.currentTarget.nextElementSibling; if (fallback) fallback.style.display = 'none' }} onError={e => { e.currentTarget.style.display = 'none' }}/><Sparkles className="brand-fallback" size={22}/></div><div><b>Campus<span>360</span></b><small>YOUR COLLEGE COMPANION</small></div><button type="button" className="mobile-close" onClick={() => { setMobileNav(false); setSidebarCollapsed(true) }} aria-label="Hide sidebar" title="Hide sidebar"><X size={18}/></button></div>
      <div className="profile-mini"><div className="avatar">{profile.name.split(' ').map(x => x[0]).slice(0,2).join('')}</div><div><b>{profile.name}</b><small>First-year student</small></div><Badge tone="green">FY</Badge></div>
      <div className="nav-label">YOUR CAMPUS</div>
      <nav>{nav.map(([name, Icon]) => <button key={name} className={`nav-item ${page === name ? 'active' : ''}`} onClick={() => navigate(name)}><Icon size={18}/><span>{name}</span>{name === 'Challenges' && <span className="nav-count">{challenges.length}</span>}</button>)}</nav>
      <div className="sidebar-bottom"><button className="nav-item logout-nav" onClick={() => setLogoutConfirm(true)}><LogOut size={18}/><span>Log out</span></button><div className="help-card"><div className="help-icon"><CircleHelp size={18}/></div><b>Need a hand?</b><p>Find the right person to help you on campus.</p><button onClick={() => navigate('Campus Guide')}>Get help <ArrowRight size={14}/></button></div><div className="sidebar-foot"><ShieldCheck size={15}/> Student-first campus space</div></div>
    </aside>
    {mobileNav && <button className="scrim" onClick={() => setMobileNav(false)} aria-label="Close menu"/>}
    <main className="main-area">
      <header className="topbar"><div className="topbar-left"><button type="button" className="mobile-menu" onClick={() => { setSidebarCollapsed(false); setMobileNav(true) }} aria-label="Show sidebar" title="Show sidebar"><Menu/></button><div className="crumb">Campus / <b>{page}</b></div></div><div className="top-actions"><form className="searchbox" onSubmit={e => { e.preventDefault(); runCampusSearch() }}><Search size={16}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search campus..." aria-label="Search campus"/><button type="submit" className="search-submit" aria-label="Search campus" title="Search campus"><ArrowRight size={15}/></button></form><button type="button" className="theme-toggle" onClick={() => setTheme(current => current === 'dark' ? 'light' : 'dark')} aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>{theme === 'dark' ? <Sun size={18}/> : <Moon size={18}/>}<span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span></button><div className="notifications-wrap"><button type="button" className="notifications-button" title="Notifications" aria-label={`Notifications, ${unreadNotifications} unread`} onClick={() => { setShowNotifications(v => !v); setNotifications(old => old.map(n => ({...n, read:true}))) }}><Bell size={18}/><span>Notifications</span>{unreadNotifications > 0 && <b>{unreadNotifications > 9 ? '9+' : unreadNotifications}</b>}</button>{showNotifications && <div className="notifications-popover"><div className="notifications-head"><strong>Notifications</strong><button type="button" onClick={() => setNotifications([])}>Clear all</button></div>{notifications.length ? notifications.map(n => <div className={`notification-entry ${n.read ? '' : 'unread'}`} key={n.id}><span>{n.message}</span><small>{new Date(n.time).toLocaleString()}</small></div>) : <p className="notifications-empty">You're all caught up. Important reminders will appear here.</p>}<button className="notifications-close" onClick={() => setShowNotifications(false)}>Close</button></div>}</div><button className="user-button" onClick={() => setShowLogin(true)}><div className="avatar small">{profile.name.split(' ').map(x => x[0]).slice(0,2).join('')}</div><span>{loggedIn ? 'Account' : 'Demo profile'}</span><ChevronRight size={15}/></button></div></header>
      <div className="page-content">
        {page === 'Dashboard' && <Dashboard profile={profile} setProfile={setProfile} marksRows={marksRows} rides={rides} challenges={challenges} points={points} eventsList={eventsList} navigate={navigate} notify={notify} assignments={assignments} />}
        {page === 'Faculty' && <FacultyDirectory search={search}/> }
        {page === 'Timetable' && <Timetable timetable={timetable} setTimetable={setTimetable} notify={notify}/> }
        {page === 'Academic Planner' && <AcademicPlanner subjects={subjects} setSubjects={setSubjects} marksRows={marksRows} targetSgpa={targetSgpa} setTargetSgpa={setTargetSgpa} totalCredits={totalCredits} targetReachable={targetReachable} updateSubject={updateSubject} activeTab={activeTab} setActiveTab={setActiveTab} notify={notify}/>}
        {page === 'Rides' && <Rides rides={rides} requestRide={requestRide} updateRideRequest={updateRideRequest} profile={profile} newRide={newRide} setNewRide={setNewRide} addRide={addRide} search={search}/>}
        {page === 'Challenges' && <Challenges challenges={challenges} points={points} newChallenge={newChallenge} setNewChallenge={setNewChallenge} addChallenge={addChallenge} toggleChallenge={toggleChallenge}/> }
        {page === 'Achievements' && <Achievements achievements={achievements} setAchievements={setAchievements} profile={profile} notify={notify}/>}
        {page === 'Campus Guide' && <CampusGuide search={search} eventsList={eventsList} setEventsList={setEventsList} notify={notify}/>}
        {page === 'Campus Pulse' && <CampusPulse eventsList={eventsList} setEventsList={setEventsList} assignments={assignments} setAssignments={setAssignments} notify={notify}/>}
        {page === 'SkillSwap' && <SkillSwap skills={skills} setSkills={setSkills} profile={profile} notify={notify}/>}
      </div>
      <footer className="footer"><span>Campus360 · Built for first-year life</span><span><span className="pulse-dot"/> Demo environment · Sample data</span></footer>
    </main>
    {logoutConfirm && <div className="modal-backdrop" onClick={() => setLogoutConfirm(false)}><div className="modal" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}><div className="modal-head"><div className="icon-box purple"><LogOut size={20}/></div><button className="icon-button" onClick={() => setLogoutConfirm(false)}><X size={18}/></button></div><h2>Log out of Campus360?</h2><p className="muted">Your locally saved timetable, assignments and preferences will remain on this device.</p><div className="modal-actions"><button className="secondary" onClick={() => setLogoutConfirm(false)}>Stay signed in</button><button className="primary" onClick={handleLogout}>Log out</button></div></div></div>}
    {showLogin && <div className="modal-backdrop" onClick={() => setShowLogin(false)}>
      <div className="modal" onClick={e => e.stopPropagation()}><div className="modal-head"><div className="icon-box purple"><LockKeyhole size={20}/></div><button className="icon-button" onClick={() => setShowLogin(false)}><X size={18}/></button></div><h2>{loggedIn ? 'Demo account' : 'Welcome to Campus360'}</h2><p className="muted">Sign in with your phone number. We’ll verify it using a one-time code.</p><label className="field-label">Student display name<input value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))}/></label><label className="field-label">Interests<input value={profile.interests} onChange={e => setProfile(p => ({ ...p, interests: e.target.value }))}/></label><label className="field-label">Subjects<input value={profile.subjects} onChange={e => setProfile(p => ({ ...p, subjects: e.target.value }))}/></label><button className="primary full" onClick={() => { if (loggedIn) { handleLogout(); } else { setLoggedIn(true); setShowLogin(false); notify('Demo profile saved.'); } }}>{loggedIn ? <><LogOut size={16}/> End demo session</> : <><ShieldCheck size={16}/> Continue in demo mode</>}</button><small className="warning-note">Phone verification is handled by the Campus360 server. Never share your OTP with anyone.</small></div></div>}
    {notice && <div className="toast" role="status" aria-live="polite"><Check size={17}/><span>{notice}</span><button type="button" className="toast-close" onClick={()=>setNotice('')} aria-label="Dismiss notification"><X size={15}/></button></div>}
  </div>
}

function Dashboard({ profile, setProfile, marksRows, rides, challenges, points, eventsList, navigate, notify, assignments }) {
  const pending = challenges.filter(c => !c.done).length
  const upcomingAssignments = [...assignments].sort((a,b) => a.due.localeCompare(b.due)).slice(0,3)
  const today = new Date(); today.setHours(0,0,0,0)
  const daysUntil = (date) => Math.ceil((new Date(`${date}T00:00:00`) - today) / 86400000)
  const recommendations = [
    { title: 'Review your academic targets', detail: 'Check the marks-needed table before your next assessment.', icon: Target, page: 'Academic Planner' },
    { title: 'Find a peer to learn with', detail: 'Exchange skills or set up a peer-learning session.', icon: Users, page: 'SkillSwap' },
    { title: 'Check what is happening on campus', detail: 'See events, registrations and campus notices.', icon: CalendarDays, page: 'Campus Pulse' },
  ]
  return <div className="page-stack dashboard-v3">
    <div className="welcome-row dash-compact-welcome"><div><div className="eyebrow"><Sparkles size={14}/> YOUR CAMPUS, CONNECTED</div><h1>Hey, {profile.name.split(' ')[0]} <span className="wave">✦</span></h1><p className="muted">Your academics, campus community and next opportunities in one place.</p></div><button className="secondary" onClick={() => notify('This prototype uses saved local data. Connect Supabase to refresh shared campus data.')}> <Activity size={16}/> Data status</button></div>
    <div className="stats-grid dashboard-stat-links">
      <button className="stat stat-clickable" onClick={() => navigate('Academic Planner')}><div className="stat-top"><span>Subjects tracked</span><span className="icon-box"><BookOpen size={18}/></span></div><strong>{marksRows.length}</strong><small>Open Academic Planner →</small></button>
      <button className="stat stat-clickable" onClick={() => navigate('Rides')}><div className="stat-top"><span>Open ride offers</span><span className="icon-box"><Bike size={18}/></span></div><strong>{rides.filter(r => r.status === 'Available').length}</strong><small>Explore campus rides →</small></button>
      <button className="stat stat-clickable" onClick={() => navigate('Challenges')}><div className="stat-top"><span>Challenges to try</span><span className="icon-box"><Trophy size={18}/></span></div><strong>{pending}</strong><small>View challenges →</small></button>
      <button className="stat stat-clickable" onClick={() => navigate('Campus Pulse')}><div className="stat-top"><span>Campus events</span><span className="icon-box"><CalendarDays size={18}/></span></div><strong>{eventsList.length}</strong><small>Explore campus pulse →</small></button>
    </div>
    <div className="dashboard-two-col">
      <section className="panel"><SectionTitle title="Upcoming assignment deadlines" sub="Plan ahead and avoid last-minute stress." action={<button className="text-button" onClick={() => notify('Assignment editing is available in the Campus Pulse section.')}>View all <ArrowRight size={14}/></button>}/>
        {upcomingAssignments.length ? <div className="assignment-list">{upcomingAssignments.map(a => <div className="assignment-row" key={a.id}><div className="assignment-date"><CalendarDays size={17}/><span>{new Date(`${a.due}T00:00:00`).toLocaleDateString('en-IN',{day:'2-digit',month:'short'})}</span></div><div className="assignment-copy"><b>{a.title}</b><small>{a.subject} · {daysUntil(a.due) < 0 ? 'Past due' : daysUntil(a.due) === 0 ? 'Due today' : `Due in ${daysUntil(a.due)} day(s)`}</small></div><Badge tone={a.priority === 'High' ? 'red' : a.priority === 'Medium' ? 'amber' : 'green'}>{a.priority}</Badge></div>)}</div> : <p className="muted">No upcoming deadlines. Add one in Campus Pulse.</p>}
        <button className="secondary assignment-add" onClick={() => navigate('Campus Pulse')}><Plus size={15}/> Manage deadlines and events</button>
      </section>
      <section className="panel"><SectionTitle title="Campus Pulse" sub="Upcoming events and student notices." action={<button className="text-button" onClick={() => navigate('Campus Pulse')}>Open <ArrowRight size={14}/></button>}/><div className="event-list">{eventsList.slice(0,3).map((ev,i)=><div className="event-row" key={ev.id || ev.name}><div className={`event-date ed-${i%3}`}><CalendarDays size={19}/><small>{['UP NEXT','SOON','EVENT'][i]}</small></div><div className="event-info"><b>{ev.name}</b><small>{ev.time}</small><Badge tone={ev.state === 'Live Now' ? 'green' : ev.state === 'Event Ended' ? 'slate' : ev.state === 'Starting Soon' ? 'amber' : 'purple'}>{ev.state}</Badge></div></div>)}</div></section>
    </div>
    <section className="panel"><SectionTitle title="Recommended for you" sub="Suggested next steps based on your campus features."/><div className="recommendation-grid">{recommendations.map(r=>{const Icon=r.icon;return <button className="recommendation-card" key={r.title} onClick={()=>navigate(r.page)}><span><Icon size={20}/></span><b>{r.title}</b><small>{r.detail}</small><em>Explore <ArrowRight size={14}/></em></button>})}</div></section>
    <section className="panel"><SectionTitle title="Campus shortcuts" sub="Go straight to the things you use most."/><div className="quick-grid"><button onClick={() => navigate('Rides')}><div className="quick-icon qi-blue"><Bike/></div><b>Campus Ride</b><small>Find or offer a ride.</small><ArrowRight size={16}/></button><button onClick={() => navigate('SkillSwap')}><div className="quick-icon qi-green"><Users/></div><b>Peer learning & SkillSwap</b><small>Teach, learn and connect.</small><ArrowRight size={16}/></button><button onClick={() => navigate('Challenges')}><div className="quick-icon qi-purple"><Trophy/></div><b>Challenges</b><small>Join community activities.</small><ArrowRight size={16}/></button><button onClick={() => navigate('Campus Guide')}><div className="quick-icon qi-amber"><MapPin/></div><b>Campus Directory</b><small>Find offices, clubs and services.</small><ArrowRight size={16}/></button><button onClick={() => navigate('Challenges')}><div className="quick-icon qi-purple"><Award/></div><b>Campus Credits</b><small>{points} points earned · View rewards and challenges.</small><ArrowRight size={16}/></button></div></section>
  </div>
}

function AcademicPlanner({ subjects, setSubjects, marksRows, targetSgpa, setTargetSgpa, totalCredits, targetReachable, updateSubject, activeTab, setActiveTab, notify }) {
  const [whatIf, setWhatIf] = useState(false);
  const [newName, setNewName] = useState('');
  const [semesterSgpas, setSemesterSgpas] = useState(() => read('c360_semester_sgpas', [
    { name: 'Semester 1', sgpa: '8.2', credits: '20' },
    { name: 'Semester 2', sgpa: '8.5', credits: '22' }
  ]));

  // --- What-If Simulator Live Controls ---
  const [simInternalBoost, setSimInternalBoost] = useState(4); // Extra internal marks (+0 to +15)
  const [simExternalExam, setSimExternalExam] = useState(65);   // Expected End-Sem marks (30 to 95)
  const [simMissedMarks, setSimMissedMarks] = useState(0);     // Penalty / missed assignments (-0 to -20)
  const [simTargetSemesterSgpa, setSimTargetSemesterSgpa] = useState('8.8'); // Projected semester SGPA

  // Standard grade point scale helper
  const getGradePoint = (totalMarks) => {
    const marks = Math.min(100, Math.max(0, totalMarks));
    if (marks >= 80) return { grade: 'O', points: 10 };
    if (marks >= 75) return { grade: 'A', points: 9 };
    if (marks >= 70) return { grade: 'B', points: 8 };
    if (marks >= 60) return { grade: 'C', points: 7 };
    if (marks >= 50) return { grade: 'D', points: 6 };
    if (marks >= 45) return { grade: 'E', points: 5 };
    if (marks >= 40) return { grade: 'P', points: 4 };
    return { grade: 'F', points: 0 };
  };

  // Base SGPA from current internals (assumes 60 base external)
  const baseSgpa = useMemo(() => {
    if (!subjects.length || totalCredits === 0) return 0;
    const earnedPoints = subjects.reduce((sum, s) => {
      const total = Number(s.internal || 0) + 60;
      return sum + Number(s.credits || 0) * getGradePoint(total).points;
    }, 0);
    return earnedPoints / totalCredits;
  }, [subjects, totalCredits]);

  // Projected SGPA calculated live from all What-If simulator conditions
  const projectedSgpa = useMemo(() => {
    if (!subjects.length || totalCredits === 0) return 0;
    const earnedPoints = subjects.reduce((sum, s) => {
      const projectedMarks = Math.min(
        100,
        Math.max(0, Number(s.internal || 0) + simInternalBoost - simMissedMarks + simExternalExam)
      );
      return sum + Number(s.credits || 0) * getGradePoint(projectedMarks).points;
    }, 0);
    return earnedPoints / totalCredits;
  }, [subjects, totalCredits, simInternalBoost, simExternalExam, simMissedMarks]);

  // Live Subjects meeting pass/cutoff criteria under simulation
  const projectedPassingCount = useMemo(() => {
    return subjects.filter(s => {
      const finalMarks = Number(s.internal || 0) + simInternalBoost - simMissedMarks + simExternalExam;
      return finalMarks >= Number(s.pass || 40) && finalMarks >= Number(s.cutoff || 40);
    }).length;
  }, [subjects, simInternalBoost, simExternalExam, simMissedMarks]);

  // Existing Cumulative CGPA from past semesters
  const pastCredits = semesterSgpas.reduce((sum, s) => sum + Number(s.credits || 0), 0);
  const pastPoints = semesterSgpas.reduce((sum, s) => sum + Number(s.sgpa || 0) * Number(s.credits || 0), 0);
  const currentCgpa = pastCredits > 0 ? pastPoints / pastCredits : 0;

  // Projected CGPA incorporating the What-If semester result
  const projectedCgpa = useMemo(() => {
    const totalSemCredits = pastCredits + totalCredits;
    if (totalSemCredits === 0) return 0;
    const totalCombinedPoints = pastPoints + (projectedSgpa * totalCredits);
    return totalCombinedPoints / totalSemCredits;
  }, [pastCredits, pastPoints, projectedSgpa, totalCredits]);

  // Projected CGPA if the user manually overrides their target SGPA
  const cgpaWithTargetSgpa = useMemo(() => {
    const semSgpaNum = Number(simTargetSemesterSgpa) || 0;
    const totalSemCredits = pastCredits + totalCredits;
    if (totalSemCredits === 0) return 0;
    return (pastPoints + (semSgpaNum * totalCredits)) / totalSemCredits;
  }, [pastCredits, pastPoints, simTargetSemesterSgpa, totalCredits]);

  const sgpaDiff = (projectedSgpa - baseSgpa).toFixed(2);
  const cgpaDiff = (projectedCgpa - currentCgpa).toFixed(2);

  function addSubject(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    setSubjects(old => [...old, { id: Date.now(), name: newName.trim(), credits: 3, internal: 20, cutoff: 40, pass: 40, target: 'B' }]);
    setNewName('');
    notify('Subject added.');
  }

  return (
    <div className="page-stack">
      <div className="welcome-row">
        <div>
          <div className="eyebrow"><GraduationCap size={14}/> ACADEMIC CONTROL CENTRE</div>
          <h1>Academic Planner</h1>
          <p className="muted">Forecast exam scores, simulate grading scenarios, and track CGPA progression in real time.</p>
        </div>
        <button
          className={`secondary ${whatIf ? 'selected' : ''}`}
          onClick={() => setWhatIf(!whatIf)}
          style={{ fontWeight: 700 }}
        >
          <Sparkles size={16}/> {whatIf ? 'Hide What-If Simulator' : 'Open What-If Simulator'}
        </button>
      </div>

      <div className="stats-grid three">
        <Stat label="Subjects Tracked" value={subjects.length} hint="Active semester load" icon={BookOpen}/>
        <Stat label="Total Credits" value={totalCredits} hint="Graded semester weight" icon={WalletCards}/>
        <Stat label="Indicative SGPA" value={baseSgpa.toFixed(2)} hint="Baseline without boosts" icon={Target}/>
      </div>

      {/* ====================================================================
          EXPANDED MULTI-SCENARIO WHAT-IF SIMULATOR
          ==================================================================== */}
      {whatIf && (
        <section className="panel whatif-container" style={{ border: '1.5px solid var(--primary-border)', background: 'var(--bg-surface)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <Badge tone="purple"><Sparkles size={12}/> LIVE WHAT-IF ENGINE</Badge>
              <h2 style={{ fontSize: '18px', fontWeight: 800, margin: '6px 0 2px' }}>Interactive Academic Simulator</h2>
              <p className="muted" style={{ fontSize: '12px', margin: 0 }}>
                Adjust test performances and expected exam marks below. All outcomes calculate live without affecting your saved marks.
              </p>
            </div>
            <button
              className="secondary compact"
              onClick={() => {
                setSimInternalBoost(0);
                setSimExternalExam(60);
                setSimMissedMarks(0);
                setSimTargetSemesterSgpa('8.5');
              }}
            >
              Reset Scenarios
            </button>
          </div>

          <div className="whatif-simulator-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: '20px' }}>
            
            {/* Column 1: Scenarios & Condition Sliders */}
            <div style={{ display: 'grid', gap: '16px' }}>
              
              {/* Scenario 1 */}
              <div className="whatif-card" style={{ padding: '14px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-surface-alt)', border: '1px solid var(--border-base)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700 }}>1. End-Sem External Score</span>
                  <strong style={{ color: 'var(--primary)', fontSize: '14px' }}>{simExternalExam} / 100</strong>
                </div>
                <input
                  type="range"
                  min="30"
                  max="95"
                  step="1"
                  value={simExternalExam}
                  onChange={e => setSimExternalExam(Number(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--primary)' }}
                />
                <small className="muted" style={{ fontSize: '11px', display: 'block', marginTop: '4px' }}>
                  Simulates average performance across external theory examinations.
                </small>
              </div>

              {/* Scenario 2 */}
              <div className="whatif-card" style={{ padding: '14px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-surface-alt)', border: '1px solid var(--border-base)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700 }}>2. Internal Assessment Boost</span>
                  <strong style={{ color: 'var(--success-text)', fontSize: '14px' }}>+{simInternalBoost} marks</strong>
                </div>
                <input
                  type="range"
                  min="0"
                  max="15"
                  step="1"
                  value={simInternalBoost}
                  onChange={e => setSimInternalBoost(Number(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--success)' }}
                />
                <small className="muted" style={{ fontSize: '11px', display: 'block', marginTop: '4px' }}>
                  Marks gained if you improve internal test scores or project submissions.
                </small>
              </div>

              {/* Scenario 3 */}
              <div className="whatif-card" style={{ padding: '14px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-surface-alt)', border: '1px solid var(--border-base)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700 }}>3. Missed Assignment / Attendance Risk</span>
                  <strong style={{ color: simMissedMarks > 0 ? 'var(--danger-text)' : 'var(--text-muted)', fontSize: '14px' }}>
                    {simMissedMarks > 0 ? `-${simMissedMarks} marks` : 'None (0)'}
                  </strong>
                </div>
                <input
                  type="range"
                  min="0"
                  max="20"
                  step="2"
                  value={simMissedMarks}
                  onChange={e => setSimMissedMarks(Number(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--danger)' }}
                />
                <small className="muted" style={{ fontSize: '11px', display: 'block', marginTop: '4px' }}>
                  Simulates penalties from missed lab submissions or lower attendance.
                </small>
              </div>

              {/* Scenario 4 */}
              <div className="whatif-card" style={{ padding: '14px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-surface-alt)', border: '1px solid var(--border-base)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700 }}>4. Semester Goal Target</span>
                  <strong style={{ color: 'var(--primary)', fontSize: '14px' }}>{simTargetSemesterSgpa} SGPA</strong>
                </div>
                <input
                  type="number"
                  min="4.0"
                  max="10.0"
                  step="0.05"
                  value={simTargetSemesterSgpa}
                  onChange={e => setSimTargetSemesterSgpa(e.target.value)}
                  style={{ width: '100%', padding: '6px 10px', fontSize: '13px' }}
                />
                <small className="muted" style={{ fontSize: '11px', display: 'block', marginTop: '4px' }}>
                  Quick projection: If you secure this SGPA, resulting CGPA is <b>{cgpaWithTargetSgpa.toFixed(2)}</b>.
                </small>
              </div>

            </div>

            {/* Column 2: Live Outcome Summary Card */}
            <div
              className="whatif-live-summary"
              style={{
                background: 'var(--primary-subtle)',
                border: '1.5px solid var(--primary-border)',
                borderRadius: 'var(--radius-md)',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '16px'
              }}
            >
              <div>
                <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--primary-text)' }}>
                  Live Projection Outcomes
                </span>
                
                {/* Projected SGPA */}
                <div style={{ marginTop: '12px' }}>
                  <small style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Projected Semester SGPA</small>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                    <strong style={{ fontSize: '36px', fontWeight: 800, color: 'var(--primary)' }}>
                      {projectedSgpa.toFixed(2)}
                    </strong>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: Number(sgpaDiff) >= 0 ? 'var(--success-text)' : 'var(--danger-text)' }}>
                      {Number(sgpaDiff) >= 0 ? `+${sgpaDiff}` : sgpaDiff} vs baseline
                    </span>
                  </div>
                </div>

                {/* Projected CGPA */}
                <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid var(--primary-border)' }}>
                  <small style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Cumulative Degree CGPA</small>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                    <strong style={{ fontSize: '32px', fontWeight: 800, color: 'var(--text-main)' }}>
                      {projectedCgpa.toFixed(2)}
                    </strong>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: Number(cgpaDiff) >= 0 ? 'var(--success-text)' : 'var(--danger-text)' }}>
                      {Number(cgpaDiff) >= 0 ? `+${cgpaDiff}` : cgpaDiff} impact
                    </span>
                  </div>
                  <small style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Calculated over {pastCredits + totalCredits} total credits across all semesters.
                  </small>
                </div>

                {/* Cutoff Met */}
                <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid var(--primary-border)' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                    Subjects Meeting Minimum Passing Criteria:
                  </span>
                  <div style={{ marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Badge tone={projectedPassingCount === subjects.length ? 'green' : 'amber'}>
                      {projectedPassingCount} of {subjects.length} subjects clear
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Subject Breakdown Pill List */}
              <div style={{ background: 'var(--bg-surface)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-base)' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>PROJECTED GRADES:</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                  {subjects.map(s => {
                    const total = Math.min(100, Math.max(0, Number(s.internal || 0) + simInternalBoost - simMissedMarks + simExternalExam));
                    const gp = getGradePoint(total);
                    return (
                      <span key={s.id} style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '4px', background: 'var(--bg-surface-alt)', border: '1px solid var(--border-base)' }}>
                        <b>{s.name}:</b> <span style={{ color: gp.grade === 'F' ? 'var(--danger-text)' : 'var(--primary)', fontWeight: 700 }}>{gp.grade} ({total})</span>
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>

          </div>
        </section>
      )}

      {/* Tabs Row */}
      <div className="tab-row">
        <button className={activeTab === 'Planner' ? 'active' : ''} onClick={() => setActiveTab('Planner')}>Marks planner</button>
        <button className={activeTab === 'SGPA' ? 'active' : ''} onClick={() => setActiveTab('SGPA')}>Target SGPA</button>
        <button className={activeTab === 'Profile' ? 'active' : ''} onClick={() => setActiveTab('Profile')}>Subjects & credits</button>
        <button className={activeTab === 'CGPA' ? 'active' : ''} onClick={() => setActiveTab('CGPA')}>CGPA calculator</button>
      </div>

      {/* Planner Table */}
      {activeTab === 'Planner' && (
        <section className="panel">
          <SectionTitle title="Marks-needed table" sub="Target cutoffs vs current internal marks."/>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Credits</th>
                  <th>Internal</th>
                  <th>Target cutoff</th>
                  <th>Marks needed</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {marksRows.map(s => (
                  <tr key={s.id}>
                    <td><b>{s.name}</b><small className="cell-sub">Pass minimum: {s.pass}</small></td>
                    <td>{s.credits}</td>
                    <td>{s.internal}</td>
                    <td>{s.cutoff}</td>
                    <td><b>{s.needed}</b> / 100</td>
                    <td>
                      {s.locked ? <Badge tone="red">Grade locked</Badge> : s.needed > 100 - s.internal ? <Badge tone="amber">At risk</Badge> : <Badge tone="green">Possible</Badge>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="table-note">
            <CircleHelp size={15}/> Illustrative grading calculator based on university grade-point tables.
          </div>
        </section>
      )}

      {/* Target SGPA Check */}
      {activeTab === 'SGPA' && (
        <section className="panel">
          <SectionTitle title="Target SGPA check" sub="Set a target and review feasibility against your credit load."/>
          <div className="sgpa-layout" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            <div className="target-card" style={{ padding: '20px', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface-alt)', border: '1px solid var(--border-base)' }}>
              <label className="field-label">
                Your target SGPA
                <input type="number" min="0" max="10" step=".1" value={targetSgpa} onChange={e => setTargetSgpa(e.target.value)}/>
              </label>
              <div className="big-number" style={{ fontSize: '36px', fontWeight: 800, color: 'var(--primary)', margin: '14px 0 6px' }}>
                {Number(targetSgpa || 0).toFixed(1)}<small style={{ fontSize: '14px', color: 'var(--text-muted)' }}> / 10</small>
              </div>
              <p className="muted" style={{ fontSize: '12px' }}>
                Based on your {subjects.length} enrolled subjects and {totalCredits} semester credits.
              </p>
            </div>
            <div className="feasibility" style={{ padding: '20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-base)' }}>
              <div className="feasibility-icon" style={{ marginBottom: '12px' }}><Target size={24} color="var(--primary)"/></div>
              <Badge tone={targetReachable && Number(targetSgpa) <= 10 ? 'green' : 'red'}>
                {targetReachable && Number(targetSgpa) <= 10 ? 'Potentially achievable' : 'Target unreachable with current internals'}
              </Badge>
              <h3 style={{ margin: '10px 0 6px' }}>
                {targetReachable && Number(targetSgpa) <= 10 ? 'Keep working towards it.' : 'Review your target cutoff.'}
              </h3>
              <p className="muted" style={{ fontSize: '12px' }}>
                Considers required external passing thresholds across all enrolled courses.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* CGPA Calculator */}
      {activeTab === 'CGPA' && (
        <section className="panel">
          <SectionTitle title="Cumulative CGPA Calculator" sub="Manage previous semesters to calculate credit-weighted degree CGPA."/>
          <div className="cgpa-summary" style={{ padding: '16px 20px', borderRadius: 'var(--radius-sm)', background: 'var(--primary-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <span style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>Cumulative Degree CGPA</span>
            <strong style={{ fontSize: '28px', color: 'var(--primary)', fontWeight: 800 }}>
              {currentCgpa.toFixed(2)} <small style={{ fontSize: '14px', color: 'var(--text-muted)' }}>/ 10</small>
            </strong>
          </div>
          <div className="semester-list" style={{ display: 'grid', gap: '10px' }}>
            {semesterSgpas.map((s, i) => (
              <div className="semester-row" key={i} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr)) auto', gap: '10px', alignItems: 'end', padding: '12px', background: 'var(--bg-surface-alt)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-base)' }}>
                <label className="field-label">Semester<input value={s.name} onChange={e => setSemesterSgpas(old => old.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}/></label>
                <label className="field-label">SGPA<input type="number" min="0" max="10" step="0.01" value={s.sgpa} onChange={e => setSemesterSgpas(old => old.map((x, j) => j === i ? { ...x, sgpa: e.target.value } : x))}/></label>
                <label className="field-label">Credits<input type="number" min="1" value={s.credits} onChange={e => setSemesterSgpas(old => old.map((x, j) => j === i ? { ...x, credits: e.target.value } : x))}/></label>
                <button className="secondary compact" onClick={() => setSemesterSgpas(old => old.filter((_, j) => j !== i))}>Remove</button>
              </div>
            ))}
          </div>
          <div className="modal-actions">
            <button className="secondary" onClick={() => setSemesterSgpas(old => [...old, { name: `Semester ${old.length + 1}`, sgpa: '8.0', credits: '20' }])}>
              <Plus size={15}/> Add Semester
            </button>
            <button className="primary" onClick={() => { save('c360_semester_sgpas', semesterSgpas); notify('CGPA inputs saved.'); }}>
              Save CGPA Data
            </button>
          </div>
        </section>
      )}

      {/* Subjects & Credits Editor */}
      {activeTab === 'Profile' && (
        <section className="panel">
          <SectionTitle title="Subjects & Credits" sub="Configure credits, internal marks, and target cutoffs."/>
          <div className="subject-editor" style={{ display: 'grid', gap: '10px' }}>
            {subjects.map(s => (
              <div className="subject-edit-row" key={s.id} style={{ display: 'grid', gridTemplateColumns: '1.2fr repeat(3, 1fr)', gap: '10px', alignItems: 'center', padding: '12px', background: 'var(--bg-surface-alt)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-base)' }}>
                <b>{s.name}</b>
                <label className="field-label">Credits<input type="number" min="1" max="10" value={s.credits} onChange={e => updateSubject(s.id, 'credits', e.target.value)}/></label>
                <label className="field-label">Internal<input type="number" min="0" max="100" value={s.internal} onChange={e => updateSubject(s.id, 'internal', e.target.value)}/></label>
                <label className="field-label">Cutoff<input type="number" min="0" max="100" value={s.cutoff} onChange={e => updateSubject(s.id, 'cutoff', e.target.value)}/></label>
              </div>
            ))}
          </div>
          <form className="inline-form" onSubmit={addSubject} style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="New subject name (e.g., Engineering Mechanics)" required/>
            <button className="primary" style={{ whiteSpace: 'nowrap' }}><Plus size={16}/> Add Subject</button>
          </form>
        </section>
      )}

    </div>
  );
}

const rideMarkerIcon = L.divIcon({ className: 'ride-map-marker', html: '<span></span>', iconSize: [22,22], iconAnchor: [11,11] })
function Rides({ rides, requestRide, updateRideRequest, profile, newRide, setNewRide, addRide, search }) {
  const [showForm, setShowForm] = useState(false)
  const filtered = rides.filter(r => `${r.from} ${r.to} ${r.driver}`.toLowerCase().includes(search.toLowerCase()))
  return <div className="page-stack"><div className="welcome-row"><div><div className="eyebrow"><Bike size={14}/> CAMPUS MOBILITY</div><h1>Get there together.</h1><p className="muted">Discover student rides and coordinate your commute.</p></div><button className="primary" onClick={() => setShowForm(true)}><Plus size={16}/> Offer a ride</button></div>
    <div className="stats-grid three"><Stat label="Listed rides" value={rides.length} hint="Student ride offers" icon={Bike}/><Stat label="Available seats" value={rides.filter(r => r.status === 'Available').reduce((n,r)=>n+Number(r.seats||0),0)} hint="Across available rides" icon={Users}/><Stat label="Pending requests" value={rides.filter(r => r.status === 'Requested').length} hint="Prototype requests" icon={Clock3}/></div>
    <section className="panel"><SectionTitle title="Campus and pickup map" sub="OpenStreetMap · Leaflet. Markers are approximate demo pickup locations."/><div className="leaflet-map-wrap"><MapContainer center={[19.0445,72.8992]} zoom={13} scrollWheelZoom={false} style={{height:'330px',width:'100%'}}><TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/><Marker position={[19.0445,72.8992]} icon={rideMarkerIcon}><Popup>VESIT campus area (approximate)</Popup></Marker>{filtered.map((r,i)=><Marker key={r.id} position={[Number(r.lat || (19.0445+(i+1)*0.002)),Number(r.lng || (72.8992+(i+1)*0.002))]} icon={rideMarkerIcon}><Popup><b>{r.from} → {r.to}</b><br/>{r.time}<br/>Offered by {r.driver}</Popup></Marker>)}</MapContainer></div><p className="map-disclaimer">For privacy, the map uses approximate points. Do not publish live student location or personal contact details.</p></section>
    <section className="panel"><SectionTitle title="Available student rides" sub="Student verification is a prototype status only; identity verification is not connected yet."/><div className="ride-list">{filtered.map(r=><div className="panel ride-card" key={r.id}><div className="ride-icon"><Bike size={23}/></div><div className="ride-main"><div className="ride-route"><b>{r.from}</b><ArrowRight size={15}/><b>{r.to}</b></div><p><Clock3 size={14}/>{r.time}<span className="separator">·</span><Users size={14}/>{r.seats} seats <span className="separator">·</span>Offered by {r.driver}</p><div className="ride-meta"><Badge tone="blue">{r.vehicleType || 'Vehicle not specified'}</Badge><Badge tone="amber">{r.paymentMode || 'Payment to be agreed'}</Badge>{r.fare!==undefined && r.fare!=='' && <Badge>₹{r.fare}</Badge>}</div><div className="ride-meta"><Badge tone={r.status === 'Available' ? 'green' : r.status === 'Requested' ? 'amber' : 'purple'}>{r.status}</Badge><Badge tone="green"><ShieldCheck size={12}/> {r.verified ? 'Profile checked (demo)' : 'Verification pending'}</Badge></div></div><button className={r.status === 'Available' ? 'primary' : 'secondary'} disabled={r.status !== 'Available'} onClick={() => requestRide(r.id)}>{r.status === 'Available' ? 'Request seat' : 'Request sent'}<ArrowRight size={15}/></button>{r.driver===profile.name && (r.requests||[]).length>0 && <div className="ride-requests"><b>Incoming requests</b>{r.requests.map(q=><div className="ride-request-row" key={q.id}><span>{q.requester} · <strong>{q.status}</strong></span>{q.status==='Pending' && <span className="request-actions"><button className="primary compact" onClick={()=>updateRideRequest(r.id,q.id,'Accepted')}>Accept</button><button className="secondary compact" onClick={()=>updateRideRequest(r.id,q.id,'Rejected')}>Reject</button></span>}</div>)}</div>}</div>)}</div></section>
    {showForm && <div className="modal-backdrop" onClick={() => setShowForm(false)}><div className="modal modal-wide" role="dialog" aria-modal="true" aria-labelledby="ride-modal-title" onClick={e => e.stopPropagation()}><div className="modal-head"><div><h2 id="ride-modal-title">Offer a campus ride</h2><p className="muted">Add route details for other students.</p></div><button className="icon-button" onClick={() => setShowForm(false)} aria-label="Close"><X size={18}/></button></div><form className="ride-form" onSubmit={e=>{addRide(e);setShowForm(false)}}><label className="field-label">Pickup point<input value={newRide.from} onChange={e=>setNewRide({...newRide,from:e.target.value})} placeholder="e.g. Chembur Station" required/></label><label className="field-label">Destination<input value={newRide.to} onChange={e=>setNewRide({...newRide,to:e.target.value})} placeholder="e.g. VESIT campus" required/></label><label className="field-label">Departure time<input value={newRide.time} onChange={e=>setNewRide({...newRide,time:e.target.value})} placeholder="e.g. 8:30 AM" required/></label><label className="field-label">Available seats<input type="number" min="1" max="8" value={newRide.seats} onChange={e=>setNewRide({...newRide,seats:e.target.value})} required/></label><label className="field-label">Vehicle type<select value={newRide.vehicleType} onChange={e=>setNewRide({...newRide,vehicleType:e.target.value})} required><option>Car</option><option>Bike</option><option>Scooter</option><option>Auto-rickshaw</option><option>Public transport</option><option>Other</option></select></label><label className="field-label">Payment method<select value={newRide.paymentMode} onChange={e=>setNewRide({...newRide,paymentMode:e.target.value})} required><option>Pay before ride</option><option>Meterwise</option><option>Free / sharing costs</option><option>Pay after ride</option></select></label><label className="field-label">Expected fare (₹, optional)<input type="number" min="0" value={newRide.fare} onChange={e=>setNewRide({...newRide,fare:e.target.value})} placeholder="e.g. 80"/></label><label className="field-label">Pickup latitude (optional)<input type="number" step="any" value={newRide.lat || ''} onChange={e=>setNewRide({...newRide,lat:e.target.value})} placeholder="Approximate map latitude"/></label><label className="field-label">Pickup longitude (optional)<input type="number" step="any" value={newRide.lng || ''} onChange={e=>setNewRide({...newRide,lng:e.target.value})} placeholder="Approximate map longitude"/></label><div className="ride-verification-note"><ShieldCheck size={16}/> Student verification is not connected to a college identity provider yet. Listings are marked as demo profiles.</div><div className="modal-actions"><button type="button" className="secondary" onClick={()=>setShowForm(false)}>Cancel</button><button className="primary" type="submit">Publish ride <ArrowRight size={16}/></button></div></form></div></div>}
  </div>
  url: 'https://rail.vesit.ves.ac.in/'
}

function Timetable({ timetable, setTimetable, notify }) {
  const [fileName, setFileName] = useState(() => read('c360_timetable_filename', ''));
  const [selectedBranch, setSelectedBranch] = useState(() => read('c360_timetable_selected_branch', 'D2A'));
  const [rows, setRows] = useState(() => read('c360_timetable_rows', []));
  
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  async function upload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      if (!workbook.SheetNames || !workbook.SheetNames.length) {
        throw new Error('Workbook contains no sheets.');
      }

      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      // Convert sheet to a flat 2D matrix of strings
      const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
      if (!matrix || !matrix.length) {
        throw new Error('Spreadsheet appears to be empty.');
      }

      const dayNames = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];
      const dayLabels = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
      
      const groupACols = [1, 2, 3, 4, 5, 6];      // Columns B through G
      const groupBCols = [9, 10, 11, 12, 13, 14]; // Columns J through O

      let currentDay = '';
      let currentDivMap = {};
      const parsedEntries = [];
      const discoveredBranches = new Set();

      for (let rIdx = 0; rIdx < matrix.length; rIdx++) {
        const row = matrix[rIdx] || [];
        const cellA = String(row[0] || '').trim().toUpperCase();
        const cellI = String(row[8] || '').trim().toUpperCase();

        // 1. Detect if this row is a Day Header (e.g., MONDAY, TUESDAY...)
        let matchedDay = '';
        for (let d = 0; d < dayNames.length; d++) {
          if (cellA.includes(dayNames[d]) || cellI.includes(dayNames[d])) {
            matchedDay = dayLabels[d];
            break;
          }
        }

        if (matchedDay) {
          currentDay = matchedDay;
          // The very next row has the division codes (D2A, D1ADA, etc.)
          const divRow = matrix[rIdx + 1] || [];
          currentDivMap = {};

          [...groupACols, ...groupBCols].forEach(colIdx => {
            const rawHeader = String(divRow[colIdx] || '').replace(/\n/g, ' ').trim();
            if (rawHeader) {
              const divMatch = rawHeader.match(/\b(D\d+[A-Za-z]*)\b/i);
              const divName = divMatch ? divMatch[1].toUpperCase() : rawHeader.split(/\s+/)[0].toUpperCase();
              const roomMatch = rawHeader.match(/\b([B\d]{2,4})\b/);
              const room = roomMatch ? roomMatch[1] : '';

              currentDivMap[colIdx] = { div: divName, room };
              discoveredBranches.add(divName);
            }
          });
          continue;
        }

        // 2. If inside a Day block, parse lecture rows
        if (currentDay && Object.keys(currentDivMap).length > 0) {
          const timeA = String(row[0] || '').trim().replace(/\s+/g, ' ');
          const timeB = String(row[8] || '').trim().replace(/\s+/g, ' ');

          const isTimeSlot = (t) => (t.includes('AM') || t.includes('PM') || t.includes(':')) && !t.toUpperCase().includes('BREAK');

          if (isTimeSlot(timeA) || isTimeSlot(timeB)) {
            // Read Group A columns
            groupACols.forEach(colIdx => {
              if (currentDivMap[colIdx] && colIdx < row.length) {
                const val = String(row[colIdx] || '').trim();
                if (val && val.toUpperCase() !== 'BREAK' && val.length >= 2) {
                  parsedEntries.push({
                    id: `${currentDay}-${currentDivMap[colIdx].div}-${rIdx}-${colIdx}-${Math.random()}`,
                    day: currentDay,
                    time: timeA || 'Class Slot',
                    branch: currentDivMap[colIdx].div,
                    room: currentDivMap[colIdx].room,
                    subject: val
                  });
                }
              }
            });

            // Read Group B columns
            groupBCols.forEach(colIdx => {
              if (currentDivMap[colIdx] && colIdx < row.length) {
                const val = String(row[colIdx] || '').trim();
                if (val && val.toUpperCase() !== 'BREAK' && val.length >= 2) {
                  parsedEntries.push({
                    id: `${currentDay}-${currentDivMap[colIdx].div}-${rIdx}-${colIdx}-${Math.random()}`,
                    day: currentDay,
                    time: timeB || timeA || 'Class Slot',
                    branch: currentDivMap[colIdx].div,
                    room: currentDivMap[colIdx].room,
                    subject: val
                  });
                }
              }
            });
          }
        }
      }

      if (!parsedEntries.length) {
        throw new Error('Could not identify schedule entries. Please ensure the timetable sheet is formatted with standard day and division headers.');
      }

      const branchList = [...discoveredBranches].sort();
      const defaultBranch = branchList.includes('D2A') ? 'D2A' : (branchList[0] || 'All');

      setRows(parsedEntries);
      save('c360_timetable_rows', parsedEntries);

      setSelectedBranch(defaultBranch);
      save('c360_timetable_selected_branch', defaultBranch);

      setFileName(file.name);
      save('c360_timetable_filename', file.name);

      notify(`Loaded timetable! Found ${branchList.length} divisions (${branchList.join(', ')}) with ${parsedEntries.length} lectures.`);
    } catch (err) {
      notify(err.message || 'Error processing spreadsheet.');
    }
    e.target.value = '';
  }

  const branchOptions = useMemo(() => {
    return [...new Set(rows.map(r => r.branch).filter(Boolean))].sort();
  }, [rows]);

  const filteredSchedule = useMemo(() => {
    return rows.filter(r => selectedBranch === 'All' || r.branch === selectedBranch);
  }, [rows, selectedBranch]);

  function handleBranchChange(b) {
    setSelectedBranch(b);
    save('c360_timetable_selected_branch', b);
  }

  return (
    <div className="page-stack">
      <div className="welcome-row">
        <div>
          <div className="eyebrow"><CalendarDays size={14}/> FIRST YEAR SCHEDULE</div>
          <h1>Online Timetable</h1>
          <p className="muted">Upload your FE timetable spreadsheet to view your division's classes from Monday to Friday.</p>
        </div>
        {rows.length > 0 && <Badge tone="purple">{filteredSchedule.length} lectures scheduled</Badge>}
      </div>

      <section className="panel timetable-control-panel">
        <div className="timetable-top-controls">
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '4px' }}>Import Spreadsheet</h2>
            <p className="muted" style={{ fontSize: '12px', marginTop: 0 }}>
              VESIT FE Timetable (.xlsx, .xls)
            </p>
            <label className="primary upload-label" style={{ marginTop: '10px' }}>
              <Plus size={15}/> Choose File
              <input type="file" accept=".xlsx,.xls,.csv" onChange={upload} hidden/>
            </label>
            {fileName && (
              <small className="upload-success" style={{ display: 'block', marginTop: '8px', color: 'var(--success-text)' }}>
                Active: <b>{fileName}</b>
              </small>
            )}
          </div>

          <div className="branch-selector-box">
            <label className="field-label" style={{ fontWeight: 700 }}>
              Select Division
              <select
                value={selectedBranch}
                onChange={e => handleBranchChange(e.target.value)}
                disabled={!branchOptions.length}
                style={{ minWidth: '220px', height: '40px', marginTop: '4px' }}
              >
                {branchOptions.length > 1 && <option value="All">All Divisions (Overview)</option>}
                {branchOptions.map(b => (
                  <option key={b} value={b}>Division {b}</option>
                ))}
                {!branchOptions.length && <option value="All">Upload timetable to choose division</option>}
              </select>
            </label>
          </div>
        </div>
      </section>

      {/* Monday - Friday Schedule Cards */}
      <div className="timetable-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        {days.map(day => {
          const dayItems = filteredSchedule.filter(r => r.day === day);

          return (
            <section className="panel day-card" key={day} style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="day-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid var(--border-base)', paddingBottom: '8px' }}>
                <h2 style={{ fontSize: '15px', margin: 0 }}>{day}</h2>
                <Badge tone={dayItems.length ? 'purple' : 'slate'}>{dayItems.length} {dayItems.length === 1 ? 'class' : 'classes'}</Badge>
              </div>

              {dayItems.length > 0 ? (
                <div style={{ display: 'grid', gap: '10px' }}>
                  {dayItems.map(item => (
                    <div
                      className="timetable-item"
                      key={item.id}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'var(--bg-surface-alt)',
                        borderLeft: '3px solid var(--primary)',
                        display: 'grid',
                        gap: '4px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong style={{ fontSize: '11px', color: 'var(--primary)' }}>{item.time}</strong>
                        {item.room && (
                          <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <MapPin size={11}/> Classroom {item.room}
                          </span>
                        )}
                      </div>
                      <b style={{ fontSize: '12px', color: 'var(--text-main)', lineHeight: 1.4, whiteSpace: 'pre-line' }}>{item.subject}</b>
                      {selectedBranch === 'All' && (
                        <small style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Div {item.branch}</small>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="muted" style={{ fontSize: '12px', textAlign: 'center', margin: 'auto 0', padding: '24px 0' }}>
                  No classes scheduled
                </p>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
function Challenges({ challenges, points, newChallenge, setNewChallenge, addChallenge, toggleChallenge }) {
  const [showPost, setShowPost] = useState(false)
  const [detailChallenge, setDetailChallenge] = useState(null)
  const [form, setForm] = useState({title:'',description:'',className:'All VESIT students',points:25,contact:'',category:'Community'})
  const [role, setRole] = useState(() => read('c360_demo_role','Student'))
  const [adminCode, setAdminCode] = useState('')
  const [adminError, setAdminError] = useState('')
  const canPost = ['Cultural Representative','Class Representative','Club Admin'].includes(role)
  const ranking = [{name:'Aarav M.',points:180},{name:'You',points},{name:'Sana K.',points:115}].sort((a,b)=>b.points-a.points)
  function submitChallenge(e) { e.preventDefault(); if(!canPost) return; const item={id:Date.now(),title:form.title.trim(),description:form.description.trim(),className:form.className,points:Number(form.points),contact:form.contact.trim(),category:form.category,done:false,status:'Pending approval',createdBy:role}; addChallenge({preventDefault(){}}); setNewChallenge(form.title.trim()); const event = new Event('submit'); void event; window.dispatchEvent(new CustomEvent('campus360-challenge-create',{detail:item})); setShowPost(false); setForm({title:'',description:'',className:'All VESIT students',points:25,contact:'',category:'Community'}); }
  return <div className="page-stack"><div className="welcome-row"><div><div className="eyebrow"><Trophy size={14}/> CAMPUS COMMUNITY</div><h1>Challenges that bring us together.</h1><p className="muted">Join campus activities, help your peers and earn points.</p></div><Badge tone="purple"><Trophy size={15}/> {points} points earned</Badge></div>
    <section className="panel"><SectionTitle title="Challenge board" sub="Open a challenge to read the details. New posts require a representative role." action={<button className="primary" onClick={()=>setShowPost(true)}><Plus size={15}/> Post challenge</button>}/><div className="challenge-role-row"><label className="field-label">Prototype role preview<select value={role} onChange={e=>{setRole(e.target.value);save('c360_demo_role',e.target.value)}}><option>Student</option><option>Class Representative</option><option>Cultural Representative</option><option>Club Admin</option></select></label><p className="muted">Role selector is for demonstration only; production must verify roles server-side.</p></div><div className="challenge-list">{challenges.map(c=><div className={`challenge-row ${c.done?'completed':''}`} key={c.id}><button className={`check-circle ${c.done?'checked':''}`} onClick={()=>toggleChallenge(c.id)} aria-label={c.done?'Mark incomplete':'Complete challenge'}>{c.done&&<Check size={16}/>}</button><div className="challenge-info"><b>{c.title}</b><small>{c.className || 'All VESIT students'} · {c.category || 'Community'}</small></div><Badge tone={c.done?'green':c.status==='Pending approval'?'amber':'purple'}>{c.done?'Completed':c.status || 'Open'}</Badge><strong className="points">+{c.points} pts</strong><button className="secondary compact" onClick={()=>setDetailChallenge(c)}>View challenge</button></div>)}</div></section>
    <section className="panel"><SectionTitle title="Class leaderboard" sub="Sample points for demonstration."/><div className="leaderboard">{ranking.map((r,i)=><div className="leader-row" key={r.name}><div className={`rank rank-${i+1}`}>{i+1}</div><div className="avatar small">{r.name.split(' ').map(x=>x[0]).join('')}</div><b>{r.name}</b><strong>{r.points} pts</strong></div>)}</div></section>
    {showPost&&<div className="modal-backdrop" onClick={()=>setShowPost(false)}><div className="modal modal-wide" role="dialog" aria-modal="true" onClick={e=>e.stopPropagation()}><div className="modal-head"><div><h2>Post a challenge</h2><p className="muted">Only class reps, cultural reps and club admins should publish official challenges.</p></div><button className="icon-button" onClick={()=>setShowPost(false)}><X size={18}/></button></div>{!canPost?<div className="role-gate"><ShieldCheck size={24}/><b>Representative access required</b><p>Choose a representative role and enter the demo admin code to post a challenge.</p><label className="field-label">Demo admin code<input type="password" value={adminCode} onChange={e=>setAdminCode(e.target.value)} placeholder="Enter 12345"/></label><button type="button" className="primary" onClick={()=>{if(adminCode==='12345'){setRole('Class Representative');save('c360_demo_role','Class Representative');setAdminError('')}else setAdminError('Incorrect code. Use demo code 12345.')}}>Unlock posting</button>{adminError&&<p className="admin-error">{adminError}</p>}</div>:<form className="modal-form" onSubmit={e=>{e.preventDefault();if(adminCode!=='12345'){setAdminError('Incorrect admin code. Use demo code 12345.');return;}const item={id:Date.now(),title:form.title.trim(),description:form.description.trim(),className:form.className,points:Number(form.points),contact:form.contact.trim(),category:form.category,done:false,status:'Pending approval',createdBy:role};window.dispatchEvent(new CustomEvent('campus360-challenge-create',{detail:item}));setShowPost(false);setAdminCode('');setAdminError('');setForm({title:'',description:'',className:'All VESIT students',points:25,contact:'',category:'Community'});}}><label className="field-label">Challenge title<input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} required maxLength={90}/></label><label className="field-label">Short description<textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} required rows={3} placeholder="What should participants do?"/></label><div className="form-two"><label className="field-label">Target group<input value={form.className} onChange={e=>setForm({...form,className:e.target.value})} required/></label><label className="field-label">Category<select value={form.category} onChange={e=>setForm({...form,category:e.target.value})}><option>Community</option><option>Cultural</option><option>Academic</option><option>Sports</option><option>Sustainability</option></select></label></div><div className="form-two"><label className="field-label">Credit points<input type="number" min="0" max="500" value={form.points} onChange={e=>setForm({...form,points:e.target.value})} required/></label><label className="field-label">Contact person / role<input value={form.contact} onChange={e=>setForm({...form,contact:e.target.value})} placeholder="e.g. Cultural Secretary" required/></label></div><label className="field-label">Admin code <small>Demo code: 12345</small><input type="password" value={adminCode} onChange={e=>setAdminCode(e.target.value)} placeholder="Enter demo code" required/></label>{adminError&&<p className="admin-error">{adminError}</p>}<div className="modal-actions"><button type="button" className="secondary" onClick={()=>setShowPost(false)}>Cancel</button><button type="submit" className="primary">Submit for review <ArrowRight size={15}/></button></div></form>}</div></div>}
    {detailChallenge&&<div className="modal-backdrop" onClick={()=>setDetailChallenge(null)}><div className="modal" role="dialog" aria-modal="true" onClick={e=>e.stopPropagation()}><div className="modal-head"><Badge tone="purple">{detailChallenge.category || 'Community'}</Badge><button className="icon-button" onClick={()=>setDetailChallenge(null)}><X size={18}/></button></div><h2>{detailChallenge.title}</h2><p className="muted">{detailChallenge.description || 'Details have not been added for this sample challenge.'}</p><div className="challenge-detail-meta"><span><Users size={15}/> {detailChallenge.className || 'All VESIT students'}</span><span><Trophy size={15}/> {detailChallenge.points} credit points</span><span><CircleHelp size={15}/> Contact: {detailChallenge.contact || 'Relevant class representative'}</span><span><ShieldCheck size={15}/> {detailChallenge.status || 'Open'}</span></div><button className="primary full" onClick={()=>{toggleChallenge(detailChallenge.id);setDetailChallenge(null)}}>{detailChallenge.done?'Mark as not completed':'Join / mark complete'}</button></div></div>}
  </div>
}

function CampusGuide({ search, eventsList, setEventsList, notify }) {
  const [eventFilter,setEventFilter] = useState('All')
  const [selected,setSelected] = useState(null)
  const [clubFilter,setClubFilter] = useState('All')
  const states=['Registration Open','Starting Soon','Live Now','Event Ended']
const locations = [
  {
    name: 'Central Library',
    category: 'Facilities',
    place: 'Library building',
    detail: 'Study spaces, borrowing and reference resources. Visit the official VESIT Library page for details.',
    url: 'https://vesit.ves.ac.in/infrastructure/library/'
  },
  {
    name: 'Campus Canteen',
    category: 'Facilities',
    place: 'Student facilities area',
    detail: 'Food and refreshments. Visit the official VESIT Canteen page for details.',
    url: 'https://vesit.ves.ac.in/infrastructure/canteen/'
  },
  {
    name: 'Principal / Director Office',
    category: 'Administration',
    place: 'Administration block',
    detail: 'For formal academic and administrative matters. Confirm office room and visiting hours with VESIT.'
  },
  {
    name: 'VESIT Rail / Transport Help',
    category: 'Transport',
    place: 'Student support directory',
    detail: 'Open the official VESIT Rail portal for railway-related student services.',
    url: 'https://rail.vesit.ves.ac.in/'
  },
  {
    name: 'Reception / Main Desk',
    category: 'Administration',
    place: 'Main entrance',
    detail: 'First point of contact for visitors, directions and general enquiries.',
    url: 'https://vesit.ves.ac.in/footer/contact-us/'
  },
  {
    name: 'VES Council',
    category: 'Student bodies',
    place: 'Student council',
    detail: 'Student representation, campus initiatives and student-facing announcements. Confirm current office-bearers with the college.'
  }
];
  const clubs=[
    {name:'Coding / Technical Club',category:'Technical',president:'To be confirmed by college',detail:'Technical workshops, peer coding and project sessions.'},
    {name:'Robotics / Electronics Club',category:'Technical',president:'To be confirmed by college',detail:'Hands-on hardware, robotics and engineering activities.'},
    {name:'Cultural Committee',category:'Cultural',president:'To be confirmed by college',detail:'Cultural events, performances and campus celebrations.'},
    {name:'Literary / Debate Club',category:'Literary',president:'To be confirmed by college',detail:'Writing, speaking, debate and reading activities.'},
    {name:'Sports Committee',category:'Sports',president:'To be confirmed by college',detail:'Sports activities, tournaments and student fitness.'},
    {name:'Photography / Media Club',category:'Creative',president:'To be confirmed by college',detail:'Photography, design, event coverage and creative media.'},
  ]
  const shownContacts=locations.filter(x=>`${x.name} ${x.category} ${x.place} ${x.detail}`.toLowerCase().includes(search.toLowerCase()))
  const shownEvents=eventsList.filter(e=>eventFilter==='All'||e.state===eventFilter)
  const shownClubs=clubs.filter(c=>(clubFilter==='All'||c.category===clubFilter)&&`${c.name} ${c.category} ${c.president}`.toLowerCase().includes(search.toLowerCase()))
  function cycleEvent(id){setEventsList(old=>old.map(e=>{if((e.id||e.name)!==id)return e;const i=states.indexOf(e.state);return {...e,state:states[(i+1+states.length)%states.length]}}));notify('Event status updated in this prototype.')}
  return <div className="page-stack"><div className="welcome-row"><div><div className="eyebrow"><MapPin size={14}/> KNOW YOUR CAMPUS</div><h1>Campus directory & guide</h1><p className="muted">Find campus facilities, student bodies, clubs and events.</p></div><Badge tone="green">Directory</Badge></div>
    <section className="panel"><SectionTitle title="Campus facilities and contacts" sub="Some room numbers and contact details need official confirmation."/><div className="directory-grid">{shownContacts.map((c,i)=><button className="directory-card" key={c.name} onClick={()=>setSelected(c)}><span className={`directory-icon directory-${i%4}`}><MapPin size={19}/></span><b>{c.name}</b><small>{c.place}</small><p>{c.detail}</p><em>View details <ArrowRight size={14}/></em></button>)}</div></section>
    <section className="panel"><SectionTitle title="What's happening on campus?" sub="Browse events and preview status changes."/><div className="filter-row">{['All',...states].map(s=><button key={s} className={eventFilter===s?'active':''} onClick={()=>setEventFilter(s)}>{s}</button>)}</div>{shownEvents.length?<div className="event-list">{shownEvents.map((ev,i)=><div className="event-row event-row-wide" key={ev.id||ev.name}><div className={`event-date ed-${i%3}`}><CalendarDays size={20}/><small>{ev.time.split('·')[0].trim().toUpperCase()}</small></div><div className="event-info"><b>{ev.name}</b><small>{ev.time}</small><Badge tone={ev.state==='Live Now'?'green':ev.state==='Event Ended'?'slate':ev.state==='Starting Soon'?'amber':'purple'}>{ev.state}</Badge></div><button className="secondary compact" onClick={()=>cycleEvent(ev.id||ev.name)}>Update status <ArrowRight size={14}/></button></div>)}</div>:<p className="muted">No events match this filter. Open Campus Pulse to add an event.</p>}</section>
    <section className="panel"><SectionTitle title={`VESIT clubs & student communities (${clubs.length} sample listings)`} sub="Club names and presidents must be verified against the official current college directory."/><div className="filter-row">{['All','Technical','Cultural','Literary','Sports','Creative'].map(s=><button key={s} className={clubFilter===s?'active':''} onClick={()=>setClubFilter(s)}>{s}</button>)}</div><div className="directory-grid">{shownClubs.map((c,i)=><div className="directory-card club-card" key={c.name}><span className={`directory-icon directory-${i%4}`}><Users size={19}/></span><b>{c.name}</b><small>{c.category}</small><p>{c.detail}</p><div className="club-president"><strong>President</strong><span>{c.president}</span></div><button className="text-button" onClick={()=>notify('Club contact information needs verification by the college admin.')}>Contact club <ArrowRight size={14}/></button></div>)}</div></section>
    <section className="panel"><SectionTitle title="Campus location guide" sub="OpenStreetMap view centred approximately on the VESIT campus area."/><div className="leaflet-map-wrap"><MapContainer center={[19.0445,72.8992]} zoom={15} scrollWheelZoom={false} style={{height:'330px',width:'100%'}}><TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/><Marker position={[19.0445,72.8992]} icon={rideMarkerIcon}><Popup>VESIT campus area (approximate). Confirm exact building locations locally.</Popup></Marker></MapContainer></div><p className="map-disclaimer">Map markers and directory information are prototype placeholders; verify official details before public use.</p></section>
    {selected && (
      <div className="modal-backdrop" onClick={() => setSelected(null)}>
        <div className="modal" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
          <div className="modal-head">
            <Badge tone="purple">{selected.category}</Badge>
            <button className="icon-button" aria-label="Close details" onClick={() => setSelected(null)}><X size={18}/></button>
          </div>
          <h2>{selected.name}</h2>
          <p className="muted">{selected.detail}</p>
          <div className="challenge-detail-meta">
            <span><MapPin size={15}/> {selected.place}</span>
            <span><CircleHelp size={15}/> Check official college contacts for verified hours and phone numbers.</span>
          </div>
          {selected.url && (
            <p style={{ marginTop: '14px' }}>
              <a href={selected.url} target="_blank" rel="noopener noreferrer"
                style={{ display: 'inline-block', color: '#5145f5', fontWeight: 600, textDecoration: 'underline' }}>
                {selected.linkLabel || 'Open official website'} →
              </a>
            </p>
          )}
          <button className="primary" onClick={() => setSelected(null)}>Close details</button>
        </div>
      </div>
    )}
  </div>
}


const facultyDepartments = [
  {
    name: 'Electronics and Computer Science', code: 'etrx', url: 'https://vesit.ves.ac.in/academics/faculty/faculty-profile/etrx/',
    faculty: [
      ['Dr. Naveeta Kant', 'Head of Department'], ['Dr. T. Rajani Mangala', 'Deputy Head of Department'], ['Dr. Abhay Kshirsagar', 'Associate Professor'], ['Dr. Asawari Dudwadkar', 'Assistant Professor'], ['Abhijit Shete', 'Assistant Professor'], ['Dr. Parmeshwar Birajadar', 'Assistant Professor'], ['Yogesh Pandit', 'Assistant Professor'], ['Sarika Kuhikar', 'Assistant Professor'], ['Dr. (Mrs.) Gauri Sahoo', 'Assistant Professor'], ['Amrita Jhaveri', 'Assistant Professor'], ['Abhishek Chaudhari', 'Assistant Professor']
    ]
  },
  {
    name: 'Computer Engineering', code: 'cmpn', url: 'https://vesit.ves.ac.in/academics/faculty/faculty-profile/cmpn/',
    faculty: [
      ['Dr. Nupur Giri', 'Head of Department'], ['Dr. Sharmila Siddhartha Sengupta', 'Professor'], ['Dr. Saylee Gharge', 'Professor'], ['Dr. Sujata Atul Khedkar', 'Associate Professor'], ['Dr. Machhindranath Devidas Patil', 'Associate Professor'], ['Dr. Dashrath Mane', 'Associate Professor'], ['Dr. Prashant Vilas Kanade', 'Assistant Professor'], ['Geocey Shejy', 'Assistant Professor'], ['Dr. Rohini Temkar', 'Assistant Professor'], ['Vidya S. Zope', 'Assistant Professor'], ['Dr. Indu Dokare', 'Assistant Professor'], ['Dr. Priya R.L', 'Assistant Professor'], ['Lifna C S', 'Assistant Professor'], ['Abha Tewari', 'Assistant Professor'], ['Sanjay Mirchandani', 'Assistant Professor'], ['Pallavi Gangurde', 'Assistant Professor'], ['Nusrat Ansari', 'Assistant Professor'], ['Sunita Suralkar', 'Assistant Professor'], ['Rupali Hande', 'Assistant Professor'], ['Sujata Khandaskar', 'Assistant Professor'], ['Pallavi Saindane', 'Assistant Professor'], ['Yugchhaya Dhote', 'Assistant Professor'], ['Manisha Mathur', 'Assistant Professor'], ['Priti Ashish Joshi', 'Assistant Professor'], ['Mrs. Priyanka Nagda', 'Assistant Professor'], ['Pradnya Raut', 'Assistant Professor'], ['Vikrant Ingle', 'Assistant Professor'], ['Himali Patil', 'Assistant Professor']
    ]
  },
  {
    name: 'Automation and Robotics', code: 'inst', url: 'https://vesit.ves.ac.in/academics/faculty/faculty-profile/inst/',
    faculty: [
      ['Dr. J. M. Nair', 'Principal'], ['Dr. Sangeetha Prasanna Ram', 'Head of Department'], ['Deepti Khimani', 'Deputy Head of Department'], ['Dr. Nilima V Warke', 'Associate Professor'], ['Madhumati Khuspe', 'Assistant Professor'], ['Dr. Kadambari Sharma', 'Assistant Professor'], ['Kader B. T. Shaikh', 'Assistant Professor'], ['Prasad Godse', 'Assistant Professor'], ['Amudha Senthilkumar', 'Assistant Professor'], ['Gopalakrishnan Narayanan', 'Assistant Professor'], ['Jayasree Ramakrishnan', 'Assistant Professor'], ['Ramya Tirumalasetti', 'Assistant Professor']
    ]
  },
  {
    name: 'Electronics and Telecommunication', code: 'extc', url: 'https://vesit.ves.ac.in/academics/faculty/faculty-profile/extc/',
    faculty: [
      ['Dr. Chandan Singh. D. Rawat', 'Head of Department'], ['Dr. Manisha Chattopadhyay', 'Deputy Head of Department'], ['Dr. Nadir N. Charniya', 'Professor'], ['Dr. Ranjan Bala Jain', 'Professor'], ['Dr. Jaymala Adsul', 'Associate Professor'], ['Dr. Monali Chaudhari', 'Assistant Professor'], ['Dr. Nandini Ammanagi', 'Assistant Professor'], ['Anuradha Jadiya', 'Assistant Professor'], ['Gaurav Tawde', 'Assistant Professor'], ['Arti Sawant', 'Assistant Professor'], ['Himali Patel', 'Assistant Professor'], ['Chintan Jethva', 'Assistant Professor'], ['Aarti Wadhwani', 'Assistant Professor']
    ]
  },
  {
    name: 'Information Technology', code: 'it', url: 'https://vesit.ves.ac.in/academics/faculty/faculty-profile/it/',
    faculty: [
      ['Dr. Shalu Chopra', 'Head of Department'], ['Dr. Manoj Sabnis', 'Deputy Head of Department'], ['Dr. Shanta Sondur', 'Professor'], ['Dr. Asma Parveen I. Siddavatam', 'Associate Professor'], ['Charusheela Nehete', 'Assistant Professor'], ['Jayshree Hajgude', 'Assistant Professor'], ['Vidya Pujari', 'Assistant Professor'], ['Vinita Mishra', 'Assistant Professor']
    ]
  },
  {
    name: 'AI and Data Science', code: 'dsai', url: 'https://vesit.ves.ac.in/academics/faculty/faculty-profile/dsai/',
    faculty: [
      ['Dr. M. Vijayalakshmi', 'Vice Principal and Department HOD'], ['Dr. Anjali Shrikant Yeole', 'Deputy Head of Department'], ['Dr. Kanchan Chavan', 'Assistant Professor'], ['Sangeeta Oswal', 'Assistant Professor'], ['Amit Singh', 'Assistant Professor'], ['Neeta Chavan', 'Assistant Professor'], ['Ajinkya Valanjoo', 'Assistant Professor'], ['Vijay Shejwalkar', 'Assistant Professor'], ['Mrs. Kusum Kardam', 'Assistant Professor'], ['Dr. Smita Mane', 'Assistant Professor'], ['Anil Bharat Ahir', 'Assistant Professor'], ['Mrs. Bincy Ivin', 'Assistant Professor'], ['Mrs. Bhavana Chaudhari', 'Assistant Professor'], ['Mrs. Himanshi Jiwatramani', 'Assistant Professor'], ['Mrs. Bhagyashree', 'Assistant Professor'], ['Mrs. Puja Vakhare', 'Assistant Professor'], ['Mrs. Prajakta Pote', 'Assistant Professor'], ['Mrs. Samruddhi Yadav', 'Assistant Professor'], ['Mrs. Aarti Jangid', 'Assistant Professor'], ['Mr. Omkar Ghag', 'Assistant Professor']
    ]
  },
  {
    name: 'Master of Computer Application', code: 'mca', url: 'https://vesit.ves.ac.in/academics/faculty/faculty-profile/mca/',
    faculty: [
      ['Dr. Shivkumar Goel', 'Head of Department'], ['Dr. Dhanamma Jagli', 'Deputy Head of Department'], ['Dr. Gresha Bhatia', 'Professor'], ['Dr. Mona Deshmukh', 'Associate Professor'], ['Dr. Ramesh Solanki', 'Assistant Professor'], ['Dr. Ameya Parkar', 'Assistant Professor'], ['Indira Bhattacharya', 'Assistant Professor'], ['Ruchi Rautela', 'Assistant Professor'], ['Sunny Nahar', 'Assistant Professor'], ['Dr. Meenakshi Garg', 'Assistant Professor'], ['Vaishali Gatty', 'Assistant Professor'], ['Monali Rajput', 'Assistant Professor']
    ]
  },
  {
    name: 'First year Bachelor of Technology', code: 'hums', url: 'https://vesit.ves.ac.in/academics/faculty/faculty-profile/hums/',
    faculty: [
      ['Dr. Chandan Singh. D. Rawat', 'Dean'], ['Mr. Subhash B. Singh', 'Assistant Professor'], ['Dr. Ravi Shankar', 'Assistant Professor'], ['Dr. A. Netto Mertia', 'Assistant Professor'], ['Dr. Shashwati Roy Majumder', 'Assistant Professor'], ['Dr. Maya Bhat', 'Assistant Professor'], ['Dr. Keya Surag Doshi', 'Assistant Professor']
    ]
  }
]

function FacultyDirectory({ search }) {
  const [departmentName, setDepartmentName] = useState(facultyDepartments[0].name)
  const department = facultyDepartments.find(d => d.name === departmentName) || facultyDepartments[0]
  const filtered = department.faculty.filter(([name, designation]) => `${name} ${designation} ${department.name}`.toLowerCase().includes((search || '').toLowerCase()))
  return <div className="page-stack">
    <div className="welcome-row"><div><div className="eyebrow"><BookOpen size={14}/> VESIT ACADEMIC DIRECTORY</div><h1>Faculty</h1><p className="muted">Find faculty names and designations by department. Details are based on the official VESIT faculty directory.</p></div><a className="secondary" href={department.url} target="_blank" rel="noopener noreferrer">Official faculty page <ArrowRight size={14}/></a></div>
    <section className="panel">
      <SectionTitle title="Choose a department" sub="Select a branch to view its faculty list."/>
      <label className="field-label">FACULTY DEPARTMENT
        <select value={departmentName} onChange={e => setDepartmentName(e.target.value)}>
          {facultyDepartments.map(d => <option key={d.code} value={d.name}>{d.name}</option>)}
        </select>
      </label>
      <div className="faculty-summary"><div><strong>{department.faculty.length}</strong><span>listed faculty entries</span></div><div><strong>{department.name}</strong><span>Department</span></div><a href={department.url} target="_blank" rel="noopener noreferrer">View full official directory <ArrowRight size={14}/></a></div>
    </section>
    <section className="panel"><SectionTitle title={`${department.name} faculty`} sub="Names and designations shown here; visit the official directory for additional credentials, office locations, courses and research details where available."/>
      {filtered.length ? <div className="directory-grid faculty-grid">{filtered.map(([name, designation]) => <article className="directory-card faculty-card" key={`${department.code}-${name}`}><span className="directory-icon directory-1"><Users size={19}/></span><b>{name}</b><small>{designation}</small><a href={department.url} target="_blank" rel="noopener noreferrer">View official profile <ArrowRight size={14}/></a></article>)}</div> : <p className="muted">No faculty names match the current search. Clear the campus search field to see the full list.</p>}
      <p className="map-disclaimer">Faculty details can change. The official VESIT page is the source of truth; this directory does not include photos.</p>
    </section>
  </div>
}



function CampusPulse({eventsList,setEventsList,assignments,setAssignments,notify}) {
  const [tab,setTab]=useState('Events')
  const [showEventForm,setShowEventForm]=useState(false)
  const [showAssignmentForm,setShowAssignmentForm]=useState(false)
  const [eventForm,setEventForm]=useState({name:'',time:'',registrationEnd:'',description:'',state:'Registration Open',category:'Campus event',adminRole:'VES Council',adminCode:''})
  const [assignmentForm,setAssignmentForm]=useState({title:'',subject:'',due:'',priority:'Medium'})
  function addEvent(e){e.preventDefault();const expectedCode=import.meta.env.VITE_EVENT_ADMIN_CODE || '12345';if(!['VES Council','CRS'].includes(eventForm.adminRole)){notify('Only VES Council or CRS can add events.');return}if(eventForm.adminCode!==expectedCode){notify('Incorrect admin code. Event was not added.');return}setEventsList(old=>[{id:Date.now(),name:eventForm.name.trim(),time:eventForm.time,registrationEnd:eventForm.registrationEnd,description:eventForm.description,state:eventForm.state,category:eventForm.category,createdBy:eventForm.adminRole},...old]);setEventForm({name:'',time:'',registrationEnd:'',description:'',state:'Registration Open',category:'Campus event',adminRole:'VES Council',adminCode:''});setShowEventForm(false);notify('Event added. Note: secure admin validation must be enforced by the backend before public launch.') }
  function addAssignment(e){e.preventDefault();setAssignments(old=>[{id:Date.now(),...assignmentForm},...old]);setAssignmentForm({title:'',subject:'',due:'',priority:'Medium'});setShowAssignmentForm(false);notify('Assignment deadline added.')}
  return <div className="page-stack"><div className="welcome-row"><div><div className="eyebrow"><CalendarDays size={14}/> CAMPUS UPDATES</div><h1>Campus Pulse</h1><p className="muted">Events, notices and assignment deadlines in one place.</p></div><Badge tone="purple">{eventsList.length} events</Badge></div><div className="tab-row"><button className={tab==='Events'?'active':''} onClick={()=>setTab('Events')}>Events & notices</button><button className={tab==='Assignments'?'active':''} onClick={()=>setTab('Assignments')}>Assignment deadlines</button></div>
    {tab==='Events'?<section className="panel"><SectionTitle title="Campus events" sub="Event state changes here are local demo actions, not official event updates." action={<button className="primary" onClick={()=>setShowEventForm(true)}><Plus size={15}/> Add event</button>}/><div className="event-list">{eventsList.map((ev,i)=><div className="event-row event-row-wide" key={ev.id||ev.name}><div className={`event-date ed-${i%3}`}><CalendarDays size={20}/><small>{ev.time.split('·')[0].trim().toUpperCase()}</small></div><div className="event-info"><b>{ev.name}</b><small>{ev.time}</small>{ev.description&&<small>{ev.description}</small>}<Badge tone={ev.state==='Live Now'?'green':ev.state==='Event Ended'?'slate':ev.state==='Starting Soon'?'amber':'purple'}>{ev.state}</Badge></div><button className="secondary compact" onClick={()=>setEventsList(old=>old.map(x=>(x.id||x.name)===(ev.id||ev.name)?{...x,state:['Registration Open','Starting Soon','Live Now','Event Ended'][( ['Registration Open','Starting Soon','Live Now','Event Ended'].indexOf(x.state)+1)%4]}:x))}>Update status</button></div>)}</div></section>:<section className="panel"><SectionTitle title="Assignment deadlines" sub="Stored in this browser until a shared database is configured." action={<button className="primary" onClick={()=>setShowAssignmentForm(true)}><Plus size={15}/> Add deadline</button>}/><div className="assignment-list">{assignments.map(a=><div className="assignment-row" key={a.id}><div className="assignment-date"><CalendarDays size={17}/><span>{a.due?new Date(`${a.due}T00:00:00`).toLocaleDateString('en-IN',{day:'2-digit',month:'short'}):'No date'}</span></div><div className="assignment-copy"><b>{a.title}</b><small>{a.subject}</small></div><Badge tone={a.priority==='High'?'red':a.priority==='Medium'?'amber':'green'}>{a.priority}</Badge><button className="icon-button" aria-label="Delete deadline" onClick={()=>setAssignments(old=>old.filter(x=>x.id!==a.id))}><X size={16}/></button></div>)}</div></section>}
    {showEventForm&&<div className="modal-backdrop" onClick={()=>setShowEventForm(false)}><div className="modal modal-wide" onClick={e=>e.stopPropagation()}><div className="modal-head"><h2>Add campus event</h2><button className="icon-button" onClick={()=>setShowEventForm(false)}><X size={18}/></button></div><form className="modal-form" onSubmit={addEvent}><label className="field-label">Event name<input value={eventForm.name} onChange={e=>setEventForm({...eventForm,name:e.target.value})} required/></label><label className="field-label">Date and time<input value={eventForm.time} onChange={e=>setEventForm({...eventForm,time:e.target.value})} placeholder="e.g. 18 Oct · 3:00 PM" required/></label><label className="field-label">Registration closes on<input type="date" value={eventForm.registrationEnd} onChange={e=>setEventForm({...eventForm,registrationEnd:e.target.value})}/></label><div className="form-two"><label className="field-label">Authorized team<select value={eventForm.adminRole} onChange={e=>setEventForm({...eventForm,adminRole:e.target.value})}><option>VES Council</option><option>CRS</option><option>Student</option></select></label><label className="field-label">Admin code<input type="password" value={eventForm.adminCode} onChange={e=>setEventForm({...eventForm,adminCode:e.target.value})} autoComplete="off" required/></label></div><label className="field-label">Short description<textarea rows={3} value={eventForm.description} onChange={e=>setEventForm({...eventForm,description:e.target.value})}/></label><div className="form-two"><label className="field-label">Category<select value={eventForm.category} onChange={e=>setEventForm({...eventForm,category:e.target.value})}><option>Campus event</option><option>Notice</option><option>Workshop</option><option>Club</option><option>Academic</option></select></label><label className="field-label">Status<select value={eventForm.state} onChange={e=>setEventForm({...eventForm,state:e.target.value})}>{['Registration Open','Starting Soon','Live Now','Event Ended'].map(s=><option key={s}>{s}</option>)}</select></label></div><div className="modal-actions"><button type="button" className="secondary" onClick={()=>setShowEventForm(false)}>Cancel</button><button className="primary">Save event</button></div></form></div></div>}
    {showAssignmentForm&&<div className="modal-backdrop" onClick={()=>setShowAssignmentForm(false)}><div className="modal modal-wide" onClick={e=>e.stopPropagation()}><div className="modal-head"><h2>Add assignment deadline</h2><button className="icon-button" onClick={()=>setShowAssignmentForm(false)}><X size={18}/></button></div><form className="modal-form" onSubmit={addAssignment}><label className="field-label">Assignment title<input value={assignmentForm.title} onChange={e=>setAssignmentForm({...assignmentForm,title:e.target.value})} required/></label><div className="form-two"><label className="field-label">Subject<input value={assignmentForm.subject} onChange={e=>setAssignmentForm({...assignmentForm,subject:e.target.value})} required/></label><label className="field-label">Due date<input type="date" value={assignmentForm.due} onChange={e=>setAssignmentForm({...assignmentForm,due:e.target.value})} required/></label></div><label className="field-label">Priority<select value={assignmentForm.priority} onChange={e=>setAssignmentForm({...assignmentForm,priority:e.target.value})}><option>High</option><option>Medium</option><option>Low</option></select></label><div className="modal-actions"><button type="button" className="secondary" onClick={()=>setShowAssignmentForm(false)}>Cancel</button><button className="primary">Save deadline</button></div></form></div></div>}
  </div>
}

function Achievements({ achievements, setAchievements, profile, notify }) {
  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState('All')
  const [query, setQuery] = useState('')
  const [form, setForm] = useState({ title: '', category: 'Award', issuer: '', date: new Date().toISOString().slice(0, 10), level: 'Other', credits: '', description: '', proofUrl: '' })
  const categories = ['All', 'Academic Credits', 'Award', 'Hackathon', 'Competition', 'Certification', 'Sports', 'Arts & Culture', 'Volunteering', 'Research', 'Other']
  const visible = achievements.filter(item => (filter === 'All' || item.category === filter) && `${item.title} ${item.issuer} ${item.description} ${item.owner}`.toLowerCase().includes(query.toLowerCase()))
  const totalCredits = achievements.filter(item => item.category === 'Academic Credits').reduce((sum, item) => sum + (Number(item.credits) || 0), 0)
  const update = (key, value) => setForm(current => ({ ...current, [key]: value }))
  function submit(e) {
    e.preventDefault()
    if (!form.title.trim()) return
    const item = { ...form, id: Date.now(), title: form.title.trim(), issuer: form.issuer.trim(), description: form.description.trim(), owner: profile?.name || 'Campus360 student', createdAt: new Date().toISOString() }
    setAchievements(current => [item, ...current])
    setForm({ title: '', category: 'Award', issuer: '', date: new Date().toISOString().slice(0, 10), level: 'Other', credits: '', description: '', proofUrl: '' })
    setShowForm(false)
    notify('Achievement added to your Campus360 profile.')
  }
  function remove(id) {
    if (!window.confirm('Delete this achievement from this browser?')) return
    setAchievements(current => current.filter(item => item.id !== id))
    notify('Achievement removed.')
  }
  const iconFor = category => category === 'Academic Credits' ? <BookOpen size={18}/> : category === 'Hackathon' ? <Sparkles size={18}/> : category === 'Certification' ? <ShieldCheck size={18}/> : category === 'Sports' ? <Trophy size={18}/> : <Award size={18}/>
  return <div className="page-stack achievements-page">
    <div className="achievement-hero">
      <div className="achievement-hero-copy"><div className="eyebrow"><Award size={14}/> YOUR GROWTH, ALL IN ONE PLACE</div><h1>Achievements</h1><p>Celebrate every win — from academic credits and certifications to hackathons, awards, sports, volunteering and milestones beyond campus.</p><div className="achievement-hero-pills"><span><Check size={14}/> College or personal</span><span><ShieldCheck size={14}/> Your story, your progress</span></div></div>
      <div className="achievement-hero-art"><div className="achievement-orbit orbit-one"/><div className="achievement-orbit orbit-two"/><div className="achievement-trophy"><Trophy size={48}/></div><span className="achievement-spark spark-one">✦</span><span className="achievement-spark spark-two">✧</span><span className="achievement-spark spark-three">✦</span></div>
    </div>
    <div className="achievement-stats">
      <div className="achievement-stat"><span className="achievement-stat-icon purple"><Award size={19}/></span><div><small>Total achievements</small><strong>{achievements.length}</strong><span>Every milestone counts</span></div></div>
      <div className="achievement-stat"><span className="achievement-stat-icon blue"><Trophy size={19}/></span><div><small>Wins & recognition</small><strong>{achievements.filter(a => ['Award','Hackathon','Competition','Sports','Arts & Culture'].includes(a.category)).length}</strong><span>Competitions and awards</span></div></div>
      <div className="achievement-stat"><span className="achievement-stat-icon mint"><BookOpen size={19}/></span><div><small>Academic credits</small><strong>{totalCredits}</strong><span>Credits recorded by you</span></div></div>
    </div>
    <section className="panel achievement-toolbar-panel"><div className="achievement-toolbar"><div><h2>Your achievement wall</h2><p className="muted">A personal portfolio of the things you have accomplished.</p></div><button className="primary achievement-add-button" onClick={() => setShowForm(true)}><Plus size={17}/> Add achievement</button></div>
      <div className="achievement-filters"><label className="achievement-search"><Search size={16}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search achievements..." aria-label="Search achievements"/></label><div className="achievement-filter-list">{categories.map(category => <button key={category} className={filter === category ? 'active' : ''} onClick={() => setFilter(category)}>{category}</button>)}</div></div>
      {visible.length === 0 ? <div className="achievement-empty"><div className="achievement-empty-icon"><Award size={28}/></div><h3>{achievements.length ? 'No matches found' : 'Your next big thing starts here'}</h3><p>{achievements.length ? 'Try another category or search term.' : 'Add your first achievement — a hackathon, course credit, certificate, award or any milestone you are proud of.'}</p>{!achievements.length && <button className="primary" onClick={() => setShowForm(true)}><Plus size={16}/> Add your first achievement</button>}</div> : <div className="achievement-grid">{visible.map(item => <article className="achievement-card" key={item.id}><div className="achievement-card-top"><span className={`achievement-card-icon category-${String(item.category).toLowerCase().replace(/[^a-z]+/g,'-')}`}>{iconFor(item.category)}</span><span className="achievement-category">{item.category}</span><button className="achievement-delete" onClick={() => remove(item.id)} title="Delete achievement" aria-label={`Delete ${item.title}`}><X size={16}/></button></div><h3>{item.title}</h3><p className="achievement-issuer">{item.issuer || 'Independent achievement'}</p>{item.description && <p className="achievement-description">{item.description}</p>}<div className="achievement-meta">{item.date && <span><CalendarDays size={14}/>{new Date(`${item.date}T00:00:00`).toLocaleDateString(undefined,{month:'short',year:'numeric'})}</span>}<span><Users size={14}/>{item.owner || 'Campus360 student'}</span></div><div className="achievement-card-bottom"><span className="achievement-level">{item.level || 'Other'}</span>{item.category === 'Academic Credits' && item.credits !== '' && <strong>{item.credits} credits</strong>}{item.proofUrl && <a href={item.proofUrl} target="_blank" rel="noreferrer">View proof <ArrowRight size={13}/></a>}</div></article>)}</div>}
      <p className="achievement-storage-note"><ShieldCheck size={14}/> Prototype note: achievements are saved in this browser on this device. Shared cross-user profiles need database storage.</p>
    </section>
    {showForm && <div className="modal-backdrop" onClick={() => setShowForm(false)}><div className="modal achievement-modal" role="dialog" aria-modal="true" aria-labelledby="achievement-modal-title" onClick={e => e.stopPropagation()}><div className="modal-head"><div><span className="eyebrow"><Sparkles size={13}/> ADD TO YOUR STORY</span><h2 id="achievement-modal-title">Add an achievement</h2><p className="muted">Big or small, it deserves a place here.</p></div><button className="icon-button" type="button" onClick={() => setShowForm(false)} aria-label="Close form"><X size={18}/></button></div><form className="achievement-form" onSubmit={submit}><label className="field-label">Achievement title *<input required maxLength={100} value={form.title} onChange={e => update('title',e.target.value)} placeholder="e.g. First place at a hackathon"/></label><div className="achievement-form-row"><label className="field-label">Category<select value={form.category} onChange={e => update('category',e.target.value)}>{categories.filter(c => c !== 'All').map(c => <option key={c}>{c}</option>)}</select></label><label className="field-label">Level / type<select value={form.level} onChange={e => update('level',e.target.value)}>{['Personal','College','Inter-college','University','State','National','International','Online','Other'].map(v => <option key={v}>{v}</option>)}</select></label></div><div className="achievement-form-row"><label className="field-label">Awarded by / organisation<input maxLength={100} value={form.issuer} onChange={e => update('issuer',e.target.value)} placeholder="e.g. Smart India Hackathon"/></label><label className="field-label">Date<input type="date" value={form.date} onChange={e => update('date',e.target.value)}/></label></div>{form.category === 'Academic Credits' && <label className="field-label">Credits earned<input type="number" min="0" max="999" step="0.5" value={form.credits} onChange={e => update('credits',e.target.value)} placeholder="e.g. 2"/></label>}<label className="field-label">Description<textarea maxLength={800} rows={3} value={form.description} onChange={e => update('description',e.target.value)} placeholder="What did you achieve? Add a little context..."/></label><label className="field-label">Proof link (optional)<input type="url" value={form.proofUrl} onChange={e => update('proofUrl',e.target.value)} placeholder="https://certificate-or-project-link..."/><small>Add a public certificate, portfolio or project link if available.</small></label><div className="achievement-form-actions"><button type="button" className="secondary" onClick={() => setShowForm(false)}>Cancel</button><button type="submit" className="primary"><Award size={16}/> Save achievement</button></div></form></div></div>}
  </div>
}

function SkillSwap({skills,setSkills,profile,notify}) {
  const [showForm,setShowForm]=useState(false)
  const [form,setForm]=useState({name:'',category:'Technology',offer:'Can teach',want:'',contact:''})
  function submit(e){e.preventDefault();setSkills(old=>[{id:Date.now(),...form,owner:profile.name,contact:form.contact||'Campus message'},...old]);setForm({name:'',category:'Technology',offer:'Can teach',want:'',contact:''});setShowForm(false);notify('SkillSwap listing added to this browser prototype.')}
  return <div className="page-stack"><div className="welcome-row"><div><div className="eyebrow"><Users size={14}/> PEER LEARNING COMMUNITY</div><h1>SkillSwap</h1><p className="muted">Learn from classmates, share what you know and find a study partner.</p></div><button className="primary" onClick={()=>setShowForm(true)}><Plus size={15}/> Offer a skill</button></div><div className="stats-grid three"><Stat label="Peer listings" value={skills.length} hint="Skills offered or requested" icon={Users}/><Stat label="Can teach" value={skills.filter(s=>s.offer==='Can teach').length} hint="Share your strengths" icon={BookOpen}/><Stat label="Want to learn" value={skills.filter(s=>s.offer==='Want to learn').length} hint="Discover new skills" icon={Sparkles}/></div><section className="panel"><SectionTitle title="Peer learning exchange" sub="Sample student listings; contact is a demo placeholder."/><div className="skills-grid">{skills.map(s=><article className="skill-card" key={s.id}><div className="skill-card-top"><Badge tone={s.offer==='Can teach'?'green':'purple'}>{s.offer}</Badge><Badge>{s.category}</Badge></div><h3>{s.name}</h3><p>{s.offer==='Can teach'?'Can help peers learn this skill.':'Looking for a peer to learn with.'}</p><div className="skill-wants"><span>Exchange interest</span><b>{s.want || s.wantSkill || 'Open to suggestions'}</b></div><div className="skill-owner"><div className="avatar small">{s.owner.split(' ').map(x=>x[0]).slice(0,2).join('')}</div><span><b>{s.owner}</b><small>{s.contact}</small></span></div><button className="secondary full" onClick={()=>notify(`Contact flow for ${s.owner} is a prototype; no personal details are shared.`)}>Request peer session</button></article>)}</div></section>{showForm&&<div className="modal-backdrop" onClick={()=>setShowForm(false)}><div className="modal modal-wide" onClick={e=>e.stopPropagation()}><div className="modal-head"><h2>Add a SkillSwap listing</h2><button className="icon-button" onClick={()=>setShowForm(false)}><X size={18}/></button></div><form className="modal-form" onSubmit={submit}><label className="field-label">Skill or subject<input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required/></label><div className="form-two"><label className="field-label">Category<select value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>{['Technology','Design','Academic','Communication','Creative','Other'].map(x=><option key={x}>{x}</option>)}</select></label><label className="field-label">I want to<select value={form.offer} onChange={e=>setForm({...form,offer:e.target.value})}><option>Can teach</option><option>Want to learn</option></select></label></div><label className="field-label">Skill to exchange / learn<input value={form.want} onChange={e=>setForm({...form,want:e.target.value})} placeholder="e.g. Figma, Python, public speaking"/></label><label className="field-label">Preferred contact method<input value={form.contact} onChange={e=>setForm({...form,contact:e.target.value})} placeholder="e.g. Campus message"/></label><div className="modal-actions"><button type="button" className="secondary" onClick={()=>setShowForm(false)}>Cancel</button><button className="primary">Publish listing</button></div></form></div></div>}</div>
}

export default App

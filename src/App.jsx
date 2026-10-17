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
  ['Dashboard', LayoutDashboard], ['Academic Planner', GraduationCap], ['Timetable', CalendarDays], ['Rides', Bike],
  ['Challenges', Trophy], ['Campus Guide', MapPin], ['Campus Pulse', CalendarDays], ['SkillSwap', Users],
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
    if (import.meta.env.DEV) return true;
    try {
      return localStorage.getItem('c360_logged_in') === 'true';
    } catch {
      return false;
    }
  })

  const [showLogin, setShowLogin] = useState(false)
  const [notice, setNotice] = useState('')
  const [notifications, setNotifications] = useState(() => read('c360_notifications', []))
  const [showNotifications, setShowNotifications] = useState(false)
  const [search, setSearch] = useState('')
  const [newRide, setNewRide] = useState({ from: '', to: 'Campus Main Gate', time: '', seats: 2, vehicleType: 'Car', paymentMode: 'Pay before ride', fare: '' })
  const [timetable, setTimetable] = useState(() => read('c360_timetable', {}))
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
        {page === 'Timetable' && <Timetable timetable={timetable} setTimetable={setTimetable} notify={notify}/> }
        {page === 'Academic Planner' && <AcademicPlanner subjects={subjects} setSubjects={setSubjects} marksRows={marksRows} targetSgpa={targetSgpa} setTargetSgpa={setTargetSgpa} totalCredits={totalCredits} targetReachable={targetReachable} updateSubject={updateSubject} activeTab={activeTab} setActiveTab={setActiveTab} notify={notify}/>}
        {page === 'Rides' && <Rides rides={rides} requestRide={requestRide} updateRideRequest={updateRideRequest} profile={profile} newRide={newRide} setNewRide={setNewRide} addRide={addRide} search={search}/>}
        {page === 'Challenges' && <Challenges challenges={challenges} points={points} newChallenge={newChallenge} setNewChallenge={setNewChallenge} addChallenge={addChallenge} toggleChallenge={toggleChallenge}/>}
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
  const [whatIf, setWhatIf] = useState(false)
  const [internalBump, setInternalBump] = useState(5)
  const [newName, setNewName] = useState('')
  const [semesterSgpas, setSemesterSgpas] = useState(() => read('c360_semester_sgpas', [{name:'Semester 1',sgpa:'8.2',credits:'20'},{name:'Semester 2',sgpa:'8.5',credits:'22'}]))
  const cgpa = semesterSgpas.reduce((sum,s)=>sum+Number(s.sgpa||0)*Number(s.credits||0),0) / Math.max(1,semesterSgpas.reduce((sum,s)=>sum+Number(s.credits||0),0))
  const sgpa = subjects.length ? subjects.reduce((sum,s) => sum + Number(s.credits) * (gradeScale.find(g => s.internal >= g.min)?.points || 5), 0) / Math.max(totalCredits,1) : 0
  const neededTotal = marksRows.reduce((n,r) => n + r.needed, 0)
  function addSubject(e) { e.preventDefault(); if (!newName.trim()) return; setSubjects(old => [...old, { id: Date.now(), name: newName.trim(), credits: 3, internal: 20, cutoff: 40, pass: 40, target: 'B' }]); setNewName(''); notify('Subject added.') }
  return <div className="page-stack">
    <div className="welcome-row"><div><div className="eyebrow"><GraduationCap size={14}/> ACADEMIC CONTROL CENTRE</div><h1>Academic planner</h1><p className="muted">Know where you stand, and what it takes to reach your goals.</p></div><button className={`secondary ${whatIf ? 'selected' : ''}`} onClick={() => setWhatIf(!whatIf)}><Sparkles size={16}/>{whatIf ? 'Close what-if' : 'What-if scenario'}</button></div>
    <div className="stats-grid three"><Stat label="Subjects" value={subjects.length} hint="Currently being tracked" icon={BookOpen}/><Stat label="Total credits" value={totalCredits} hint="Across selected subjects" icon={WalletCards}/><Stat label="Indicative SGPA" value={sgpa.toFixed(2)} hint="Illustrative grade-point estimate" icon={Target}/></div>
    {whatIf && <div className="panel whatif"><div><Badge tone="purple">WHAT-IF SIMULATOR</Badge><h3>What if I score more marks?</h3><p className="muted">Move the slider to add expected marks. Your saved marks stay unchanged.</p><label className="field-label whatif-number">Extra marks I might score <strong>+{internalBump}</strong><input type="range" min="0" max="20" step="1" value={internalBump} onChange={e=>setInternalBump(Number(e.target.value))}/></label></div><div className="whatif-result"><span>Subjects likely to meet cutoff</span><strong>{subjects.filter(s=>Math.min(100,Number(s.internal||0)+internalBump+60)>=Number(s.cutoff||40)).length} of {subjects.length}</strong><small>Estimate only · assumes 60 external marks before the extra marks</small></div></div>}
    <div className="tab-row"><button className={activeTab === 'Planner' ? 'active' : ''} onClick={() => setActiveTab('Planner')}>Marks planner</button><button className={activeTab === 'SGPA' ? 'active' : ''} onClick={() => setActiveTab('SGPA')}>Target SGPA</button><button className={activeTab === 'Profile' ? 'active' : ''} onClick={() => setActiveTab('Profile')}>Subjects & credits</button><button className={activeTab === 'CGPA' ? 'active' : ''} onClick={() => setActiveTab('CGPA')}>CGPA calculator</button></div>
    {activeTab === 'Planner' && <section className="panel"><SectionTitle title="Marks-needed table" sub="Sample rule: required total minus internal marks scored. Replace with your institution's official grading rules."/><div className="table-wrap"><table><thead><tr><th>Subject</th><th>Credits</th><th>Internal</th><th>Target cutoff</th><th>Marks needed</th><th>Status</th></tr></thead><tbody>{marksRows.map(s=><tr key={s.id}><td><b>{s.name}</b><small className="cell-sub">Pass minimum: {s.pass}</small></td><td>{s.credits}</td><td>{s.internal}</td><td>{s.cutoff}</td><td><b>{s.needed}</b> / 100</td><td>{s.locked ? <Badge tone="red">Grade locked</Badge> : s.needed > 100-s.internal ? <Badge tone="amber">At risk</Badge> : <Badge tone="green">Possible</Badge>}</td></tr>)}</tbody></table></div><div className="table-note"><CircleHelp size={15}/> Illustrative calculator only. Final grade locking and passing logic must follow official subject-wise exam rules.</div></section>}
    {activeTab === 'SGPA' && <section className="panel"><SectionTitle title="Target SGPA check" sub="Set a target and review a transparent, illustrative feasibility result."/><div className="sgpa-layout"><div className="target-card"><label className="field-label">Your target SGPA<input type="number" min="0" max="10" step=".1" value={targetSgpa} onChange={e => setTargetSgpa(e.target.value)}/></label><div className="big-number">{Number(targetSgpa || 0).toFixed(1)}<small> / 10</small></div><p className="muted">Based on your subject credits and the grade-point model configured for this demo.</p></div><div className="feasibility"><div className="feasibility-icon"><Target size={24}/></div><Badge tone={targetReachable && Number(targetSgpa) <= 10 ? 'green' : 'red'}>{targetReachable && Number(targetSgpa) <= 10 ? 'Potentially achievable' : 'Not achievable with current assumptions'}</Badge><h3>{targetReachable && Number(targetSgpa) <= 10 ? 'Keep working towards it.' : 'Review your target.'}</h3><p className="muted">This preliminary check confirms whether the configured maximum marks and pass conditions permit the target. A production-ready result must calculate achievable grade-point combinations across credits.</p></div></div></section>}
    {activeTab === 'CGPA' && <section className="panel"><SectionTitle title="CGPA calculator" sub="Enter each semester SGPA and credit total. CGPA is credit-weighted; confirm your college's official method."/><div className="cgpa-summary"><span>Estimated CGPA</span><strong>{cgpa.toFixed(2)} <small>/ 10</small></strong></div><div className="semester-list">{semesterSgpas.map((s,i)=><div className="semester-row" key={i}><label className="field-label">Semester<input value={s.name} onChange={e=>setSemesterSgpas(old=>old.map((x,j)=>j===i?{...x,name:e.target.value}:x))}/></label><label className="field-label">SGPA<input type="number" min="0" max="10" step="0.01" value={s.sgpa} onChange={e=>setSemesterSgpas(old=>old.map((x,j)=>j===i?{...x,sgpa:e.target.value}:x))}/></label><label className="field-label">Credits<input type="number" min="1" value={s.credits} onChange={e=>setSemesterSgpas(old=>old.map((x,j)=>j===i?{...x,credits:e.target.value}:x))}/></label><button className="secondary compact" onClick={()=>setSemesterSgpas(old=>old.filter((_,j)=>j!==i))}>Remove</button></div>)}</div><div className="modal-actions"><button className="secondary" onClick={()=>setSemesterSgpas(old=>[...old,{name:`Semester ${old.length+1}`,sgpa:'0',credits:'20'}])}><Plus size={15}/> Add semester</button><button className="primary" onClick={()=>save('c360_semester_sgpas',semesterSgpas)}>Save CGPA inputs</button></div></section>}
    {activeTab === 'Profile' && <section className="panel"><SectionTitle title="Subjects & credits" sub="Edit demo values or add a subject."/><div className="subject-editor">{subjects.map(s=><div className="subject-edit-row" key={s.id}><b>{s.name}</b><label>Credits<input type="number" min="1" max="10" value={s.credits} onChange={e => updateSubject(s.id,'credits',e.target.value)}/></label><label>Internal<input type="number" min="0" max="100" value={s.internal} onChange={e => updateSubject(s.id,'internal',e.target.value)}/></label><label>Cutoff<input type="number" min="0" max="200" value={s.cutoff} onChange={e => updateSubject(s.id,'cutoff',e.target.value)}/></label></div>)}</div><form className="inline-form" onSubmit={addSubject}><input value={newName} onChange={e => setNewName(e.target.value)} placeholder="New subject name" required/><button className="primary"><Plus size={16}/> Add subject</button></form></section>}
  </div>
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
  const [fileName, setFileName] = useState('');
  const [selectedClass, setSelectedClass] = useState('All');
  const [selectedDivision, setSelectedDivision] = useState('All');
  const [rows, setRows] = useState(() => read('c360_timetable_rows', []));
  const days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
  const classOptions = [...new Set(rows.map(r => r.className).filter(Boolean))];
  const divisionOptions = [...new Set(rows.filter(r => selectedClass === 'All' || r.className === selectedClass).map(r => r.division).filter(Boolean))];
  const visibleRows = rows.filter(r => (selectedClass === 'All' || r.className === selectedClass) && (selectedDivision === 'All' || r.division === selectedDivision));
  async function upload(e) {
    const file = e.target.files?.[0]; if (!file) return;
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
      const clean = v => String(v ?? '').replace(/\s+/g, ' ').trim();
      const norm = v => clean(v).toLowerCase().replace(/[^a-z0-9]/g, '');
      const days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
      if (!matrix.length) throw new Error('The spreadsheet is empty.');
      const dayName = value => { const v = norm(value); return days.find(d => norm(d) === v || (v.length >= 3 && norm(d).startsWith(v))) || ''; };
      let headerIndex = matrix.findIndex(row => {
        const cells = row.map(norm);
        return cells.some(x => ['day','weekday','days','time','timeslot','period','subject','lecture','division','div','class','branch','room'].includes(x)) && row.some(cell => dayName(cell));
      });
      if (headerIndex < 0) headerIndex = matrix.findIndex(row => row.map(dayName).filter(Boolean).length >= 2);
      let parsed = [];
      if (headerIndex >= 0) {
        const headers = (matrix[headerIndex] || []).map(clean);
        const headerNorms = headers.map(norm);
        const findCol = aliases => {
          for (const alias of aliases) { const exact = headerNorms.findIndex(h => h === alias); if (exact >= 0) return exact; }
          for (const alias of aliases) { const partial = headerNorms.findIndex(h => h && h.includes(alias)); if (partial >= 0) return partial; }
          return -1;
        };
        const dayI = findCol(['day','weekday','days']);
        const timeI = findCol(['time','timeslot','period','lecturetime','timing','fromto']);
        const subjectI = findCol(['subject','subjectname','lecture','paper','topic','coursecode','coursename','activity','classname']);
        const classI = findCol(['class','year','branch','program','department','semester','course']);
        const divI = findCol(['division','div','section','batch']);
        const roomI = findCol(['room','location','venue','classroom']);
        const teacherI = findCol(['teacher','faculty','instructor','staff']);
        if (dayI >= 0 && subjectI >= 0) {
          parsed = matrix.slice(headerIndex + 1).map((row, i) => ({
            id: i, day: dayName(row[dayI]), time: clean(row[timeI]) || 'Time not specified', subject: clean(row[subjectI]) || 'Class / activity',
            room: roomI >= 0 ? clean(row[roomI]) : '', teacher: teacherI >= 0 ? clean(row[teacherI]) : '',
            className: classI >= 0 ? clean(row[classI]) : '', division: divI >= 0 ? clean(row[divI]) : ''
          })).filter(r => r.day && r.subject);
        }
        if (!parsed.length) {
          const header = matrix[headerIndex] || [];
          const dayColumns = header.map((cell, i) => ({ day: dayName(cell), i })).filter(x => x.day);
          if (dayColumns.length >= 2) {
            parsed = matrix.slice(headerIndex + 1).flatMap((row, ri) => dayColumns.flatMap(({day, i}) => {
              const subject = clean(row[i]); if (!subject) return [];
              const time = clean(row[0]) || 'Time not specified';
              const match = subject.match(/\b(?:div(?:ision)?\s*)?([A-H])\b/i);
              return [{ id: `${ri}-${i}`, day, time, subject: subject.replace(/\s+/g,' '), room: '', teacher: '', className: '', division: match ? `Division ${match[1].toUpperCase()}` : '' }];
            }));
          }
        }
      }
      if (!parsed.length) {
        const rowWithDays = matrix.findIndex(row => row.map(dayName).filter(Boolean).length >= 2);
        if (rowWithDays >= 0) {
          const dayColumns = matrix[rowWithDays].map((cell, i) => ({ day: dayName(cell), i })).filter(x => x.day);
          parsed = matrix.slice(rowWithDays + 1).flatMap((row, ri) => dayColumns.flatMap(({day, i}) => {
            const subject = clean(row[i]); if (!subject) return [];
            const time = clean(row[0]) || 'Time not specified';
            const divisionMatch = subject.match(/\b(?:div(?:ision)?\s*)?([A-H])\b/i);
            return [{ id: `${ri}-${i}`, day, time, subject, room: '', teacher: '', className: '', division: divisionMatch ? `Division ${divisionMatch[1].toUpperCase()}` : '' }];
          }));
        }
      }
      if (!parsed.length) throw new Error('Could not detect a timetable. Use a table with Day + Subject columns, or a weekly grid with weekday names across the top.');
      parsed = parsed.map((r, i) => ({ ...r, id: r.id ?? i, className: r.className || 'All classes', division: r.division || 'All divisions' }));
      setRows(parsed); save('c360_timetable_rows', parsed);
      setSelectedClass([...new Set(parsed.map(r => r.className))][0] || 'All'); setSelectedDivision('All');
      const grouped = {}; days.forEach(d => grouped[d] = []);
      parsed.forEach(r => grouped[r.day].push({ time: r.time, subject: r.subject, room: r.room, teacher: r.teacher, className: r.className, division: r.division }));
      setTimetable(grouped); setFileName(file.name); notify(`Imported ${parsed.length} timetable entries. Choose a class and division to filter.`);
    } catch (err) { notify(err.message || 'Could not read this spreadsheet.'); }
    e.target.value = '';
  }
  const shown = rows.length ? visibleRows : Object.entries(timetable).flatMap(([day,items])=>(items||[]).map((item,i)=>({...item,day,id:`${day}-${i}`,className:'Class not specified',division:'Division not specified'}))).filter(r=>days.includes(r.day));
  return <div className="page-stack"><div className="welcome-row"><div><div className="eyebrow"><CalendarDays size={14}/> WEEKLY SCHEDULE</div><h1>Your online timetable</h1><p className="muted">Upload the college spreadsheet, then choose the class and division.</p></div><Badge tone="purple">{shown.length} classes</Badge></div>
    <section className="panel timetable-upload"><div><h2>Import timetable spreadsheet</h2><p className="muted">Excel or CSV. The app detects Day, Subject, Class/Branch and Division columns from the first worksheet.</p><label className="primary upload-label">Choose spreadsheet<input type="file" accept=".xlsx,.xls,.csv" onChange={upload} hidden/></label>{fileName&&<small className="upload-success">Imported: {fileName}</small>}</div><div className="upload-hint"><BookOpen size={28}/><b>Excel or CSV</b><small>Saved locally in this browser.</small></div></section>
    <section className="panel timetable-select-panel"><SectionTitle title="Choose your timetable" sub="Select the class and division you want to display."/>
<div className="timetable-filters">
  <label className="field-label">
    Class / Branch
    <CustomSelect
      ariaLabel="Class / Branch"
      value={selectedClass}
      onChange={(value) => {
        setSelectedClass(value);
        setSelectedDivision('All');
      }}
      options={[
        { value: 'All', label: 'All classes' },
        ...classOptions.map((v) => ({
          value: v,
          label: v,
        })),
      ]}
    />
  </label>

  <label className="field-label">
    Division / Section
    <CustomSelect
      ariaLabel="Division / Section"
      value={selectedDivision}
      onChange={setSelectedDivision}
      options={[
        { value: 'All', label: 'All divisions' },
        ...divisionOptions.map((v) => ({
          value: v,
          label: v,
        })),
      ]}
    />
  </label>
</div>
{!rows.length&&<p className="muted">Upload your timetable spreadsheet to populate the class and division lists.</p>}</section>
    <div className="timetable-grid">{days.map(day=>{const items=shown.filter(r=>r.day===day);return <section className="panel day-card" key={day}><div className="day-heading"><h2>{day}</h2><Badge>{items.length} items</Badge></div>{items.length?items.sort((a,b)=>a.time.localeCompare(b.time)).map((item,i)=><div className="timetable-item" key={`${day}-${item.id ?? i}`}><strong>{item.time}</strong><b>{item.subject}</b>{item.className && item.className!=='Class not specified'&&<small>{item.className}{item.division&&item.division!=='Division not specified'?` · ${item.division}`:''}</small>}{item.room&&<small><MapPin size={12}/> {item.room}</small>}{item.teacher&&<small>{item.teacher}</small>}</div>):<p className="muted">No classes for this selection.</p>}</section>})}</div><p className="table-note"><CircleHelp size={15}/> If your spreadsheet uses different column headings, tell me the headers and I can tune the importer.</p></div>
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
  const locations=[
    {name:'Central Library',category:'Facilities',place:'Library building',detail:'Study spaces, borrowing and reference resources. Confirm current opening hours with campus administration.'},
    {name:'Campus Canteen',category:'Facilities',place:'Student facilities area',detail:'Food and refreshments. Menu, prices and timings should be confirmed with the canteen operator.'},
    {name:'Principal / Director Office',category:'Administration',place:'Administration block',detail:'For formal academic and administrative matters. Confirm office room and visiting hours with VESIT.'},
    {
  name: 'VESIT Rail / Transport Help',
  category: 'Transport',
  place: 'Student support directory',
  detail: 'Access the official VESIT Rail portal for railway-related student services.',
  url: 'https://rail.vesit.ves.ac.in/'
}
    {name:'Reception / Main Desk',category:'Administration',place:'Main entrance',detail:'First point of contact for visitors, directions and general enquiries.'},
    {name:'VES Council',category:'Student bodies',place:'Student council',detail:'Student representation, campus initiatives and student-facing announcements. Confirm current office-bearers with the college.'},
  ]
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
    {selected&&<div className="modal-backdrop" onClick={()=>setSelected(null)}><div className="modal" role="dialog" aria-modal="true" onClick={e=>e.stopPropagation()}><div className="modal-head"><Badge tone="purple">{selected.category}</Badge><button className="icon-button" onClick={()=>setSelected(null)}><X size={18}/></button></div><h2>{selected.name}</h2><p className="muted">{selected.detail}</p><div className="challenge-detail-meta"><span><MapPin size={15}/> {selected.place}</span><span><CircleHelp size={15}/> Check official college contacts for verified hours and phone numbers.</span></div><button className="primary full" onClick={()=>setSelected(null)}>Close details</button></div></div>}
    {selected.url && (
  <p>
    <a
      href={selected.url}
      target="_blank"
      rel="noopener noreferrer"
    >
      Open VESIT Rail Portal →
    </a>
  </p>
)}
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

function SkillSwap({skills,setSkills,profile,notify}) {
  const [showForm,setShowForm]=useState(false)
  const [form,setForm]=useState({name:'',category:'Technology',offer:'Can teach',want:'',contact:''})
  function submit(e){e.preventDefault();setSkills(old=>[{id:Date.now(),...form,owner:profile.name,contact:form.contact||'Campus message'},...old]);setForm({name:'',category:'Technology',offer:'Can teach',want:'',contact:''});setShowForm(false);notify('SkillSwap listing added to this browser prototype.')}
  return <div className="page-stack"><div className="welcome-row"><div><div className="eyebrow"><Users size={14}/> PEER LEARNING COMMUNITY</div><h1>SkillSwap</h1><p className="muted">Learn from classmates, share what you know and find a study partner.</p></div><button className="primary" onClick={()=>setShowForm(true)}><Plus size={15}/> Offer a skill</button></div><div className="stats-grid three"><Stat label="Peer listings" value={skills.length} hint="Skills offered or requested" icon={Users}/><Stat label="Can teach" value={skills.filter(s=>s.offer==='Can teach').length} hint="Share your strengths" icon={BookOpen}/><Stat label="Want to learn" value={skills.filter(s=>s.offer==='Want to learn').length} hint="Discover new skills" icon={Sparkles}/></div><section className="panel"><SectionTitle title="Peer learning exchange" sub="Sample student listings; contact is a demo placeholder."/><div className="skills-grid">{skills.map(s=><article className="skill-card" key={s.id}><div className="skill-card-top"><Badge tone={s.offer==='Can teach'?'green':'purple'}>{s.offer}</Badge><Badge>{s.category}</Badge></div><h3>{s.name}</h3><p>{s.offer==='Can teach'?'Can help peers learn this skill.':'Looking for a peer to learn with.'}</p><div className="skill-wants"><span>Exchange interest</span><b>{s.want || s.wantSkill || 'Open to suggestions'}</b></div><div className="skill-owner"><div className="avatar small">{s.owner.split(' ').map(x=>x[0]).slice(0,2).join('')}</div><span><b>{s.owner}</b><small>{s.contact}</small></span></div><button className="secondary full" onClick={()=>notify(`Contact flow for ${s.owner} is a prototype; no personal details are shared.`)}>Request peer session</button></article>)}</div></section>{showForm&&<div className="modal-backdrop" onClick={()=>setShowForm(false)}><div className="modal modal-wide" onClick={e=>e.stopPropagation()}><div className="modal-head"><h2>Add a SkillSwap listing</h2><button className="icon-button" onClick={()=>setShowForm(false)}><X size={18}/></button></div><form className="modal-form" onSubmit={submit}><label className="field-label">Skill or subject<input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required/></label><div className="form-two"><label className="field-label">Category<select value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>{['Technology','Design','Academic','Communication','Creative','Other'].map(x=><option key={x}>{x}</option>)}</select></label><label className="field-label">I want to<select value={form.offer} onChange={e=>setForm({...form,offer:e.target.value})}><option>Can teach</option><option>Want to learn</option></select></label></div><label className="field-label">Skill to exchange / learn<input value={form.want} onChange={e=>setForm({...form,want:e.target.value})} placeholder="e.g. Figma, Python, public speaking"/></label><label className="field-label">Preferred contact method<input value={form.contact} onChange={e=>setForm({...form,contact:e.target.value})} placeholder="e.g. Campus message"/></label><div className="modal-actions"><button type="button" className="secondary" onClick={()=>setShowForm(false)}>Cancel</button><button className="primary">Publish listing</button></div></form></div></div>}</div>
}

export default App

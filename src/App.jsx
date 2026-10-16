import React, { useEffect, useMemo, useState } from 'react'
import {
  Activity, ArrowDownRight, ArrowRight, Award, BookOpen, CalendarDays, Check,
  ChevronRight, CircleHelp, Clock3, GraduationCap, LayoutDashboard, MapPin,
  Menu, Plus, Search, ShieldCheck, Sparkles, Users, WalletCards, X, Bike,
  Bell, LogOut, LockKeyhole, Target, Trophy
} from 'lucide-react'
import { contacts, events, gradeScale, initialChallenges, initialRides, initialSubjects } from './data'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

const nav = [
  ['Dashboard', LayoutDashboard], ['Academic Planner', GraduationCap], ['Rides', Bike],
  ['Challenges', Trophy], ['Campus Guide', MapPin], ['Campus Pulse', CalendarDays], ['SkillSwap', Users],
]
const read = (key, fallback) => {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback } catch { return fallback }
}
const save = (key, value) => localStorage.setItem(key, JSON.stringify(value))
function Badge({ children, tone = 'slate' }) { return <span className={`badge ${tone}`}>{children}</span> }
function Stat({ label, value, hint, icon: Icon }) { return <div className="stat"><div className="stat-top"><span>{label}</span><span className="icon-box"><Icon size={18}/></span></div><strong>{value}</strong><small>{hint}</small></div> }
function SectionTitle({ title, sub, action }) { return <div className="section-title"><div><h2>{title}</h2>{sub && <p>{sub}</p>}</div>{action}</div> }

function App() {
  const [page, setPage] = useState('Dashboard')
  const [mobileNav, setMobileNav] = useState(false)
  const [subjects, setSubjects] = useState(() => read('c360_subjects', initialSubjects))
  const [rides, setRides] = useState(() => read('c360_rides', initialRides))
  const [challenges, setChallenges] = useState(() => read('c360_challenges', initialChallenges))
  const [eventsList, setEventsList] = useState(() => read('c360_events', events))
  const [profile, setProfile] = useState(() => read('c360_profile', { name: '', year: 'First Year', branch: '', rollNo: '', division: '', interests: 'Technology, Design', subjects: 'Programming, Mathematics' }))
  const [loggedIn, setLoggedIn] = useState(() => read('c360_demo_login', false))
  const [showLogin, setShowLogin] = useState(false)
  const [notice, setNotice] = useState('')
  const [search, setSearch] = useState('')
  const [newRide, setNewRide] = useState({ from: '', to: 'Campus Main Gate', time: '', seats: 2 })
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
  const [authStudent, setAuthStudent] = useState(() => read('c360_profile', {year:'First Year', branch:'', rollNo:'', division:''}))
  const [authError, setAuthError] = useState('')
  useEffect(() => save('c360_subjects', subjects), [subjects])
  useEffect(() => save('c360_rides', rides), [rides])
  useEffect(() => save('c360_challenges', challenges), [challenges])
  useEffect(() => save('c360_events', eventsList), [eventsList])
  useEffect(() => save('c360_assignments', assignments), [assignments])
  useEffect(() => save('c360_skills', skills), [skills])
  useEffect(() => {
    const handleChallengeCreate = (event) => {
      setChallenges(old => [event.detail, ...old]);
      notify('Challenge submitted for review.');
    };
    window.addEventListener('campus360-challenge-create', handleChallengeCreate);
    return () => window.removeEventListener('campus360-challenge-create', handleChallengeCreate);
  }, [])
  useEffect(() => save('c360_profile', profile), [profile])
  useEffect(() => save('c360_demo_login', loggedIn), [loggedIn])
  const points = challenges.filter(c => c.done).reduce((n,c) => n + c.points, 0)
  const marksRows = useMemo(() => subjects.map(s => {
    const needed = s.cutoff - s.internal
    const locked = needed > 100
    const grade = gradeScale.find(g => (s.internal + 60) >= g.min)?.grade || '—'
    return { ...s, needed: Math.max(0, needed), locked, grade }
  }), [subjects])
  const totalCredits = subjects.reduce((a,s) => a + Number(s.credits || 0), 0)
  const targetReachable = subjects.every(s => s.internal + 100 >= s.cutoff && s.internal + 100 >= s.pass)
  function notify(message) { setNotice(message); window.setTimeout(() => setNotice(''), 2800) }
  function navigate(name) { setPage(name); setMobileNav(false) }
  function requestRide(id) {
    setRides(old => old.map(r => r.id === id ? { ...r, status: r.status === 'Available' ? 'Requested' : r.status } : r))
    notify('Seat request saved in this demo.')
  }
  function addRide(e) {
    e.preventDefault()
    if (!newRide.from.trim() || !newRide.time.trim()) return notify('Enter a pickup point and time.')
    setRides(old => [{ ...newRide, id: Date.now(), seats: Number(newRide.seats), status: 'Available', driver: profile.name, verified: false, lat: Number(newRide.lat || 19.0445), lng: Number(newRide.lng || 72.8992) }, ...old])
    setNewRide({ from: '', to: 'Campus Main Gate', time: '', seats: 2 })
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
  async function sendDemoOtp(e) {
    e.preventDefault()
    const digits = authPhone.replace(/\D/g, '')
    if (!authName.trim() || !authStudent.branch?.trim() || !authStudent.rollNo?.trim() || !authStudent.division?.trim()) { setAuthError('Complete your name, year, branch, roll number and division.'); return }
    if (digits.length !== 10) { setAuthError('Enter a valid 10-digit Indian mobile number.'); return }
    setAuthError('')
    try {
      const response = await fetch('/api/auth/send-otp', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({phone:`+91${digits}`}) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Could not send OTP.')
      setAuthOtpSent(true)
      notify(data.message || 'OTP request accepted by MiniMoth.')
    } catch (error) { setAuthError(error.message || 'Unable to send OTP. Check that the backend is running.') }
  }
  async function verifyDemoOtp(e) {
    e.preventDefault()
    if (!/^\d{6}$/.test(authOtp)) { setAuthError('Enter the six-digit OTP.'); return }
    try {
      const digits = authPhone.replace(/\D/g, '')
      const response = await fetch('/api/auth/verify-otp', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({phone:`+91${digits}`,code:authOtp}) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'OTP verification failed.')
      setProfile(p => ({...p, name:authName.trim(), ...authStudent}))
      setLoggedIn(true); setAuthError(''); notify('OTP verified. Student profile saved.')
    } catch (error) { setAuthError(error.message || 'Unable to verify OTP.') }
  }

  if (!loggedIn) return <div className="auth-page">
    <div className="auth-decoration auth-decoration-one"/><div className="auth-decoration auth-decoration-two"/>
    <div className="auth-brand"><div className="brand-mark"><Sparkles size={22}/></div><div><b>Campus<span>360</span></b><small>YOUR COLLEGE COMPANION</small></div></div>
    <div className="auth-layout">
      <section className="auth-intro"><Badge tone="mint"><Sparkles size={13}/> FIRST-YEAR LIFE, SIMPLIFIED</Badge><h1>Your campus.<br/>Your people.<br/><span>Your next step.</span></h1><p>One place to plan your academics, find your way around campus, share rides and learn together.</p><div className="auth-benefits"><div><span><BookOpen size={17}/></span><b>Stay on top of academics</b></div><div><span><Users size={17}/></span><b>Find your campus community</b></div><div><span><MapPin size={17}/></span><b>Make campus feel closer</b></div></div><div className="auth-footnote">Built for first-year students · One connected campus</div></section>
      <section className="auth-card"><div className="auth-card-top"><div className="auth-icon"><ShieldCheck size={22}/></div><span className="secure-label"><LockKeyhole size={12}/> Student access</span></div>
        <h2>{authMode === 'login' ? 'Welcome back' : 'Create your account'}</h2><p className="auth-subtitle">{authMode === 'login' ? 'Sign in with your phone number to continue.' : 'Join Campus360 and make your first year count.'}</p>
        <div className="auth-tabs"><button className={authMode === 'login' ? 'active' : ''} onClick={() => { setAuthMode('login'); setAuthOtpSent(false); setAuthError('') }}>Login</button><button className={authMode === 'signup' ? 'active' : ''} onClick={() => { setAuthMode('signup'); setAuthOtpSent(false); setAuthError('') }}>Sign Up</button></div>
        <label className="auth-label">Full name<input value={authName || profile.name || ''} onChange={e => setAuthName(e.target.value)} placeholder="Enter your full name" autoComplete="name" required/></label>
        <div className="auth-student-grid"><label className="auth-label">Year<select value={authStudent.year || 'First Year'} onChange={e=>setAuthStudent({...authStudent,year:e.target.value})} required><option>First Year</option><option>Second Year</option><option>Third Year</option><option>Final Year</option><option>Postgraduate</option></select></label><label className="auth-label">Branch<input value={authStudent.branch || ''} onChange={e=>setAuthStudent({...authStudent,branch:e.target.value})} placeholder="e.g. Computer Engineering" required/></label><label className="auth-label">Roll number<input value={authStudent.rollNo || ''} onChange={e=>setAuthStudent({...authStudent,rollNo:e.target.value})} placeholder="College roll no." required/></label><label className="auth-label">Division<input value={authStudent.division || ''} onChange={e=>setAuthStudent({...authStudent,division:e.target.value})} placeholder="e.g. A" required/></label></div>
        <form onSubmit={authOtpSent ? verifyDemoOtp : sendDemoOtp} className="auth-form">
          <label className="auth-label">Phone number<div className="phone-input"><span>+91</span><input value={authPhone} onChange={e => { setAuthPhone(e.target.value); setAuthError('') }} placeholder="10-digit mobile number" inputMode="numeric" autoComplete="tel-national" maxLength={10} required disabled={authOtpSent}/></div></label>
          {authOtpSent && <label className="auth-label">One-time password (OTP)<input value={authOtp} onChange={e => { setAuthOtp(e.target.value); setAuthError('') }} placeholder="Enter 6-digit OTP" inputMode="numeric" maxLength={6} required/><small className="demo-otp">Enter the verification code sent to your phone.</small></label>}
          {authError && <div className="auth-error">{authError}</div>}
          {!authOtpSent ? <button className="primary auth-submit" type="submit">Send OTP <ArrowRight size={16}/></button> : <><button className="primary auth-submit" type="submit">Verify OTP and continue <ArrowRight size={16}/></button><button className="auth-back" type="button" onClick={() => { setAuthOtpSent(false); setAuthOtp(''); setAuthError('') }}>Change phone number</button></>}
        </form>
        <div className="auth-divider"><span/> <small>SECURE STUDENT ACCESS</small> <span/></div><p className="auth-legal">By continuing, you agree to use Campus360 respectfully and keep student information private.</p>
        <div className="auth-warning"><b>MiniMoth authentication</b><span>OTP requests are sent through the Campus360 backend. Student identity still needs college-side verification.</span></div>
      </section>
    </div>
    <div className="auth-bottom"><span>© Campus360 · Student-first campus space</span><span><ShieldCheck size={13}/> Student access</span></div>
  </div>

  return <div className="app-shell">
    <aside className={`sidebar ${mobileNav ? 'open' : ''}`}>
      <div className="brand"><div className="brand-mark"><Sparkles size={22}/></div><div><b>Campus<span>360</span></b><small>YOUR COLLEGE COMPANION</small></div><button className="mobile-close" onClick={() => setMobileNav(false)}><X/></button></div>
      <div className="profile-mini"><div className="avatar">{profile.name.split(' ').map(x => x[0]).slice(0,2).join('')}</div><div><b>{profile.name}</b><small>First-year student</small></div><Badge tone="green">FY</Badge></div>
      <div className="nav-label">YOUR CAMPUS</div>
      <nav>{nav.map(([name, Icon]) => <button key={name} className={`nav-item ${page === name ? 'active' : ''}`} onClick={() => navigate(name)}><Icon size={18}/><span>{name}</span>{name === 'Challenges' && <span className="nav-count">{challenges.length}</span>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="help-card"><div className="help-icon"><CircleHelp size={18}/></div><b>Need a hand?</b><p>Find the right person to help you on campus.</p><button onClick={() => navigate('Campus Guide')}>Get help <ArrowRight size={14}/></button></div><div className="sidebar-foot"><ShieldCheck size={15}/> Student-first campus space</div></div>
    </aside>
    {mobileNav && <button className="scrim" onClick={() => setMobileNav(false)} aria-label="Close menu"/>}
    <main className="main-area">
      <header className="topbar"><div className="topbar-left"><button className="mobile-menu" onClick={() => setMobileNav(true)}><Menu/></button><div className="crumb">Campus / <b>{page}</b></div></div><div className="top-actions"><span className="today-date"><CalendarDays size={15}/>{new Date().toLocaleDateString('en-IN',{weekday:'short',day:'2-digit',month:'short',year:'numeric'})}</span><label className="searchbox"><Search size={16}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search campus..."/></label><button className="icon-button" title="Notifications" onClick={() => notify('You are all caught up!')}><Bell size={18}/><i/></button><button className="user-button" onClick={() => setShowLogin(true)}><div className="avatar small">{profile.name.split(' ').map(x => x[0]).slice(0,2).join('')}</div><span>{loggedIn ? 'Account' : 'Demo profile'}</span><ChevronRight size={15}/></button></div></header>
      <div className="page-content">
        {page === 'Dashboard' && <Dashboard profile={profile} setProfile={setProfile} marksRows={marksRows} rides={rides} challenges={challenges} points={points} eventsList={eventsList} navigate={navigate} notify={notify} assignments={assignments} />}
        {page === 'Academic Planner' && <AcademicPlanner subjects={subjects} setSubjects={setSubjects} marksRows={marksRows} targetSgpa={targetSgpa} setTargetSgpa={setTargetSgpa} totalCredits={totalCredits} targetReachable={targetReachable} updateSubject={updateSubject} profile={profile} activeTab={activeTab} setActiveTab={setActiveTab} notify={notify}/>}
        {page === 'Rides' && <Rides rides={rides} requestRide={requestRide} newRide={newRide} setNewRide={setNewRide} addRide={addRide} search={search}/>}
        {page === 'Challenges' && <Challenges challenges={challenges} points={points} newChallenge={newChallenge} setNewChallenge={setNewChallenge} addChallenge={addChallenge} toggleChallenge={toggleChallenge}/>}
        {page === 'Campus Guide' && <CampusGuide search={search} eventsList={eventsList} setEventsList={setEventsList} notify={notify}/>}
        {page === 'Campus Pulse' && <CampusPulse eventsList={eventsList} setEventsList={setEventsList} assignments={assignments} setAssignments={setAssignments} notify={notify}/>}
        {page === 'SkillSwap' && <SkillSwap skills={skills} setSkills={setSkills} profile={profile} notify={notify}/>}
      </div>
      <footer className="footer"><span>Campus360 · Built for first-year life</span><span><span className="pulse-dot"/> Demo environment · Sample data</span></footer>
    </main>
    {showLogin && <div className="modal-backdrop" onClick={() => setShowLogin(false)}><div className="modal" onClick={e => e.stopPropagation()}><div className="modal-head"><div className="icon-box purple"><LockKeyhole size={20}/></div><button className="icon-button" onClick={() => setShowLogin(false)}><X size={18}/></button></div><h2>{loggedIn ? 'Demo account' : 'Welcome to Campus360'}</h2><p className="muted">This starter currently uses a demo sign-in state. Connect MiniMoth OTP before presenting authentication as complete.</p><label className="field-label">Student display name<input value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))}/></label><label className="field-label">Interests<input value={profile.interests} onChange={e => setProfile(p => ({ ...p, interests: e.target.value }))}/></label><label className="field-label">Subjects<input value={profile.subjects} onChange={e => setProfile(p => ({ ...p, subjects: e.target.value }))}/></label><div className="form-two"><label className="field-label">Year<select value={profile.year || 'First Year'} onChange={e=>setProfile(p=>({...p,year:e.target.value}))}><option>First Year</option><option>Second Year</option><option>Third Year</option><option>Final Year</option><option>Postgraduate</option></select></label><label className="field-label">Branch<input value={profile.branch || ''} onChange={e=>setProfile(p=>({...p,branch:e.target.value}))}/></label></div><div className="form-two"><label className="field-label">Roll number<input value={profile.rollNo || ''} onChange={e=>setProfile(p=>({...p,rollNo:e.target.value}))}/></label><label className="field-label">Division<input value={profile.division || ''} onChange={e=>setProfile(p=>({...p,division:e.target.value}))}/></label></div><button className="primary full" onClick={() => { setLoggedIn(!loggedIn); setShowLogin(false); notify(loggedIn ? 'Demo session ended.' : 'Demo profile saved. MiniMoth integration still required.') }}>{loggedIn ? <><LogOut size={16}/> End demo session</> : <><ShieldCheck size={16}/> Continue in demo mode</>}</button><small className="warning-note">Not real OTP authentication. Implement MiniMoth token/session flows for the final submission.</small></div></div>}
    {notice && <div className="toast"><Check size={17}/>{notice}</div>}
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
    { title: `Explore ${profile.branch || 'your branch'} opportunities`, detail: `Find events, peer learning and notices for ${profile.year || 'your year'} · Division ${profile.division || '—'}.`, icon: GraduationCap, page: 'Campus Pulse' },
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
    <section className="panel"><SectionTitle title="Campus shortcuts" sub="Go straight to the things you use most."/><div className="quick-grid"><button onClick={() => navigate('Rides')}><div className="quick-icon qi-blue"><Bike/></div><b>Campus Ride</b><small>Find or offer a ride.</small><ArrowRight size={16}/></button><button onClick={() => navigate('SkillSwap')}><div className="quick-icon qi-green"><Users/></div><b>Peer learning & SkillSwap</b><small>Teach, learn and connect.</small><ArrowRight size={16}/></button><button onClick={() => navigate('Challenges')}><div className="quick-icon qi-purple"><Trophy/></div><b>Challenges</b><small>Join community activities.</small><ArrowRight size={16}/></button><button onClick={() => navigate('Campus Guide')}><div className="quick-icon qi-amber"><MapPin/></div><b>Campus Directory</b><small>Find offices, clubs and services.</small><ArrowRight size={16}/></button></div></section>
  </div>
}

function AcademicPlanner({ subjects, setSubjects, marksRows, targetSgpa, setTargetSgpa, totalCredits, targetReachable, updateSubject, profile, activeTab, setActiveTab, notify }) {
  const [whatIf, setWhatIf] = useState(false)
  const [internalBump, setInternalBump] = useState(5)
  const [newName, setNewName] = useState('')
  const sgpa = subjects.length ? subjects.reduce((sum,s) => sum + Number(s.credits) * (gradeScale.find(g => s.internal >= g.min)?.points || 5), 0) / Math.max(totalCredits,1) : 0
  const neededTotal = marksRows.reduce((n,r) => n + r.needed, 0)
  function addSubject(e) { e.preventDefault(); if (!newName.trim()) return; setSubjects(old => [...old, { id: Date.now(), name: newName.trim(), credits: 3, internal: 20, cutoff: 40, pass: 40, target: 'B' }]); setNewName(''); notify('Subject added.') }
  return <div className="page-stack">
    <div className="welcome-row"><div><div className="eyebrow"><GraduationCap size={14}/> ACADEMIC CONTROL CENTRE</div><h1>Academic planner</h1><p className="muted">Know where you stand, and what it takes to reach your goals.</p></div><button className={`secondary ${whatIf ? 'selected' : ''}`} onClick={() => setWhatIf(!whatIf)}><Sparkles size={16}/>{whatIf ? 'Close what-if' : 'What-if scenario'}</button></div>
    <TimetableTools profile={profile} notify={notify}/>
    <div className="stats-grid three"><Stat label="Subjects" value={subjects.length} hint="Currently being tracked" icon={BookOpen}/><Stat label="Total credits" value={totalCredits} hint="Across selected subjects" icon={WalletCards}/><Stat label="Indicative SGPA" value={sgpa.toFixed(2)} hint="Illustrative grade-point estimate" icon={Target}/></div>
    {whatIf && <div className="panel whatif"><div><Badge tone="purple">WHAT-IF MODE</Badge><h3>What if your internal marks improve?</h3><p className="muted">Preview a scenario by adding hypothetical marks to each subject's internal score. This does not change your saved marks.</p></div><div className="whatif-control"><label>Internal marks change <b>+{internalBump}</b></label><input type="range" min="0" max="20" step="5" value={internalBump} onChange={e => setInternalBump(Number(e.target.value))}/><div className="mini-result">Projected subjects meeting cutoff: <b>{subjects.filter(s => s.internal + internalBump + 60 >= s.cutoff).length}/{subjects.length}</b></div></div></div>}
    <div className="tab-row"><button className={activeTab === 'Planner' ? 'active' : ''} onClick={() => setActiveTab('Planner')}>Marks planner</button><button className={activeTab === 'SGPA' ? 'active' : ''} onClick={() => setActiveTab('SGPA')}>Target SGPA</button><button className={activeTab === 'Profile' ? 'active' : ''} onClick={() => setActiveTab('Profile')}>Subjects & credits</button></div>
    {activeTab === 'Planner' && <section className="panel"><SectionTitle title="Marks-needed table" sub="Sample rule: required total minus internal marks scored. Replace with your institution's official grading rules."/><div className="table-wrap"><table><thead><tr><th>Subject</th><th>Credits</th><th>Internal</th><th>Target cutoff</th><th>Marks needed</th><th>Status</th></tr></thead><tbody>{marksRows.map(s=><tr key={s.id}><td><b>{s.name}</b><small className="cell-sub">Pass minimum: {s.pass}</small></td><td>{s.credits}</td><td>{s.internal}</td><td>{s.cutoff}</td><td><b>{s.needed}</b> / 100</td><td>{s.locked ? <Badge tone="red">Grade locked</Badge> : s.needed > 100-s.internal ? <Badge tone="amber">At risk</Badge> : <Badge tone="green">Possible</Badge>}</td></tr>)}</tbody></table></div><div className="table-note"><CircleHelp size={15}/> Illustrative calculator only. Final grade locking and passing logic must follow official subject-wise exam rules.</div></section>}
    {activeTab === 'SGPA' && <section className="panel"><SectionTitle title="Target SGPA check" sub="Set a target and review a transparent, illustrative feasibility result."/><div className="sgpa-layout"><div className="target-card"><label className="field-label">Your target SGPA<input type="number" min="0" max="10" step=".1" value={targetSgpa} onChange={e => setTargetSgpa(e.target.value)}/></label><div className="big-number">{Number(targetSgpa || 0).toFixed(1)}<small> / 10</small></div><p className="muted">Based on your subject credits and the grade-point model configured for this demo.</p></div><div className="feasibility"><div className="feasibility-icon"><Target size={24}/></div><Badge tone={targetReachable && Number(targetSgpa) <= 10 ? 'green' : 'red'}>{targetReachable && Number(targetSgpa) <= 10 ? 'Potentially achievable' : 'Not achievable with current assumptions'}</Badge><h3>{targetReachable && Number(targetSgpa) <= 10 ? 'Keep working towards it.' : 'Review your target.'}</h3><p className="muted">This preliminary check confirms whether the configured maximum marks and pass conditions permit the target. A production-ready result must calculate achievable grade-point combinations across credits.</p></div></div></section>}
    {activeTab === 'Profile' && <section className="panel"><SectionTitle title="Subjects & credits" sub="Edit demo values or add a subject."/><div className="subject-editor">{subjects.map(s=><div className="subject-edit-row" key={s.id}><b>{s.name}</b><label>Credits<input type="number" min="1" max="10" value={s.credits} onChange={e => updateSubject(s.id,'credits',e.target.value)}/></label><label>Internal<input type="number" min="0" max="100" value={s.internal} onChange={e => updateSubject(s.id,'internal',e.target.value)}/></label><label>Cutoff<input type="number" min="0" max="200" value={s.cutoff} onChange={e => updateSubject(s.id,'cutoff',e.target.value)}/></label></div>)}</div><form className="inline-form" onSubmit={addSubject}><input value={newName} onChange={e => setNewName(e.target.value)} placeholder="New subject name" required/><button className="primary"><Plus size={16}/> Add subject</button></form></section>}
  </div>
}

function TimetableTools({ profile, notify }) {
  const today = new Date().toISOString().slice(0,10)
  const [selectedDate, setSelectedDate] = useState(today)
  const [rows, setRows] = useState(() => read('c360_timetable_rows', []))
  const [history, setHistory] = useState(() => read('c360_timetable_history', {}))
  const [submissions, setSubmissions] = useState(() => read('c360_submission_history', {}))
  const [viewType, setViewType] = useState('timetable')
  const [uploadName, setUploadName] = useState('')
  useEffect(() => save('c360_timetable_rows', rows), [rows])
  useEffect(() => save('c360_timetable_history', history), [history])
  useEffect(() => save('c360_submission_history', submissions), [submissions])
  function parseDelimited(text) {
    const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter(line => line.trim())
    if (lines.length < 2) throw new Error('The file needs a header row and at least one timetable row.')
    const delimiter = lines[0].includes('\t') ? '\t' : ','
    const split = line => line.split(delimiter).map(v => v.trim().replace(/^"|"$/g, ''))
    const headers = split(lines[0])
    return lines.slice(1).map(line => Object.fromEntries(split(line).map((v,i)=>[headers[i] || `Column ${i+1}`,v])))
  }
  function uploadFile(file) {
    if (!file) return
    if (!/\.(csv|tsv|txt)$/i.test(file.name)) { notify('For this prototype, upload a CSV, TSV or TXT timetable. Export Excel/PDF timetables as CSV first.'); return }
    const reader = new FileReader()
    reader.onload = () => {
      try { const parsed=parseDelimited(String(reader.result || '')); setRows(parsed); setUploadName(file.name); notify(`Loaded ${parsed.length} timetable rows.`) }
      catch (e) { notify(e.message || 'Could not read the timetable file.') }
    }
    reader.readAsText(file)
  }
  const keys = rows.length ? Object.keys(rows[0]) : []
  const divisionKey = keys.find(k => /division|div/i.test(k))
  const branchKey = keys.find(k => /branch|department|stream/i.test(k))
  const filteredRows = rows.filter(row => (!divisionKey || !profile?.division || String(row[divisionKey]).toLowerCase() === String(profile.division).toLowerCase() || /all|common/i.test(String(row[divisionKey]))) && (!branchKey || !profile?.branch || String(row[branchKey]).toLowerCase().includes(String(profile.branch).toLowerCase()) || /all|common/i.test(String(row[branchKey]))))
  function saveSnapshot() {
    if (viewType === 'timetable') {
      if (!rows.length) { notify('Upload a timetable before saving a snapshot.'); return }
      setHistory(old => ({...old,[selectedDate]:rows})); notify(`Timetable snapshot saved for ${selectedDate}.`)
    } else {
      setSubmissions(old => ({...old,[selectedDate]:old[selectedDate] || []})); notify(`Submission-history date opened for ${selectedDate}. Add records in your college portal when connected.`)
    }
  }
  const visibleRows = viewType === 'timetable' ? (history[selectedDate] || filteredRows) : (submissions[selectedDate] || [])
  function downloadCsv() {
    if (!filteredRows.length) { notify('No timetable rows to export.'); return }
    const csv=[keys.join(','),...filteredRows.map(r=>keys.map(k=>`"${String(r[k] ?? '').replace(/"/g,'""')}"`).join(','))].join('\r\n')
    const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'})); const a=document.createElement('a'); a.href=url; a.download='Campus360_Timetable.csv'; a.click(); URL.revokeObjectURL(url)
  }
  return <section className="panel timetable-tools"><SectionTitle title="Timetable & academic history" sub="Upload a division-wise timetable, view your division's rows, export as a spreadsheet, or revisit saved dates."/><div className="timetable-controls"><label className="field-label">History date<input type="date" value={selectedDate} max={today} onChange={e=>setSelectedDate(e.target.value)}/></label><label className="field-label">History type<select value={viewType} onChange={e=>setViewType(e.target.value)}><option value="timetable">Previous timetable</option><option value="submissions">Previous submissions</option></select></label><button className="secondary" onClick={saveSnapshot}>Save / open date</button></div><div className="timetable-upload"><label className="field-label">Upload timetable file (CSV, TSV or TXT)<input type="file" accept=".csv,.tsv,.txt,text/csv,text/plain" onChange={e=>uploadFile(e.target.files?.[0])}/></label><p className="muted">{uploadName ? `Loaded: ${uploadName}` : 'Recommended columns: Day, Time, Division, Branch, Subject, Room, Faculty. Excel/PDF files must be exported to CSV first in this prototype.'}</p><div className="timetable-actions"><button className="secondary" onClick={downloadCsv}>Export filtered spreadsheet (CSV)</button><span className="muted">Profile filter: {profile?.branch || 'branch not set'} · Division {profile?.division || 'not set'}</span></div></div>{viewType==='submissions' ? <div className="empty-history"><b>Submission history for {selectedDate}</b><p className="muted">This prototype has no college LMS connection yet, so historical submissions cannot be fetched automatically. Saved dates are placeholders until an official data source is connected.</p></div> : visibleRows.length ? <div className="table-wrap"><table><thead><tr>{Object.keys(visibleRows[0]).map(k=><th key={k}>{k}</th>)}</tr></thead><tbody>{visibleRows.map((r,i)=><tr key={i}>{Object.keys(visibleRows[0]).map(k=><td key={k}>{r[k]}</td>)}</tr>)}</tbody></table></div> : <p className="muted">Upload a timetable to display rows for your division. Use “Save / open date” to keep a snapshot against the selected date.</p>}</section>
}

const rideMarkerIcon = L.divIcon({ className: 'ride-map-marker', html: '<span></span>', iconSize: [22,22], iconAnchor: [11,11] })
function Rides({ rides, requestRide, newRide, setNewRide, addRide, search }) {
  const [showForm, setShowForm] = useState(false)
  const filtered = rides.filter(r => `${r.from} ${r.to} ${r.driver}`.toLowerCase().includes(search.toLowerCase()))
  return <div className="page-stack"><div className="welcome-row"><div><div className="eyebrow"><Bike size={14}/> CAMPUS MOBILITY</div><h1>Get there together.</h1><p className="muted">Discover student rides and coordinate your commute.</p></div><button className="primary" onClick={() => setShowForm(true)}><Plus size={16}/> Offer a ride</button></div>
    <div className="stats-grid three"><Stat label="Listed rides" value={rides.length} hint="Student ride offers" icon={Bike}/><Stat label="Available seats" value={rides.filter(r => r.status === 'Available').reduce((n,r)=>n+Number(r.seats||0),0)} hint="Across available rides" icon={Users}/><Stat label="Pending requests" value={rides.filter(r => r.status === 'Requested').length} hint="Prototype requests" icon={Clock3}/></div>
    <section className="panel"><SectionTitle title="Campus and pickup map" sub="OpenStreetMap · Leaflet. Markers are approximate demo pickup locations."/><div className="leaflet-map-wrap"><MapContainer center={[19.0445,72.8992]} zoom={13} scrollWheelZoom={false} style={{height:'330px',width:'100%'}}><TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/><Marker position={[19.0445,72.8992]} icon={rideMarkerIcon}><Popup>VESIT campus area (approximate)</Popup></Marker>{filtered.map((r,i)=><Marker key={r.id} position={[Number(r.lat || (19.0445+(i+1)*0.002)),Number(r.lng || (72.8992+(i+1)*0.002))]} icon={rideMarkerIcon}><Popup><b>{r.from} → {r.to}</b><br/>{r.time}<br/>Offered by {r.driver}</Popup></Marker>)}</MapContainer></div><p className="map-disclaimer">For privacy, the map uses approximate points. Do not publish live student location or personal contact details.</p></section>
    <section className="panel"><SectionTitle title="Available student rides" sub="Phone OTP does not prove college enrollment. Student IDs are not verified yet."/><div className="ride-list">{filtered.map(r=><div className="panel ride-card" key={r.id}><div className="ride-icon"><Bike size={23}/></div><div className="ride-main"><div className="ride-route"><b>{r.from}</b><ArrowRight size={15}/><b>{r.to}</b></div><p><Clock3 size={14}/>{r.time}<span className="separator">·</span><Users size={14}/>{r.seats} seats <span className="separator">·</span>Offered by {r.driver}</p><div className="ride-meta"><Badge tone={r.status === 'Available' ? 'green' : r.status === 'Requested' ? 'amber' : 'purple'}>{r.status}</Badge><Badge tone="green"><ShieldCheck size={12}/> {r.verified ? 'College verified' : 'Student ID not verified'}</Badge></div></div><button className={r.status === 'Available' ? 'primary' : 'secondary'} disabled={r.status !== 'Available'} onClick={() => requestRide(r.id)}>{r.status === 'Available' ? 'Request seat' : r.status}<ArrowRight size={15}/></button></div>)}</div></section>
    {showForm && <div className="modal-backdrop" onClick={() => setShowForm(false)}><div className="modal modal-wide" role="dialog" aria-modal="true" aria-labelledby="ride-modal-title" onClick={e => e.stopPropagation()}><div className="modal-head"><div><h2 id="ride-modal-title">Offer a campus ride</h2><p className="muted">Add route details for other students.</p></div><button className="icon-button" onClick={() => setShowForm(false)} aria-label="Close"><X size={18}/></button></div><form className="ride-form" onSubmit={e=>{addRide(e);setShowForm(false)}}><label className="field-label">Pickup point<input value={newRide.from} onChange={e=>setNewRide({...newRide,from:e.target.value})} placeholder="e.g. Chembur Station" required/></label><label className="field-label">Destination<input value={newRide.to} onChange={e=>setNewRide({...newRide,to:e.target.value})} placeholder="e.g. VESIT campus" required/></label><label className="field-label">Departure time<input value={newRide.time} onChange={e=>setNewRide({...newRide,time:e.target.value})} placeholder="e.g. 8:30 AM" required/></label><label className="field-label">Available seats<input type="number" min="1" max="8" value={newRide.seats} onChange={e=>setNewRide({...newRide,seats:e.target.value})} required/></label><label className="field-label">Pickup latitude (optional)<input type="number" step="any" value={newRide.lat || ''} onChange={e=>setNewRide({...newRide,lat:e.target.value})} placeholder="Approximate map latitude"/></label><label className="field-label">Pickup longitude (optional)<input type="number" step="any" value={newRide.lng || ''} onChange={e=>setNewRide({...newRide,lng:e.target.value})} placeholder="Approximate map longitude"/></label><div className="ride-verification-note"><ShieldCheck size={16}/> Phone OTP verifies control of a number only. College enrollment / student ID verification is not connected yet, so this ride will be labelled unverified.</div><div className="modal-actions"><button type="button" className="secondary" onClick={()=>setShowForm(false)}>Cancel</button><button className="primary" type="submit">Publish ride <ArrowRight size={16}/></button></div></form></div></div>}
  </div>
}

function Challenges({ challenges, points, newChallenge, setNewChallenge, addChallenge, toggleChallenge }) {
  const [showPost, setShowPost] = useState(false)
  const [detailChallenge, setDetailChallenge] = useState(null)
  const [form, setForm] = useState({title:'',description:'',className:'All VESIT students',points:25,contact:'',category:'Community'})
  const [role, setRole] = useState(() => read('c360_demo_role','Student'))
  const [verifiedRole, setVerifiedRole] = useState('')
  const [adminCode, setAdminCode] = useState('')
  const [codeError, setCodeError] = useState('')
  const canPost = Boolean(verifiedRole)
  const ranking = [{name:'Aarav M.',points:180},{name:'You',points},{name:'Sana K.',points:115}].sort((a,b)=>b.points-a.points)
  function submitChallenge(e) { e.preventDefault(); if(!canPost) return; const item={id:Date.now(),title:form.title.trim(),description:form.description.trim(),className:form.className,points:Number(form.points),contact:form.contact.trim(),category:form.category,done:false,status:'Pending approval',createdBy:role}; addChallenge({preventDefault(){}}); /* parent callback is retained for compatibility */ setNewChallenge(form.title.trim()); const event = new Event('submit'); void event; window.dispatchEvent(new CustomEvent('campus360-challenge-create',{detail:item})); setShowPost(false); setForm({title:'',description:'',className:'All VESIT students',points:25,contact:'',category:'Community'}); }
  return <div className="page-stack"><div className="welcome-row"><div><div className="eyebrow"><Trophy size={14}/> CAMPUS COMMUNITY</div><h1>Challenges that bring us together.</h1><p className="muted">Join campus activities, help your peers and earn points.</p></div><Badge tone="purple"><Trophy size={15}/> {points} points earned</Badge></div>
    <section className="panel"><SectionTitle title="Challenge board" sub="Open a challenge to read the details. New posts require a representative role." action={<button className="primary" onClick={()=>{setShowPost(true);setCodeError('');setAdminCode('')}}><Plus size={15}/> Post challenge</button>}/><div className="challenge-role-row"><p className="muted">Official challenge posts require a council, faculty or class representative admin code.</p></div><div className="challenge-list">{challenges.map(c=><div className={`challenge-row ${c.done?'completed':''}`} key={c.id}><button className={`check-circle ${c.done?'checked':''}`} onClick={()=>toggleChallenge(c.id)} aria-label={c.done?'Mark incomplete':'Complete challenge'}>{c.done&&<Check size={16}/>}</button><div className="challenge-info"><b>{c.title}</b><small>{c.className || 'All VESIT students'} · {c.category || 'Community'}</small></div><Badge tone={c.done?'green':c.status==='Pending approval'?'amber':'purple'}>{c.done?'Completed':c.status || 'Open'}</Badge><strong className="points">+{c.points} pts</strong><button className="secondary compact" onClick={()=>setDetailChallenge(c)}>View challenge</button></div>)}</div></section>
    <section className="panel"><SectionTitle title="Class leaderboard" sub="Sample points for demonstration."/><div className="leaderboard">{ranking.map((r,i)=><div className="leader-row" key={r.name}><div className={`rank rank-${i+1}`}>{i+1}</div><div className="avatar small">{r.name.split(' ').map(x=>x[0]).join('')}</div><b>{r.name}</b>{r.name==='You'&&<Badge tone="purple">You</Badge>}<strong>{r.points} pts</strong></div>)}</div></section>
    {showPost&&<div className="modal-backdrop" onClick={()=>setShowPost(false)}><div className="modal modal-wide" role="dialog" aria-modal="true" onClick={e=>e.stopPropagation()}><div className="modal-head"><div><h2>Post a challenge</h2><p className="muted">Only class reps, cultural reps and club admins should publish official challenges.</p></div><button className="icon-button" onClick={()=>setShowPost(false)}><X size={18}/></button></div>{!canPost?<div className="role-gate"><ShieldCheck size={24}/><b>Representative access required</b><p>Enter the admin code assigned to your council, faculty or class representative.</p><label className="field-label">Admin code<input value={adminCode} onChange={e=>{setAdminCode(e.target.value);setCodeError('')}} placeholder="Enter your issued code" autoComplete="off"/></label>{codeError&&<p className="auth-error">{codeError}</p>}<button className="primary full" onClick={()=>{const codes={'C360-CR-A-2026':'Class Representative','C360-CR-B-2026':'Class Representative','C360-CULT-2026':'Cultural Representative','C360-CLUB-TECH-2026':'Club Admin','C360-CLUB-CULT-2026':'Club Admin','C360-FAC-2026':'Faculty'};const matched=codes[adminCode.trim().toUpperCase()];if(!matched){setCodeError('Invalid code. Contact the Campus360 administrator.');return;}setRole(matched);setVerifiedRole(matched);setCodeError('');notify(`Access granted for ${matched}.`)}}>Verify code</button><small className="warning-note">Prototype codes are stored in frontend code and are not secure for production. Move code validation to the backend before launch.</small></div>:<form className="modal-form" onSubmit={e=>{e.preventDefault();const item={id:Date.now(),title:form.title.trim(),description:form.description.trim(),className:form.className,points:Number(form.points),contact:form.contact.trim(),category:form.category,done:false,status:'Pending approval',createdBy:role};window.dispatchEvent(new CustomEvent('campus360-challenge-create',{detail:item}));setShowPost(false);setForm({title:'',description:'',className:'All VESIT students',points:25,contact:'',category:'Community'});}}><label className="field-label">Challenge title<input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} required maxLength={90}/></label><label className="field-label">Short description<textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} required rows={3} placeholder="What should participants do?"/></label><div className="form-two"><label className="field-label">Target group<input value={form.className} onChange={e=>setForm({...form,className:e.target.value})} required/></label><label className="field-label">Category<select value={form.category} onChange={e=>setForm({...form,category:e.target.value})}><option>Community</option><option>Cultural</option><option>Academic</option><option>Sports</option><option>Sustainability</option></select></label></div><div className="form-two"><label className="field-label">Credit points<input type="number" min="0" max="500" value={form.points} onChange={e=>setForm({...form,points:e.target.value})} required/></label><label className="field-label">Contact person / role<input value={form.contact} onChange={e=>setForm({...form,contact:e.target.value})} placeholder="e.g. Cultural Secretary" required/></label></div><div className="modal-actions"><button type="button" className="secondary" onClick={()=>setShowPost(false)}>Cancel</button><button type="submit" className="primary">Submit for review <ArrowRight size={15}/></button></div></form>}</div></div>}
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
    {name:'VESIT Rail / Transport Help',category:'Transport',place:'Student support directory',detail:'Transport and railway commute information. This is a directory placeholder; confirm the official contact before relying on it.'},
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
    {selected&&<div className="modal-backdrop" onClick={()=>setSelected(null)}><div className="modal" role="dialog" aria-modal="true" onClick={e=>e.stopPropagation()}><div className="modal-head"><Badge tone="purple">{selected.category}</Badge><button className="icon-button" onClick={()=>setSelected(null)}><X size={18}/></button></div><h2>{selected.name}</h2><p className="muted">{selected.detail}</p><div className="challenge-detail-meta"><span><MapPin size={15}/> {selected.place}</span><span><CircleHelp size={15}/> Check official college contacts for verified hours and phone numbers.</span></div><button className="primary full" onClick={()=>setSelected(null)}>Close details</button></div></div>}
  </div>
}

function CampusPulse({eventsList,setEventsList,assignments,setAssignments,notify}) {
  const [tab,setTab]=useState('Events')
  const [showEventForm,setShowEventForm]=useState(false)
  const [showAssignmentForm,setShowAssignmentForm]=useState(false)
  const [eventForm,setEventForm]=useState({name:'',time:'',description:'',state:'Registration Open',category:'Campus event'})
  const [assignmentForm,setAssignmentForm]=useState({title:'',subject:'',due:'',priority:'Medium'})
  function addEvent(e){e.preventDefault();setEventsList(old=>[{id:Date.now(),name:eventForm.name.trim(),time:eventForm.time,description:eventForm.description,state:eventForm.state,category:eventForm.category},...old]);setEventForm({name:'',time:'',description:'',state:'Registration Open',category:'Campus event'});setShowEventForm(false);notify('Event added to this browser prototype.')}
  function addAssignment(e){e.preventDefault();setAssignments(old=>[{id:Date.now(),...assignmentForm},...old]);setAssignmentForm({title:'',subject:'',due:'',priority:'Medium'});setShowAssignmentForm(false);notify('Assignment deadline added.')}
  return <div className="page-stack"><div className="welcome-row"><div><div className="eyebrow"><CalendarDays size={14}/> CAMPUS UPDATES</div><h1>Campus Pulse</h1><p className="muted">Events, notices and assignment deadlines in one place.</p></div><Badge tone="purple">{eventsList.length} events</Badge></div><div className="tab-row"><button className={tab==='Events'?'active':''} onClick={()=>setTab('Events')}>Events & notices</button><button className={tab==='Assignments'?'active':''} onClick={()=>setTab('Assignments')}>Assignment deadlines</button></div>
    {tab==='Events'?<section className="panel"><SectionTitle title="Campus events" sub="Event state changes here are local demo actions, not official event updates." action={<button className="primary" onClick={()=>setShowEventForm(true)}><Plus size={15}/> Add event</button>}/><div className="event-list">{eventsList.map((ev,i)=><div className="event-row event-row-wide" key={ev.id||ev.name}><div className={`event-date ed-${i%3}`}><CalendarDays size={20}/><small>{ev.time.split('·')[0].trim().toUpperCase()}</small></div><div className="event-info"><b>{ev.name}</b><small>{ev.time}</small>{ev.description&&<small>{ev.description}</small>}<Badge tone={ev.state==='Live Now'?'green':ev.state==='Event Ended'?'slate':ev.state==='Starting Soon'?'amber':'purple'}>{ev.state}</Badge></div><button className="secondary compact" onClick={()=>setEventsList(old=>old.map(x=>(x.id||x.name)===(ev.id||ev.name)?{...x,state:['Registration Open','Starting Soon','Live Now','Event Ended'][( ['Registration Open','Starting Soon','Live Now','Event Ended'].indexOf(x.state)+1)%4]}:x))}>Update status</button></div>)}</div></section>:<section className="panel"><SectionTitle title="Assignment deadlines" sub="Stored in this browser until a shared database is configured." action={<button className="primary" onClick={()=>setShowAssignmentForm(true)}><Plus size={15}/> Add deadline</button>}/><div className="assignment-list">{assignments.map(a=><div className="assignment-row" key={a.id}><div className="assignment-date"><CalendarDays size={17}/><span>{a.due?new Date(`${a.due}T00:00:00`).toLocaleDateString('en-IN',{day:'2-digit',month:'short'}):'No date'}</span></div><div className="assignment-copy"><b>{a.title}</b><small>{a.subject}</small></div><Badge tone={a.priority==='High'?'red':a.priority==='Medium'?'amber':'green'}>{a.priority}</Badge><button className="icon-button" aria-label="Delete deadline" onClick={()=>setAssignments(old=>old.filter(x=>x.id!==a.id))}><X size={16}/></button></div>)}</div></section>}
    {showEventForm&&<div className="modal-backdrop" onClick={()=>setShowEventForm(false)}><div className="modal modal-wide" onClick={e=>e.stopPropagation()}><div className="modal-head"><h2>Add campus event</h2><button className="icon-button" onClick={()=>setShowEventForm(false)}><X size={18}/></button></div><form className="modal-form" onSubmit={addEvent}><label className="field-label">Event name<input value={eventForm.name} onChange={e=>setEventForm({...eventForm,name:e.target.value})} required/></label><label className="field-label">Date and time<input value={eventForm.time} onChange={e=>setEventForm({...eventForm,time:e.target.value})} placeholder="e.g. 18 Oct · 3:00 PM" required/></label><label className="field-label">Short description<textarea rows={3} value={eventForm.description} onChange={e=>setEventForm({...eventForm,description:e.target.value})}/></label><div className="form-two"><label className="field-label">Category<select value={eventForm.category} onChange={e=>setEventForm({...eventForm,category:e.target.value})}><option>Campus event</option><option>Notice</option><option>Workshop</option><option>Club</option><option>Academic</option></select></label><label className="field-label">Status<select value={eventForm.state} onChange={e=>setEventForm({...eventForm,state:e.target.value})}>{['Registration Open','Starting Soon','Live Now','Event Ended'].map(s=><option key={s}>{s}</option>)}</select></label></div><div className="modal-actions"><button type="button" className="secondary" onClick={()=>setShowEventForm(false)}>Cancel</button><button className="primary">Save event</button></div></form></div></div>}
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

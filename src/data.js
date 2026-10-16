export const initialSubjects = [
  { id: 1, name: 'Mathematics', credits: 4, internal: 24, cutoff: 40, pass: 40, target: 'A' },
  { id: 2, name: 'Programming', credits: 4, internal: 27, cutoff: 40, pass: 40, target: 'A' },
  { id: 3, name: 'Physics', credits: 3, internal: 20, cutoff: 40, pass: 40, target: 'B' },
  { id: 4, name: 'Communication Skills', credits: 2, internal: 29, cutoff: 40, pass: 40, target: 'A' },
]
export const gradeScale = [
  { grade: 'O', points: 10, min: 90 },
  { grade: 'A', points: 9, min: 80 },
  { grade: 'B', points: 8, min: 70 },
  { grade: 'C', points: 7, min: 60 },
  { grade: 'D', points: 6, min: 50 },
  { grade: 'E', points: 5, min: 40 },
]
export const initialRides = [
  { id: 1, from: 'Kharghar Station', to: 'Campus Main Gate', time: '8:15 AM', seats: 3, status: 'Available', driver: 'Aarav M.' },
  { id: 2, from: 'Nerul Station', to: 'Campus Main Gate', time: '8:30 AM', seats: 2, status: 'Available', driver: 'Sana K.' },
  { id: 3, from: 'Seawoods', to: 'Campus Main Gate', time: '9:00 AM', seats: 1, status: 'Available', driver: 'Rohan P.' },
]
export const initialChallenges = [
  { id: 1, title: 'Bring a reusable bottle', className: 'FY Computer Engineering', points: 50, done: false },
  { id: 2, title: 'Help a classmate with notes', className: 'FY IT', points: 40, done: false },
  { id: 3, title: 'Attend a club orientation', className: 'All First Years', points: 30, done: true },
]
export const contacts = [
  { name: 'First-Year Coordinator', detail: 'Academic queries', place: 'Admin Block · Room 104' },
  { name: 'Student Help Desk', detail: 'ID cards and student services', place: 'Main Building · Ground Floor' },
  { name: 'Central Library', detail: 'Books and study spaces', place: 'Library Block · Level 1' },
  { name: 'Campus Canteen', detail: 'Food and refreshments', place: 'Student Centre' },
]
export const events = [
  { name: 'Clubs Open House', time: 'Today · 3:00 PM', state: 'Registration Open' },
  { name: 'Freshers Tech Meetup', time: 'Tomorrow · 11:00 AM', state: 'Starting Soon' },
  { name: 'Peer Learning Circle', time: 'Friday · 2:00 PM', state: 'Registration Open' },
]

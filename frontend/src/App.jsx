import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CalendarDays,
  Clock,
  Coffee,
  Download,
  ExternalLink,
  Grid3X3,
  Layers,
  Loader2,
  MousePointerClick,
  Sparkles,
  LayoutGrid,
  Trash2,
  Plus,
  Settings,
  Code,
  X
} from 'lucide-react'
import {
  generateTimetable,
  exportExcel,
  scheduleExtra,
  rescheduleDynamic,
  getErrorMessage,
} from './api/client'
import ErrorBanner from './components/ErrorBanner'
import TimetableGrid from './components/TimetableGrid'
import AddExtraModal from './components/AddExtraModal'
import RescheduleModal from './components/RescheduleModal'

const DAY_LABELS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

const defaultPayload = {
  num_days: 5,
  num_periods: 8,
  sections: ["AIML-A", "AIML-B", "AIML-C"],
  teachers: ["NG", "PD", "PA", "PJ", "AP", "PP", "SU", "AL", "ST", "DM", "SL", "SB"],
  rooms: ["DT 403", "DT 406", "DT 412", "Lab 409", "Lab 411", "Lab 307"],
  courses: [
    { id: "CAT6001", name: "DL-1", teachers: ["NG"], section: "AIML-A", hours: 3, is_lab: false, elective_group: null },
    { id: "CAP6001", name: "DL-1 LAB", teachers: ["NG", "PD"], section: "AIML-A", hours: 2, is_lab: true, elective_group: null },
    { id: "CAT6002", name: "CV", teachers: ["PA"], section: "AIML-A", hours: 3, is_lab: false, elective_group: null },
    { id: "CAP6002", name: "CV LAB", teachers: ["PA", "PJ"], section: "AIML-A", hours: 2, is_lab: true, elective_group: null },
    { id: "CAT6003-1", name: "NLP", teachers: ["AP"], section: "AIML-A", hours: 3, is_lab: false, elective_group: "Group_6003_Theory" },
    { id: "CAT6003-2", name: "DMW", teachers: ["SU"], section: "AIML-A", hours: 3, is_lab: false, elective_group: "Group_6003_Theory" },
    { id: "CAP6003-1", name: "NLP LAB", teachers: ["AP", "PP"], section: "AIML-A", hours: 2, is_lab: true, elective_group: "Group_6003_Lab" },
    { id: "CAP6003-2", name: "DMW LAB", teachers: ["SU", "AL"], section: "AIML-A", hours: 2, is_lab: true, elective_group: "Group_6003_Lab" },
    { id: "CAT6004-1", name: "BCT", teachers: ["ST"], section: "AIML-A", hours: 3, is_lab: false, elective_group: "Group_6004_Theory" },
    { id: "CAT6004-2", name: "CRM", teachers: ["SL"], section: "AIML-A", hours: 3, is_lab: false, elective_group: "Group_6004_Theory" },
    { id: "CAP6004-1", name: "BCT LAB", teachers: ["ST", "DM"], section: "AIML-A", hours: 2, is_lab: true, elective_group: "Group_6004_Lab" },
    { id: "CAP6004-2", name: "CRM LAB", teachers: ["SL"], section: "AIML-A", hours: 2, is_lab: true, elective_group: "Group_6004_Lab" },
    { id: "CAT6005", name: "IoT", teachers: ["SB"], section: "AIML-A", hours: 2, is_lab: false, elective_group: null },
    
    { id: "CAT6001", name: "DL-1", teachers: ["NG"], section: "AIML-B", hours: 3, is_lab: false, elective_group: null },
    { id: "CAP6001", name: "DL-1 LAB", teachers: ["NG", "PD"], section: "AIML-B", hours: 2, is_lab: true, elective_group: null },
    { id: "CAT6002", name: "CV", teachers: ["PA"], section: "AIML-B", hours: 3, is_lab: false, elective_group: null },
    { id: "CAP6002", name: "CV LAB", teachers: ["PA", "PJ"], section: "AIML-B", hours: 2, is_lab: true, elective_group: null },
    { id: "CAT6003-1", name: "NLP", teachers: ["AP"], section: "AIML-B", hours: 3, is_lab: false, elective_group: "Group_6003_Theory" },
    { id: "CAT6003-2", name: "DMW", teachers: ["SU"], section: "AIML-B", hours: 3, is_lab: false, elective_group: "Group_6003_Theory" },
    { id: "CAP6003-1", name: "NLP LAB", teachers: ["AP", "PP"], section: "AIML-B", hours: 2, is_lab: true, elective_group: "Group_6003_Lab" },
    { id: "CAP6003-2", name: "DMW LAB", teachers: ["SU", "AL"], section: "AIML-B", hours: 2, is_lab: true, elective_group: "Group_6003_Lab" },
    { id: "CAT6004-1", name: "BCT", teachers: ["ST"], section: "AIML-B", hours: 3, is_lab: false, elective_group: "Group_6004_Theory" },
    { id: "CAT6004-2", name: "CRM", teachers: ["SL"], section: "AIML-B", hours: 3, is_lab: false, elective_group: "Group_6004_Theory" },
    { id: "CAP6004-1", name: "BCT LAB", teachers: ["ST", "DM"], section: "AIML-B", hours: 2, is_lab: true, elective_group: "Group_6004_Lab" },
    { id: "CAP6004-2", name: "CRM LAB", teachers: ["SL"], section: "AIML-B", hours: 2, is_lab: true, elective_group: "Group_6004_Lab" },
    { id: "CAT6005", name: "IoT", teachers: ["SB"], section: "AIML-B", hours: 2, is_lab: false, elective_group: null },

    { id: "CAT6001", name: "DL-1", teachers: ["NG"], section: "AIML-C", hours: 3, is_lab: false, elective_group: null },
    { id: "CAP6001", name: "DL-1 LAB", teachers: ["NG", "PD"], section: "AIML-C", hours: 2, is_lab: true, elective_group: null },
    { id: "CAT6002", name: "CV", teachers: ["PA"], section: "AIML-C", hours: 3, is_lab: false, elective_group: null },
    { id: "CAP6002", name: "CV LAB", teachers: ["PA", "PJ"], section: "AIML-C", hours: 2, is_lab: true, elective_group: null },
    { id: "CAT6003-1", name: "NLP", teachers: ["AP"], section: "AIML-C", hours: 3, is_lab: false, elective_group: "Group_6003_Theory" },
    { id: "CAT6003-2", name: "DMW", teachers: ["SU"], section: "AIML-C", hours: 3, is_lab: false, elective_group: "Group_6003_Theory" },
    { id: "CAP6003-1", name: "NLP LAB", teachers: ["AP", "PP"], section: "AIML-C", hours: 2, is_lab: true, elective_group: "Group_6003_Lab" },
    { id: "CAP6003-2", name: "DMW LAB", teachers: ["SU", "AL"], section: "AIML-C", hours: 2, is_lab: true, elective_group: "Group_6003_Lab" },
    { id: "CAT6004-1", name: "BCT", teachers: ["ST"], section: "AIML-C", hours: 3, is_lab: false, elective_group: "Group_6004_Theory" },
    { id: "CAT6004-2", name: "CRM", teachers: ["SL"], section: "AIML-C", hours: 3, is_lab: false, elective_group: "Group_6004_Theory" },
    { id: "CAP6004-1", name: "BCT LAB", teachers: ["ST", "DM"], section: "AIML-C", hours: 2, is_lab: true, elective_group: "Group_6004_Lab" },
    { id: "CAP6004-2", name: "CRM LAB", teachers: ["SL"], section: "AIML-C", hours: 2, is_lab: true, elective_group: "Group_6004_Lab" },
    { id: "CAT6005", name: "IoT", teachers: ["SB"], section: "AIML-C", hours: 2, is_lab: false, elective_group: null }
  ]
}

const emptyPayload = {
  num_days: 5,
  num_periods: 8,
  sections: [],
  teachers: [],
  rooms: [],
  courses: []
}

function normalizeCourseName(name) {
  return name.replace(/\s*\(Rescheduled\)\s*$/i, '').replace(/\s*\(Extra\)\s*$/i, '').trim()
}

function findCourseForClass(cls, section, catalog) {
  const base = normalizeCourseName(cls.course_name)
  return catalog.find((c) => c.section === section && c.name === base)
}

const SCHEDULE_STORAGE_KEY = 'acadflow_schedule_v1'

function loadScheduleFromStorage() {
  try {
    const raw = localStorage.getItem(SCHEDULE_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
    if (Object.keys(parsed).length === 0) return null
    return parsed
  } catch {
    return null
  }
}

export default function App() {
  // --- STATE ---
  const [schedule, setSchedule] = useState(null)
  const [activeSection, setActiveSection] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  
  const [extraModal, setExtraModal] = useState(null)
  const [rescheduleModal, setRescheduleModal] = useState(null)

  // --- BUILDER STATE (Initializes with defaultPayload) ---
  const [inputMode, setInputMode] = useState('visual') // 'visual' | 'json'
  const [payload, setPayload] = useState(defaultPayload)
  const [jsonInput, setJsonInput] = useState(JSON.stringify(defaultPayload, null, 2))

  // New Item Input States
  const [newSection, setNewSection] = useState('')
  const [newRoom, setNewRoom] = useState('')
  const [newTeacher, setNewTeacher] = useState('')

  // New Course Form State
  const [newCourse, setNewCourse] = useState({
    id: '', name: '', teachers: '', section: '', hours: 3, is_lab: false, elective_group: ''
  })

  // Sync JSON text to Payload object
  useEffect(() => {
    if (inputMode === 'json') {
      try {
        const parsed = JSON.parse(jsonInput)
        setPayload(parsed)
      } catch (e) {
        // Don't update payload if JSON is currently invalid
      }
    } else {
      setJsonInput(JSON.stringify(payload, null, 2))
    }
  }, [jsonInput, inputMode, payload])

  // Default the active section or new course section if sections are added
  useEffect(() => {
    if (payload.sections.length > 0) {
      if (!activeSection) setActiveSection(payload.sections[0])
      if (!newCourse.section) setNewCourse(prev => ({ ...prev, section: payload.sections[0] }))
    } else {
      setActiveSection('')
    }
  }, [payload.sections, activeSection, newCourse.section])

  // --- COMPUTED PROPERTIES ---
  const sections = useMemo(() => (schedule ? Object.keys(schedule).sort() : payload.sections), [schedule, payload.sections])
  const coursesForActiveSection = useMemo(() => payload.courses.filter((c) => c.section === activeSection), [payload.courses, activeSection])
  const sectionClasses = schedule?.[activeSection] ?? []

  // --- ACTIONS ---
  const loadTimetable = useCallback(async (fromButton = false) => {
    if (payload.sections.length === 0 || payload.courses.length === 0) {
      setError("Please add at least one section and one course before generating.")
      return
    }

    setError('')
    if (fromButton) setInfo('')
    setLoading(true)
    try {
      const data = await generateTimetable(payload)
      if (data.status === 'success' && data.schedule) {
        setSchedule(data.schedule)
        const first = Object.keys(data.schedule).sort()[0]
        if (first) setActiveSection(first)
        setInfo(fromButton ? data.message || 'Timetable generated.' : data.message || 'Timetable loaded from backend.')
      }
    } catch (e) {
      setSchedule(null)
      setError(getErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }, [payload])

  useEffect(() => {
    const saved = loadScheduleFromStorage()
    if (saved) {
      const first = Object.keys(saved).sort()[0]
      setSchedule(saved)
      if (first) setActiveSection(first)
      setInfo('Saved timetable restored.')
    }
  }, [])

  useEffect(() => {
    if (!schedule) return
    try {
      localStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(schedule))
    } catch (e) {
      console.warn('acadflow: could not persist schedule', e)
    }
  }, [schedule])

  const clearSavedAndRegenerate = useCallback(async () => {
    try { localStorage.removeItem(SCHEDULE_STORAGE_KEY) } catch { }
    setSchedule(null)
    setPayload(emptyPayload)
    setJsonInput(JSON.stringify(emptyPayload, null, 2))
    setActiveSection('')
    setInfo('Workspace cleared. Start from scratch.')
  }, [])

  const runExport = async () => {
    if (!schedule) return
    setError('')
    setLoading(true)
    try {
      await exportExcel({ schedule, num_days: payload.num_days, num_periods: payload.num_periods })
      setInfo('Excel file downloaded.')
    } catch (e) {
      setError(getErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }

  // --- BUILDER HANDLERS ---
  const handleAddItem = (field, value, setter) => {
    const trimmed = value.trim()
    if (!trimmed) return
    if (!payload[field].includes(trimmed)) {
      setPayload(prev => ({ ...prev, [field]: [...prev[field], trimmed] }))
    }
    setter('') // Clear input after adding
  }

  const handleRemoveItem = (field, index) => {
    setPayload(prev => {
      const updated = [...prev[field]]
      updated.splice(index, 1)
      return { ...prev, [field]: updated }
    })
  }

  const handleAddCourse = () => {
    if (!newCourse.id || !newCourse.name || !newCourse.section) return alert("ID, Name, and Section are required.")
    
    const courseToAdd = {
      ...newCourse,
      teachers: newCourse.teachers.split(',').map(t => t.trim()).filter(t => t),
      elective_group: newCourse.elective_group.trim() || null
    }

    setPayload(prev => ({
      ...prev,
      courses: [...prev.courses, courseToAdd]
    }))

    setNewCourse({ id: '', name: '', teachers: '', section: payload.sections[0] || '', hours: 3, is_lab: false, elective_group: '' })
  }

  const handleRemoveCourse = (courseId, section) => {
    setPayload(prev => ({
      ...prev,
      courses: prev.courses.filter(c => !(c.id === courseId && c.section === section))
    }))
  }

  return (
    <div className="acadflow-page-bg acadflow-grid-noise relative min-h-screen">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -left-32 top-20 h-80 w-80 rounded-full bg-blue-400/[0.12] blur-3xl" />
        <div className="absolute -right-20 top-40 h-[22rem] w-[22rem] rounded-full bg-indigo-500/[0.1] blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-slate-300/[0.15] blur-3xl" />
      </div>

      <div className="relative">
        {loading && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/[0.18] backdrop-blur-[3px]">
            <div className="relative overflow-hidden rounded-2xl border border-white/70 bg-white/[0.97] px-10 py-9 shadow-glow">
              <div className="relative flex flex-col items-center gap-5">
                <Loader2 className="h-9 w-9 animate-spin text-blue-600" />
                <p className="text-sm font-semibold text-slate-800">Processing Request...</p>
              </div>
            </div>
          </div>
        )}

        <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur-xl">
          <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white shadow-md">
                <LayoutGrid className="h-[18px] w-[18px]" />
              </div>
              <span className="text-[15px] font-semibold tracking-tight text-slate-900">AcadFlow Studio</span>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={clearSavedAndRegenerate}
                disabled={loading}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 text-sm font-semibold text-red-600 shadow-sm transition hover:bg-red-50 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" /> Clear All
              </button>
              <button
                onClick={() => loadTimetable(true)}
                disabled={loading}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
              >
                <Sparkles className="h-4 w-4" /> Generate Timetable
              </button>
              {schedule && (
                <button
                  onClick={runExport}
                  disabled={loading}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <Download className="h-4 w-4 text-blue-600" /> Export Excel
                </button>
              )}
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 pb-20 pt-10 sm:px-6 lg:px-8">
          <ErrorBanner message={error} onDismiss={() => setError('')} />
          
          <div className="flex flex-col lg:flex-row gap-8">
            
            {/* LEFT COLUMN: Input Builder */}
            <div className="w-full lg:w-1/3 space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="flex border-b border-slate-200 bg-slate-50 p-2 gap-2">
                  <button onClick={() => setInputMode('visual')} className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition ${inputMode === 'visual' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-900'}`}>
                    <Settings className="h-4 w-4" /> Visual Builder
                  </button>
                  <button onClick={() => setInputMode('json')} className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition ${inputMode === 'json' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-900'}`}>
                    <Code className="h-4 w-4" /> Raw JSON
                  </button>
                </div>

                <div className="p-4 h-[600px] overflow-y-auto">
                  {inputMode === 'json' ? (
                    <textarea 
                      className="w-full h-full font-mono text-xs p-3 border border-slate-200 rounded-lg bg-slate-50 focus:ring-2 ring-blue-500 outline-none"
                      value={jsonInput}
                      onChange={(e) => setJsonInput(e.target.value)}
                    />
                  ) : (
                    <div className="space-y-8">
                      {/* Global Settings */}
                      <div className="space-y-3">
                        <h4 className="text-sm font-bold text-slate-800">Global Settings</h4>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs text-slate-500 font-medium">Working Days</label>
                            <input type="number" className="builder-input mt-1" value={payload.num_days} onChange={e => setPayload({...payload, num_days: parseInt(e.target.value)})} />
                          </div>
                          <div>
                            <label className="text-xs text-slate-500 font-medium">Periods/Day</label>
                            <input type="number" className="builder-input mt-1" value={payload.num_periods} onChange={e => setPayload({...payload, num_periods: parseInt(e.target.value)})} />
                          </div>
                        </div>
                      </div>

                      {/* Infrastructure (Chips) */}
                      <div className="space-y-5">
                        <h4 className="text-sm font-bold text-slate-800">Infrastructure</h4>
                        
                        {/* Sections Array */}
                        <div>
                          <label className="text-xs font-semibold text-slate-700">Sections (Classes)</label>
                          <div className="flex flex-wrap gap-2 mt-2 mb-2">
                            {payload.sections.map((sec, idx) => (
                              <span key={idx} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 text-xs font-medium border border-indigo-100">
                                {sec}
                                <button onClick={() => handleRemoveItem('sections', idx)} className="hover:text-indigo-900 transition"><X className="h-3 w-3" /></button>
                              </span>
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <input 
                              className="builder-input flex-1" 
                              placeholder="Add section (e.g. AIML-A)" 
                              value={newSection} 
                              onChange={e => setNewSection(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddItem('sections', newSection, setNewSection); } }}
                            />
                            <button 
                              type="button" 
                              onClick={() => handleAddItem('sections', newSection, setNewSection)}
                              className="px-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition"
                            ><Plus className="h-4 w-4" /></button>
                          </div>
                        </div>

                        {/* Rooms Array */}
                        <div>
                          <label className="text-xs font-semibold text-slate-700">Rooms (Include 'Lab' for lab rooms)</label>
                          <div className="flex flex-wrap gap-2 mt-2 mb-2">
                            {payload.rooms.map((room, idx) => (
                              <span key={idx} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-100">
                                {room}
                                <button onClick={() => handleRemoveItem('rooms', idx)} className="hover:text-emerald-900 transition"><X className="h-3 w-3" /></button>
                              </span>
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <input 
                              className="builder-input flex-1" 
                              placeholder="Add room (e.g. Lab 401)" 
                              value={newRoom} 
                              onChange={e => setNewRoom(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddItem('rooms', newRoom, setNewRoom); } }}
                            />
                            <button 
                              type="button" 
                              onClick={() => handleAddItem('rooms', newRoom, setNewRoom)}
                              className="px-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition"
                            ><Plus className="h-4 w-4" /></button>
                          </div>
                        </div>

                        {/* Teachers Array */}
                        <div>
                          <label className="text-xs font-semibold text-slate-700">Teachers</label>
                          <div className="flex flex-wrap gap-2 mt-2 mb-2">
                            {payload.teachers.map((t, idx) => (
                              <span key={idx} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 text-amber-700 text-xs font-medium border border-amber-100">
                                {t}
                                <button onClick={() => handleRemoveItem('teachers', idx)} className="hover:text-amber-900 transition"><X className="h-3 w-3" /></button>
                              </span>
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <input 
                              className="builder-input flex-1" 
                              placeholder="Add teacher (e.g. Dr. Smith)" 
                              value={newTeacher} 
                              onChange={e => setNewTeacher(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddItem('teachers', newTeacher, setNewTeacher); } }}
                            />
                            <button 
                              type="button" 
                              onClick={() => handleAddItem('teachers', newTeacher, setNewTeacher)}
                              className="px-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition"
                            ><Plus className="h-4 w-4" /></button>
                          </div>
                        </div>
                      </div>

                      <hr className="border-slate-200" />

                      {/* Courses */}
                      <div className="space-y-4">
                        <h4 className="text-sm font-bold text-slate-800 flex justify-between items-center">
                          Courses ({payload.courses.length})
                        </h4>
                        
                        {/* Add Course Form */}
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Add New Course</p>
                          <div className="grid grid-cols-2 gap-3">
                            <input placeholder="ID (e.g. CS101)" className="builder-input" value={newCourse.id} onChange={e => setNewCourse({...newCourse, id: e.target.value})} />
                            <input placeholder="Name (e.g. Web Dev)" className="builder-input" value={newCourse.name} onChange={e => setNewCourse({...newCourse, name: e.target.value})} />
                            <select className="builder-input" value={newCourse.section} onChange={e => setNewCourse({...newCourse, section: e.target.value})}>
                              <option value="" disabled>Select Section...</option>
                              {payload.sections.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <input placeholder="Teachers (e.g. Dr. Smith, Dr. Lee)" className="builder-input" value={newCourse.teachers} onChange={e => setNewCourse({...newCourse, teachers: e.target.value})} />
                            <div className="flex items-center gap-2 px-3 border rounded-lg bg-white">
                              <input type="checkbox" checked={newCourse.is_lab} onChange={e => setNewCourse({...newCourse, is_lab: e.target.checked})} id="islab" className="w-4 h-4 text-blue-600 rounded" />
                              <label htmlFor="islab" className="text-xs font-medium text-slate-700 cursor-pointer">Is Lab Subject?</label>
                            </div>
                            <input type="number" placeholder="Total Hours" className="builder-input" value={newCourse.hours} onChange={e => setNewCourse({...newCourse, hours: parseInt(e.target.value)})} />
                          </div>
                          <input placeholder="Elective Group (Leave blank for core subjects)" className="builder-input w-full mt-1" value={newCourse.elective_group} onChange={e => setNewCourse({...newCourse, elective_group: e.target.value})} />
                          <button onClick={handleAddCourse} className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-sm font-semibold shadow-sm transition flex justify-center items-center gap-2">
                            <Plus className="h-4 w-4" /> Save Course to Section
                          </button>
                        </div>

                        {/* Course List */}
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                          {payload.courses.length === 0 && (
                            <p className="text-xs text-slate-500 italic text-center py-6 bg-slate-50 rounded-lg border border-dashed border-slate-200">No courses added yet.</p>
                          )}
                          {payload.courses.slice().reverse().map((c, i) => (
                            <div key={i} className="flex items-center justify-between bg-white border border-slate-200 p-3 rounded-xl shadow-sm hover:border-slate-300 transition">
                              <div>
                                <p className="text-sm font-bold text-slate-800">{c.name} <span className="text-xs text-blue-600 font-semibold bg-blue-50 px-1.5 py-0.5 rounded ml-1">{c.section}</span></p>
                                <p className="text-xs text-slate-500 mt-1">{c.is_lab ? 'Lab Room Req.' : 'Theory Room Req.'} · {c.hours} hrs · Taught by: {c.teachers.join(', ')}</p>
                              </div>
                              <button onClick={() => handleRemoveCourse(c.id, c.section)} className="p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition" title="Delete Course">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Output Timetable */}
            <div className="w-full lg:w-2/3">
              {!schedule ? (
                <div className="h-full flex flex-col items-center justify-center rounded-3xl border border-slate-200/80 bg-white/90 p-10 text-center shadow-soft">
                  <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-glow">
                    <LayoutGrid className="h-8 w-8" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900">Configure & Generate</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600 max-w-sm mx-auto">
                    Use the Visual Builder on the left to set up your sections, rooms, and courses. When ready, click Generate Timetable.
                  </p>
                </div>
              ) : (
                <div className="animate-fade-up">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
                    <div className="flex items-center gap-2 text-sm text-slate-500 mb-4 sm:mb-0">
                      <Clock className="h-4 w-4 text-slate-400" />
                      <span>
                        <span className="font-semibold text-slate-800">{activeSection}</span>
                        <span className="text-slate-400"> · </span>
                        {DAY_LABELS.slice(0, payload.num_days).join(', ')} · periods 1–{payload.num_periods}
                      </span>
                    </div>
                    {sections.length > 0 && (
                      <div className="inline-flex flex-wrap rounded-2xl border border-slate-200/70 bg-slate-100/50 p-1.5 shadow-inner">
                        {sections.map((sec) => (
                          <button
                            key={sec}
                            onClick={() => setActiveSection(sec)}
                            className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                              sec === activeSection
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'text-slate-600 hover:bg-white hover:text-slate-900'
                            }`}
                          >
                            {sec}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <TimetableGrid
                    sectionClasses={sectionClasses}
                    numDays={payload.num_days}
                    numPeriods={payload.num_periods}
                    onEmptySlot={(day, period) => setExtraModal({ day, period })}
                    onClassClick={(cls) => !cls.is_recess && setRescheduleModal({ cls })}
                  />
                </div>
              )}
            </div>

          </div>
        </main>
      </div>
    </div>
  )
}
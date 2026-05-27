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
  X,
  Undo2,
  ArrowRightLeft,
  LogOut
} from 'lucide-react'
import {
  generateTimetable,
  exportExcel,
  scheduleExtra,
  rescheduleDynamic,
  getErrorMessage,
} from './api/client'
import { getActiveTimetable, exportTeacherExcel } from './api/auth'
import ErrorBanner from './components/ErrorBanner'
import TimetableGrid from './components/TimetableGrid'
import AddExtraModal from './components/AddExtraModal'
import RescheduleModal from './components/RescheduleModal'
import Login from './components/Login'
import { samplePayload as defaultPayload, DAY_LABELS } from './data/samplePayload'


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

export default function App() {
  // --- AUTH STATE ---
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userRole, setUserRole] = useState(null)
  const [teacherInitials, setTeacherInitials] = useState(null)

  // --- STATE ---
  const [schedule, setSchedule] = useState(null)
  const [history, setHistory] = useState([])
  const [activeSection, setActiveSection] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  
  // Navigation State
  const [activeView, setActiveView] = useState('setup')
  
  const [extraModal, setExtraModal] = useState(null)
  const [rescheduleModal, setRescheduleModal] = useState(null)

  // --- BUILDER STATE ---
  const [inputMode, setInputMode] = useState('visual') 
  const [payload, setPayload] = useState(defaultPayload)
  const [jsonInput, setJsonInput] = useState(JSON.stringify(defaultPayload, null, 2))

  // New Item Input States
  const [newSection, setNewSection] = useState('')
  const [newRoom, setNewRoom] = useState('')
  const [newTeacher, setNewTeacher] = useState('')

  // Course Form State - Note sections is now an array
  const [newCourse, setNewCourse] = useState({
    id: '', name: '', teachers: '', sections: [], hours: 3, is_lab: false, elective_group: ''
  })
  
  const [courseInputMode, setCourseInputMode] = useState('single')
  const [pairedLabs, setPairedLabs] = useState({
    id1: '', name1: '', teachers1_a: '', teachers1_b: '', 
    id2: '', name2: '', teachers2_a: '', teachers2_b: '', 
    sections: [], hours: 2
  })

  // Sync JSON text to Payload object
  useEffect(() => {
    if (inputMode === 'json') {
      try {
        const parsed = JSON.parse(jsonInput)
        setPayload(parsed)
      } catch (e) {}
    } else {
      setJsonInput(JSON.stringify(payload, null, 2))
    }
  }, [jsonInput, inputMode, payload])

  // --- AUTH EFFECTS ---
  const fetchActiveTimetable = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await getActiveTimetable()
      if (data.status === 'success') {
        setSchedule(data.schedule)
        setPayload(data.payload)
        const first = Object.keys(data.schedule).sort()[0]
        if (first) setActiveSection(first)
        setActiveView('timetable')
      } else {
        setInfo(data.message)
      }
    } catch(err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const token = localStorage.getItem('acadflow_token')
    const role = localStorage.getItem('acadflow_role')
    const teacher = localStorage.getItem('acadflow_teacher')
    if (token) {
      setIsAuthenticated(true)
      setUserRole(role)
      setTeacherInitials(teacher)
      if (role === 'faculty') {
        fetchActiveTimetable()
        setActiveView('timetable')
      }
    }
  }, [fetchActiveTimetable])

  const handleLoginSuccess = (role, teacher) => {
    setIsAuthenticated(true)
    setUserRole(role)
    setTeacherInitials(teacher)
    if (role === 'faculty') {
      fetchActiveTimetable()
      setActiveView('timetable')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('acadflow_token')
    localStorage.removeItem('acadflow_role')
    localStorage.removeItem('acadflow_teacher')
    setIsAuthenticated(false)
    setUserRole(null)
    setTeacherInitials(null)
    setSchedule(null)
    setActiveView('setup')
  }

  useEffect(() => {
    if (payload.sections.length > 0) {
      if (!activeSection) setActiveSection(payload.sections[0])
    } else {
      setActiveSection('')
    }
  }, [payload.sections, activeSection])

  // --- COMPUTED PROPERTIES ---
  const sections = useMemo(() => (schedule ? Object.keys(schedule).sort() : payload.sections), [schedule, payload.sections])
  const coursesForActiveSection = useMemo(() => payload.courses.filter((c) => c.section === activeSection), [payload.courses, activeSection])
  const sectionClasses = schedule?.[activeSection] ?? []

  // --- TEACHER SCHEDULE COMPUTE ---
  const teacherClasses = useMemo(() => {
    if (!schedule || !teacherInitials) return []
    const classes = []
    for (const [sec, secClasses] of Object.entries(schedule)) {
      for (const cls of secClasses) {
        if (!cls.is_recess && cls.teachers && cls.teachers.includes(teacherInitials)) {
          classes.push({ ...cls, section: sec })
        }
      }
    }
    return classes
  }, [schedule, teacherInitials])


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
        setHistory([])
        const first = Object.keys(data.schedule).sort()[0]
        if (first) setActiveSection(first)
        setInfo(fromButton ? data.message || 'Timetable generated.' : data.message || 'Timetable loaded from backend.')
        
        setActiveView('timetable')
      }
    } catch (e) {
      setSchedule(null)
      setError(getErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }, [payload])

  const clearSavedAndRegenerate = useCallback(async () => {
    setSchedule(null)
    setHistory([])
    setPayload(emptyPayload)
    setJsonInput(JSON.stringify(emptyPayload, null, 2))
    setActiveSection('')
    setActiveView('setup')
    setInfo('Workspace cleared. Start from scratch.')
  }, [])

  const runExport = async () => {
    if (!schedule) return
    setError('')
    setLoading(true)
    try {
      if (userRole === 'faculty' && teacherInitials) {
        await exportTeacherExcel({ schedule, num_days: payload.num_days, num_periods: payload.num_periods, teacher: teacherInitials })
        setInfo('Your personal schedule has been downloaded.')
      } else {
        await exportExcel({ schedule, num_days: payload.num_days, num_periods: payload.num_periods })
        setInfo('Excel file downloaded.')
      }
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
    setter('') 
  }

  const handleRemoveItem = (field, index) => {
    setPayload(prev => {
      const updated = [...prev[field]]
      updated.splice(index, 1)
      return { ...prev, [field]: updated }
    })
  }

  const toggleCourseSection = (sec) => {
    setNewCourse(prev => {
      if (prev.sections.includes(sec)) {
        return { ...prev, sections: prev.sections.filter(s => s !== sec) }
      } else {
        return { ...prev, sections: [...prev.sections, sec] }
      }
    })
  }

  const handleAddCourse = () => {
    if (!newCourse.id || !newCourse.name || newCourse.sections.length === 0) {
      return alert("Course ID, Name, and at least one Section are required.")
    }
    
    const teachersArr = newCourse.teachers.split(',').map(t => t.trim()).filter(t => t)
    const electiveGroup = newCourse.elective_group.trim() || null

    // Create a new distinct course object for EVERY selected section
    const coursesToAdd = newCourse.sections.map(sec => ({
      id: newCourse.id, // Using the same ID across sections is fine because OR-Tools uses internal array indices now
      name: newCourse.name,
      teachers: teachersArr,
      section: sec,
      hours: newCourse.hours,
      is_lab: newCourse.is_lab,
      elective_group: electiveGroup
    }))

    setPayload(prev => ({
      ...prev,
      courses: [...prev.courses, ...coursesToAdd]
    }))

    setNewCourse({ id: '', name: '', teachers: '', sections: [], hours: 3, is_lab: false, elective_group: '' })
  }

  const togglePairedLabsSection = (sec) => {
    setPairedLabs(prev => {
      if (prev.sections.includes(sec)) {
        return { ...prev, sections: prev.sections.filter(s => s !== sec) }
      } else {
        return { ...prev, sections: [...prev.sections, sec] }
      }
    })
  }

  const handleAddPairedLabs = () => {
    if (!pairedLabs.id1 || !pairedLabs.name1 || !pairedLabs.id2 || !pairedLabs.name2 || pairedLabs.sections.length === 0) {
      return alert("All fields and at least one section are required for paired labs.")
    }
    
    const t1a = pairedLabs.teachers1_a.split(',').map(t => t.trim()).filter(t => t)
    const t1b = pairedLabs.teachers1_b.split(',').map(t => t.trim()).filter(t => t)
    const t2a = pairedLabs.teachers2_a.split(',').map(t => t.trim()).filter(t => t)
    const t2b = pairedLabs.teachers2_b.split(',').map(t => t.trim()).filter(t => t)

    const coursesToAdd = []
    
    // Generate a secure unique base group name hidden from the user
    const hiddenGroupName = `Swap_${Math.random().toString(36).substr(2, 6)}`

    pairedLabs.sections.forEach(sec => {
      const prefix = sec.split('-')[1] || 'A'
      const batch1 = `(${prefix}1, ${prefix}2)`
      const batch2 = `(${prefix}3, ${prefix}4)`

      // Group 1: Lab 1 (B1,B2) and Lab 2 (B3,B4)
      coursesToAdd.push({
        id: pairedLabs.id1 + '-A', name: `${pairedLabs.name1} ${batch1}`, teachers: t1a, section: sec, hours: pairedLabs.hours, is_lab: true, elective_group: `${hiddenGroupName}_1_${sec}`
      })
      coursesToAdd.push({
        id: pairedLabs.id2 + '-A', name: `${pairedLabs.name2} ${batch2}`, teachers: t2b, section: sec, hours: pairedLabs.hours, is_lab: true, elective_group: `${hiddenGroupName}_1_${sec}`
      })

      // Group 2: Lab 2 (B1,B2) and Lab 1 (B3,B4)
      coursesToAdd.push({
        id: pairedLabs.id2 + '-B', name: `${pairedLabs.name2} ${batch1}`, teachers: t2a, section: sec, hours: pairedLabs.hours, is_lab: true, elective_group: `${hiddenGroupName}_2_${sec}`
      })
      coursesToAdd.push({
        id: pairedLabs.id1 + '-B', name: `${pairedLabs.name1} ${batch2}`, teachers: t1b, section: sec, hours: pairedLabs.hours, is_lab: true, elective_group: `${hiddenGroupName}_2_${sec}`
      })
    })

    setPayload(prev => ({
      ...prev,
      courses: [...prev.courses, ...coursesToAdd]
    }))

    setPairedLabs({ id1: '', name1: '', teachers1_a: '', teachers1_b: '', id2: '', name2: '', teachers2_a: '', teachers2_b: '', sections: [], hours: 2 })
  }

  const handleRemoveCourse = (courseId, section) => {
    setPayload(prev => ({
      ...prev,
      courses: prev.courses.filter(c => !(c.id === courseId && c.section === section))
    }))
  }

  const handleExtraSubmitLocal = (targetDayIndex, courseId) => {
    const course = payload.courses.find(c => c.id === courseId && c.section === activeSection)
    if (!course) return
    
    const existingClasses = schedule[activeSection] || []
    const dayClasses = existingClasses.filter(c => c.day === parseInt(targetDayIndex))
    
    const isLab = course.is_lab || course.name.toLowerCase().includes('lab')
    const duration = isLab ? 2 : 1
    
    const targetTeachers = course.teachers || []
    let freePeriodStart = null
    
    for (let p = 1; p <= payload.num_periods - duration + 1; p++) {
       let valid = true
       for (let i = 0; i < duration; i++) {
         const checkP = p + i
         const sectionOccupied = dayClasses.some(c => c.period === checkP)
         if (sectionOccupied) { valid = false; break; }
         
         let teacherOccupied = false
         for (const sec of Object.keys(schedule)) {
            const secClasses = schedule[sec] || []
            const clash = secClasses.find(c => c.day === parseInt(targetDayIndex) && c.period === checkP && !c.is_recess)
            if (clash && clash.teachers && clash.teachers.some(t => targetTeachers.includes(t))) {
               teacherOccupied = true
               break
            }
         }
         if (teacherOccupied) { valid = false; break; }
       }
       
       if (valid) {
         freePeriodStart = p
         break
       }
    }
    
    if (freePeriodStart === null) {
      setError(`No free ${duration}-period slot available on ${DAY_LABELS[targetDayIndex]} where the teacher is also free.`)
      return
    }
    
    const newClasses = []
    for (let i = 0; i < duration; i++) {
      newClasses.push({
        course_name: course.name + ' (Extra)',
        room: payload.rooms[0],
        teachers: course.teachers,
        day: parseInt(targetDayIndex),
        period: freePeriodStart + i,
        is_recess: false,
        section: activeSection
      })
    }
    
    setHistory(prev => [...prev, schedule])
    
    setSchedule(prev => ({
      ...prev,
      [activeSection]: [...(prev[activeSection] || []), ...newClasses]
    }))
    
    setInfo(`Scheduled ${course.name} on ${DAY_LABELS[targetDayIndex]}, Periods ${freePeriodStart}${isLab ? '-' + (freePeriodStart + 1) : ''}.`)
    setExtraModal(null)
  }

  const handleRescheduleSubmitLocal = (targetDay) => {
    if (!rescheduleModal) return
    const { cls } = rescheduleModal
    setError('')
    
    const sectionToUpdate = cls.section || activeSection
    const existingClasses = schedule[sectionToUpdate] || []
    
    const isLab = cls.room?.toLowerCase().includes('lab') || /\bLAB\b/i.test(cls.course_name || '')
    const duration = isLab ? 2 : 1
    
    // Only capture the specific period that was clicked, plus its adjacent partner if it's a lab block
    let clsPeriods = [cls.period]
    if (duration > 1) {
       const adjacent = existingClasses.find(c => c.course_name === cls.course_name && c.day === cls.day && (c.period === cls.period + 1 || c.period === cls.period - 1))
       if (adjacent) clsPeriods.push(adjacent.period)
    }
    
    // Only capture the specific class that was clicked (do NOT capture parallel partners)
    const classesToMove = existingClasses.filter(c => c.course_name === cls.course_name && c.day === cls.day && clsPeriods.includes(c.period))
    
    const getElectiveGroup = (courseName, section) => {
       const baseName = courseName.replace(/ \(Rescheduled\)$/, '').replace(/ \(Extra\)$/, '')
       const course = payload.courses.find(c => c.name === baseName && c.section === section)
       return course ? course.elective_group : null
    }
    const clsElectiveGroup = getElectiveGroup(cls.course_name, sectionToUpdate)
    
    const targetDayClasses = existingClasses.filter(c => c.day === parseInt(targetDay))
    const targetTeachers = [...new Set(classesToMove.flatMap(c => c.teachers || []))]
    
    let freePeriodStart = null
    for (let p = 1; p <= payload.num_periods - duration + 1; p++) {
       let valid = true
       for (let i = 0; i < duration; i++) {
         const checkP = p + i
         
         // Do not allow placing the class back in its exact original slots if on the same day
         if (parseInt(targetDay) === cls.day && clsPeriods.includes(checkP)) {
            valid = false;
            break;
         }
         
         const sectionClashes = targetDayClasses.filter(c => c.period === checkP && !classesToMove.includes(c))
         let slotBlocked = false
         for (const clash of sectionClashes) {
            const clashGroup = getElectiveGroup(clash.course_name, sectionToUpdate)
            // If they share the exact same elective_group, allow overlap
            if (clsElectiveGroup && clashGroup === clsElectiveGroup) {
               continue
            }
            slotBlocked = true
            break
         }
         if (slotBlocked) { valid = false; break; }
         
         let teacherOccupied = false
         for (const sec of Object.keys(schedule)) {
            const secClasses = schedule[sec] || []
            const clashesAtSlot = secClasses.filter(c => c.day === parseInt(targetDay) && c.period === checkP && !c.is_recess)
            
            for (const clash of clashesAtSlot) {
               if (sec === sectionToUpdate && classesToMove.includes(clash)) {
                  continue
               }
               
               if (clash.teachers && clash.teachers.some(t => targetTeachers.includes(t))) {
                  teacherOccupied = true
                  break
               }
            }
            if (teacherOccupied) break
         }
         if (teacherOccupied) { valid = false; break; }
       }
       
       if (valid) {
         freePeriodStart = p
         break
       }
    }
    
    if (freePeriodStart === null) {
      setError(`No free ${duration}-period slot available on ${DAY_LABELS[targetDay]} where the teachers are also free.`)
      return
    }
    
    const minPeriod = Math.min(...clsPeriods)
    const newClasses = classesToMove.map(c => ({
      ...c,
      course_name: c.course_name.includes('(Rescheduled)') ? c.course_name : c.course_name + ' (Rescheduled)',
      day: parseInt(targetDay),
      period: freePeriodStart + (c.period - minPeriod),
      section: sectionToUpdate
    }))
    
    setHistory(prev => [...prev, schedule])
    
    setSchedule(prev => ({
      ...prev,
      [sectionToUpdate]: prev[sectionToUpdate]
        .filter(c => !classesToMove.includes(c))
        .concat(newClasses)
    }))
    
    setInfo(`Rescheduled ${isLab ? 'lab' : 'class'} to ${DAY_LABELS[targetDay]}, Periods ${freePeriodStart}${isLab ? '-' + (freePeriodStart + 1) : ''}.`)
    setRescheduleModal(null)
  }

  const handleRemoveClassLocal = () => {
    if (!rescheduleModal) return
    const { cls } = rescheduleModal
    const sectionToUpdate = cls.section || activeSection
    
    const existingClasses = schedule[sectionToUpdate] || []
    
    // Only capture the specific period that was clicked, plus its adjacent partner if it's a lab block
    let clsPeriods = [cls.period]
    const isLab = cls.room?.toLowerCase().includes('lab') || /\bLAB\b/i.test(cls.course_name || '')
    if (isLab) {
       const adjacent = existingClasses.find(c => c.course_name === cls.course_name && c.day === cls.day && (c.period === cls.period + 1 || c.period === cls.period - 1))
       if (adjacent) clsPeriods.push(adjacent.period)
    }
    
    const classesToMove = existingClasses.filter(c => c.course_name === cls.course_name && c.day === cls.day && clsPeriods.includes(c.period))
    
    setHistory(prev => [...prev, schedule])
    
    setSchedule(prev => ({
      ...prev,
      [sectionToUpdate]: prev[sectionToUpdate].filter(
        c => !classesToMove.includes(c)
      )
    }))
    
    setInfo(`Removed class ${cls.course_name}.`)
    setRescheduleModal(null)
  }

  const handleUndo = () => {
    if (history.length === 0) return
    const previousState = history[history.length - 1]
    setSchedule(previousState)
    setHistory(prev => prev.slice(0, -1))
    setInfo('Undid last change.')
  }

  if (!isAuthenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} />
  }

  return (
    <div className="acadflow-page-bg acadflow-grid-noise relative min-h-screen">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -left-32 top-20 h-80 w-80 rounded-full" style={{ background: 'radial-gradient(circle, rgba(96, 165, 250, 0.12) 0%, transparent 70%)' }} />
        <div className="absolute -right-20 top-40 h-[22rem] w-[22rem] rounded-full" style={{ background: 'radial-gradient(circle, rgba(99, 102, 241, 0.1) 0%, transparent 70%)' }} />
        <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full" style={{ background: 'radial-gradient(circle, rgba(203, 213, 225, 0.15) 0%, transparent 70%)' }} />
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
          <div className="mx-auto flex h-14 max-w-[1600px] items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white shadow-md">
                <LayoutGrid className="h-[18px] w-[18px]" />
              </div>
              <span className="text-[15px] font-semibold tracking-tight text-slate-900">
                AcadFlow Studio {userRole === 'faculty' && <span className="ml-2 px-2 py-0.5 rounded text-xs bg-indigo-100 text-indigo-700 font-bold">Faculty Portal</span>}
              </span>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={handleLogout}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 mr-4"
              >
                <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">Logout</span>
              </button>
              
              {userRole === 'admin' && (
                <>
                  <button
                    onClick={clearSavedAndRegenerate}
                    disabled={loading}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 text-sm font-semibold text-red-600 shadow-sm transition hover:bg-red-50 disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" /> <span className="hidden sm:inline">Clear All</span>
                  </button>
                  <button
                    onClick={() => loadTimetable(true)}
                    disabled={loading}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
                  >
                    <Sparkles className="h-4 w-4" /> <span className="hidden sm:inline">Generate Timetable</span>
                  </button>
                </>
              )}
              {schedule && (
                <button
                  onClick={runExport}
                  disabled={loading}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <Download className="h-4 w-4 text-blue-600" /> <span className="hidden sm:inline">Export Excel</span>
                </button>
              )}
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1600px] px-4 pb-20 pt-8 sm:px-6 lg:px-8">
          
          {userRole === 'admin' && (
            <div className="flex justify-center mb-8">
              <div className="inline-flex bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/60 shadow-inner backdrop-blur-sm">
                <button
                  onClick={() => setActiveView('setup')}
                  className={`flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-semibold transition-all ${
                    activeView === 'setup'
                      ? 'bg-white text-blue-600 shadow-sm ring-1 ring-black/5'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
                  }`}
                >
                  <Settings className="h-4 w-4" /> 1. Configuration & Data
                </button>
                <button
                  onClick={() => schedule && setActiveView('timetable')}
                  className={`flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-semibold transition-all ${
                    activeView === 'timetable'
                      ? 'bg-white text-blue-600 shadow-sm ring-1 ring-black/5'
                      : !schedule
                      ? 'text-slate-400 cursor-not-allowed'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
                  }`}
                >
                  <Grid3X3 className="h-4 w-4" /> 2. Generated Timetable
                </button>
              </div>
            </div>
          )}

          <ErrorBanner message={error} onDismiss={() => setError('')} />

          {activeView === 'setup' && (
            <div className="max-w-[1400px] mx-auto space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="flex border-b border-slate-200 bg-slate-50 p-2 gap-2">
                  <button onClick={() => setInputMode('visual')} className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition ${inputMode === 'visual' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-900'}`}>
                    <Settings className="h-4 w-4" /> Visual Builder
                  </button>
                  <button onClick={() => setInputMode('json')} className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition ${inputMode === 'json' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-900'}`}>
                    <Code className="h-4 w-4" /> Raw JSON
                  </button>
                </div>

                <div className="p-6">
                  {inputMode === 'json' ? (
                    <textarea 
                      className="w-full h-[600px] font-mono text-xs p-4 border border-slate-200 rounded-lg bg-slate-50 focus:ring-2 ring-blue-500 outline-none"
                      value={jsonInput}
                      onChange={(e) => setJsonInput(e.target.value)}
                    />
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                      {/* Left Column: Configuration */}
                      <div className="space-y-10">
                        {/* Global Settings */}
                        <div className="space-y-4">
                        <h4 className="text-sm font-bold text-slate-800 border-b pb-2">Global Settings</h4>
                        <div className="grid grid-cols-2 gap-4 max-w-lg">
                          <div>
                            <label className="text-xs text-slate-500 font-medium">Working Days</label>
                            <input type="number" className="builder-input mt-1" value={payload.num_days} onChange={e => setPayload({...payload, num_days: parseInt(e.target.value)})} />
                          </div>
                          <div>
                            <label className="text-xs text-slate-500 font-medium">Periods per Day</label>
                            <input type="number" className="builder-input mt-1" value={payload.num_periods} onChange={e => setPayload({...payload, num_periods: parseInt(e.target.value)})} />
                          </div>
                        </div>
                      </div>

                      {/* Infrastructure (Chips) */}
                      <div className="space-y-6">
                        <h4 className="text-sm font-bold text-slate-800 border-b pb-2">Infrastructure</h4>
                        
                        {/* Sections Array */}
                        <div>
                          <label className="text-sm font-semibold text-slate-700">Sections (Classes)</label>
                          <div className="flex flex-wrap gap-2 mt-2 mb-3">
                            {payload.sections.map((sec, idx) => (
                              <span key={idx} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 text-sm font-medium border border-indigo-100">
                                {sec}
                                <button onClick={() => handleRemoveItem('sections', idx)} className="hover:text-indigo-900 transition bg-white/50 rounded-full p-0.5"><X className="h-3 w-3" /></button>
                              </span>
                            ))}
                          </div>
                          <div className="flex gap-2 max-w-lg">
                            <input 
                              className="builder-input flex-1" 
                              placeholder="Add section (e.g. AIML-A)" 
                              value={newSection} 
                              onChange={e => setNewSection(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddItem('sections', newSection, setNewSection); } }}
                            />
                            <button type="button" onClick={() => handleAddItem('sections', newSection, setNewSection)} className="px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition"><Plus className="h-5 w-5" /></button>
                          </div>
                        </div>

                        {/* Rooms Array */}
                        <div>
                          <label className="text-sm font-semibold text-slate-700">Rooms <span className="font-normal text-xs text-slate-400 ml-2">(Must include 'Lab' for laboratory rooms)</span></label>
                          <div className="flex flex-wrap gap-2 mt-2 mb-3">
                            {payload.rooms.map((room, idx) => (
                              <span key={idx} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-sm font-medium border border-emerald-100">
                                {room}
                                <button onClick={() => handleRemoveItem('rooms', idx)} className="hover:text-emerald-900 transition bg-white/50 rounded-full p-0.5"><X className="h-3 w-3" /></button>
                              </span>
                            ))}
                          </div>
                          <div className="flex gap-2 max-w-lg">
                            <input 
                              className="builder-input flex-1" 
                              placeholder="Add room (e.g. Lab 401)" 
                              value={newRoom} 
                              onChange={e => setNewRoom(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddItem('rooms', newRoom, setNewRoom); } }}
                            />
                            <button type="button" onClick={() => handleAddItem('rooms', newRoom, setNewRoom)} className="px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition"><Plus className="h-5 w-5" /></button>
                          </div>
                        </div>

                        {/* Teachers Array */}
                        <div>
                          <label className="text-sm font-semibold text-slate-700">Teachers</label>
                          <div className="flex flex-wrap gap-2 mt-2 mb-3">
                            {payload.teachers.map((t, idx) => (
                              <span key={idx} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 text-sm font-medium border border-amber-100">
                                {t}
                                <button onClick={() => handleRemoveItem('teachers', idx)} className="hover:text-amber-900 transition bg-white/50 rounded-full p-0.5"><X className="h-3 w-3" /></button>
                              </span>
                            ))}
                          </div>
                          <div className="flex gap-2 max-w-lg">
                            <input 
                              className="builder-input flex-1" 
                              placeholder="Add teacher (e.g. Dr. Smith)" 
                              value={newTeacher} 
                              onChange={e => setNewTeacher(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddItem('teachers', newTeacher, setNewTeacher); } }}
                            />
                            <button type="button" onClick={() => handleAddItem('teachers', newTeacher, setNewTeacher)} className="px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition"><Plus className="h-5 w-5" /></button>
                          </div>
                        </div>
                      </div>

                      <hr className="border-slate-200" />

                      {/* Courses */}
                      <div className="space-y-6">
                        <h4 className="text-sm font-bold text-slate-800 border-b pb-2 flex justify-between items-center">
                          Courses Overview ({payload.courses.length})
                        </h4>
                        
                        {/* Add Course Form - MULTI-SECTION ENABLED */}
                        <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-5">
                          <div className="flex flex-wrap justify-between items-center border-b border-slate-200 pb-3 gap-2">
                            <p className="text-sm font-bold text-slate-700">Add New Course to Sections</p>
                            <div className="flex bg-slate-200/60 p-1 rounded-xl">
                              <button 
                                onClick={() => setCourseInputMode('single')} 
                                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition ${courseInputMode === 'single' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                              >
                                Single Course
                              </button>
                              <button 
                                onClick={() => setCourseInputMode('paired_labs')} 
                                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition ${courseInputMode === 'paired_labs' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                              >
                                Paired Batched Labs
                              </button>
                            </div>
                          </div>
                          
                          {courseInputMode === 'single' ? (
                            <>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <input placeholder="Course ID (e.g. CS101)" className="builder-input" value={newCourse.id} onChange={e => setNewCourse({...newCourse, id: e.target.value})} />
                                <input placeholder="Course Name (e.g. Web Dev)" className="builder-input" value={newCourse.name} onChange={e => setNewCourse({...newCourse, name: e.target.value})} />
                                
                                {/* MULTI-SELECT CHIPS FOR SECTIONS */}
                                <div className="col-span-1 sm:col-span-2 bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
                                  <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-2">Assign Course to these Sections:</p>
                                  <div className="flex flex-wrap gap-2">
                                    {payload.sections.length === 0 && <span className="text-xs text-slate-400 italic">Add sections in Infrastructure first...</span>}
                                    {payload.sections.map(s => (
                                      <button
                                        key={s}
                                        type="button"
                                        onClick={() => toggleCourseSection(s)}
                                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                                          newCourse.sections.includes(s) 
                                            ? 'bg-blue-600 text-white shadow-md ring-1 ring-blue-700' 
                                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800'
                                        }`}
                                      >
                                        {s}
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                <input placeholder="Teacher Initials (comma separated)" className="builder-input" value={newCourse.teachers} onChange={e => setNewCourse({...newCourse, teachers: e.target.value})} />
                                <div className="flex items-center gap-3 px-4 border border-slate-200 rounded-lg bg-white">
                                  <input type="checkbox" checked={newCourse.is_lab} onChange={e => setNewCourse({...newCourse, is_lab: e.target.checked})} id="islab" className="w-4 h-4 text-blue-600 rounded" />
                                  <label htmlFor="islab" className="text-sm font-medium text-slate-700 cursor-pointer">Requires Lab Room</label>
                                </div>
                                <input type="number" placeholder="Total Hours per Week" className="builder-input" value={newCourse.hours} onChange={e => setNewCourse({...newCourse, hours: parseInt(e.target.value)})} />
                                <input placeholder="Elective Group (Leave blank for core subjects)" className="builder-input" value={newCourse.elective_group} onChange={e => setNewCourse({...newCourse, elective_group: e.target.value})} />
                              </div>
                              
                              <button onClick={handleAddCourse} className="w-full mt-2 bg-slate-800 hover:bg-slate-900 text-white py-3 rounded-xl text-sm font-semibold shadow-md transition flex justify-center items-center gap-2">
                                <Plus className="h-5 w-5" /> Append Course to Selected Sections
                              </button>
                            </>
                          ) : (
                            <>
                              <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 mb-4">
                                <h4 className="text-sm font-bold text-indigo-900 mb-1 flex items-center gap-2">
                                  <ArrowRightLeft className="h-4 w-4" /> Create Parallel Batched Labs
                                </h4>
                                <p className="text-xs text-indigo-700/80 leading-relaxed">
                                  Combine two lab courses that happen simultaneously. The system will automatically split the section into two batches (e.g. A1/A2 and A3/A4) and schedule them to safely swap between these two labs.
                                </p>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 items-stretch">
                                {/* Lab 1 */}
                                <div className="space-y-4 bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm relative overflow-hidden">
                                  <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                                  <p className="text-sm font-bold text-slate-700 pb-1">First Lab Session</p>
                                  <input placeholder="Course ID (e.g. LAB101)" className="builder-input w-full bg-slate-50" value={pairedLabs.id1} onChange={e => setPairedLabs({...pairedLabs, id1: e.target.value})} />
                                  <input placeholder="Course Name (e.g. DL-1)" className="builder-input w-full bg-slate-50" value={pairedLabs.name1} onChange={e => setPairedLabs({...pairedLabs, name1: e.target.value})} />
                                  <div className="pt-2">
                                    <p className="text-[10px] uppercase font-bold text-slate-400 mb-2">Teacher Assignments</p>
                                    <input placeholder="Teachers for 1st Half (A1,A2)" className="builder-input w-full text-sm mb-2" value={pairedLabs.teachers1_a} onChange={e => setPairedLabs({...pairedLabs, teachers1_a: e.target.value})} />
                                    <input placeholder="Teachers for 2nd Half (A3,A4)" className="builder-input w-full text-sm" value={pairedLabs.teachers1_b} onChange={e => setPairedLabs({...pairedLabs, teachers1_b: e.target.value})} />
                                  </div>
                                </div>
                                
                                {/* Swap Icon */}
                                <div className="flex items-center justify-center py-2 md:py-0">
                                  <div className="bg-slate-100 p-2 rounded-full text-slate-400">
                                    <ArrowRightLeft className="h-5 w-5" />
                                  </div>
                                </div>

                                {/* Lab 2 */}
                                <div className="space-y-4 bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm relative overflow-hidden">
                                  <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
                                  <p className="text-sm font-bold text-slate-700 pb-1">Second Lab Session</p>
                                  <input placeholder="Course ID (e.g. LAB102)" className="builder-input w-full bg-slate-50" value={pairedLabs.id2} onChange={e => setPairedLabs({...pairedLabs, id2: e.target.value})} />
                                  <input placeholder="Course Name (e.g. CV)" className="builder-input w-full bg-slate-50" value={pairedLabs.name2} onChange={e => setPairedLabs({...pairedLabs, name2: e.target.value})} />
                                  <div className="pt-2">
                                    <p className="text-[10px] uppercase font-bold text-slate-400 mb-2">Teacher Assignments</p>
                                    <input placeholder="Teachers for 1st Half (A1,A2)" className="builder-input w-full text-sm mb-2" value={pairedLabs.teachers2_a} onChange={e => setPairedLabs({...pairedLabs, teachers2_a: e.target.value})} />
                                    <input placeholder="Teachers for 2nd Half (A3,A4)" className="builder-input w-full text-sm" value={pairedLabs.teachers2_b} onChange={e => setPairedLabs({...pairedLabs, teachers2_b: e.target.value})} />
                                  </div>
                                </div>
                              </div>
                              
                              {/* Shared Settings */}
                              <div className="mt-6 col-span-1 sm:col-span-2 space-y-4 bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                                  <p className="text-xs uppercase tracking-wider font-semibold text-slate-500">Shared Settings</p>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <input type="number" placeholder="Hours per week (e.g. 2)" className="builder-input" value={pairedLabs.hours} onChange={e => setPairedLabs({...pairedLabs, hours: parseInt(e.target.value)})} />
                                  </div>
                                  <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 pt-2">Assign to Sections:</p>
                                  <div className="flex flex-wrap gap-2">
                                    {payload.sections.length === 0 && <span className="text-xs text-slate-400 italic">Add sections first...</span>}
                                    {payload.sections.map(s => (
                                      <button
                                        key={s}
                                        type="button"
                                        onClick={() => togglePairedLabsSection(s)}
                                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                                          pairedLabs.sections.includes(s) 
                                            ? 'bg-blue-600 text-white shadow-md ring-1 ring-blue-700' 
                                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800'
                                        }`}
                                      >
                                        {s}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              <button onClick={handleAddPairedLabs} className="w-full mt-2 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl text-sm font-semibold shadow-md transition flex justify-center items-center gap-2">
                                <Plus className="h-5 w-5" /> Generate Swapped Batches for Sections
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Course List */}
                    <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-100 flex flex-col h-[calc(100vh-120px)] sticky top-6 overflow-hidden">
                          <h4 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-3 mb-4 flex justify-between items-center">
                            <span>Added Courses</span>
                            <span className="text-xs font-medium bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{payload.courses.length} Total</span>
                          </h4>
                          <div className="space-y-3 overflow-y-auto flex-1 pr-2 custom-scrollbar">
                            {payload.courses.length === 0 && (
                              <p className="text-sm text-slate-500 italic text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-300">No courses mapped yet.</p>
                            )}
                            {payload.courses.slice().reverse().map((c, i) => (
                              <div key={i} className="flex items-center justify-between bg-white border border-slate-200/80 p-4 rounded-xl shadow-sm hover:shadow-md transition">
                                <div>
                                  <p className="text-base font-bold text-slate-800">{c.name} <span className="text-xs text-blue-700 font-semibold bg-blue-100 px-2 py-0.5 rounded-full ml-2 border border-blue-200">{c.section}</span></p>
                                  <p className="text-xs text-slate-500 mt-1">{c.is_lab ? ' Lab' : ' Theory'} ·  {c.hours} hrs/week ·  {c.teachers.join(', ')} {c.elective_group && `·  ${c.elective_group}`}</p>
                                </div>
                                <button onClick={() => handleRemoveCourse(c.id, c.section)} className="p-2.5 text-slate-400 hover:bg-red-50 hover:text-red-600 rounded-xl transition" title="Delete Course">
                                  <Trash2 className="h-5 w-5" />
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
          )}


          {activeView === 'timetable' && schedule && (
            <div className="w-full animate-in fade-in slide-in-from-bottom-2 duration-300">
              
              {userRole === 'faculty' && teacherInitials && (
                <div className="mb-12">
                  <div className="flex items-center gap-3 text-sm text-slate-500 mb-6 border-b border-slate-200/60 pb-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 shadow-sm ring-1 ring-indigo-100/50">
                      <Coffee className="h-5 w-5" strokeWidth={2} />
                    </span>
                    <div className="flex flex-col">
                      <span className="text-xl font-bold text-slate-800 leading-tight">My Schedule ({teacherInitials})</span>
                      <span className="text-sm text-slate-500">Your consolidated weekly timetable across all sections</span>
                    </div>
                  </div>
                  <div className="bg-white rounded-3xl p-6 border border-indigo-100 shadow-xl ring-1 ring-indigo-900/5">
                    <TimetableGrid
                      sectionClasses={teacherClasses}
                      numDays={payload.num_days}
                      numPeriods={payload.num_periods}
                      onEmptySlot={(day, period) => {
                        // For faculty global grid, clicking empty slot shouldn't default to activeSection, it's ambiguous.
                        // We can just set extra modal to open, but prompt them to use the section view below.
                        alert("To schedule an extra class, please select the specific section from the tabs below first.")
                      }}
                      onClassClick={(cls) => !cls.is_recess && setRescheduleModal({ cls })}
                    />
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 border-b border-slate-200/60 pb-6">
                <div className="flex items-center gap-3 text-sm text-slate-500 mb-4 sm:mb-0">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 shadow-sm ring-1 ring-blue-100/50">
                    <Clock className="h-5 w-5" strokeWidth={2} />
                  </span>
                  <div className="flex flex-col">
                    <span className="text-lg font-bold text-slate-800 leading-tight">{userRole === 'faculty' ? 'Section Timetables' : `Section: ${activeSection}`}</span>
                    <span className="text-sm text-slate-400">{DAY_LABELS.slice(0, payload.num_days).join(', ')} · periods 1–{payload.num_periods}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleUndo}
                    disabled={history.length === 0}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm hover:bg-slate-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Undo2 className="h-4 w-4" /> Undo
                  </button>
                  <button
                    onClick={() => setExtraModal({})} 
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-100 px-4 py-2 text-sm font-bold text-blue-700 shadow-sm hover:bg-blue-200 transition"
                  >
                    <Plus className="h-4 w-4" /> Schedule Extra Class
                  </button>

                  {sections.length > 0 && (
                    <div className="inline-flex flex-wrap rounded-2xl border border-slate-200/70 bg-slate-100/50 p-1.5 shadow-inner">
                      {sections.map((sec) => (
                        <button
                          key={sec}
                          onClick={() => setActiveSection(sec)}
                          className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition-all ${
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
              </div>

              <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xl">
                <TimetableGrid
                  sectionClasses={sectionClasses}
                  numDays={payload.num_days}
                  numPeriods={payload.num_periods}
                  onEmptySlot={(day, period) => setExtraModal({ day, period })}
                  onClassClick={(cls) => !cls.is_recess && setRescheduleModal({ cls })}
                />
              </div>
            </div>
          )}
        </main>
      </div>
      
      {/* Modals remain structurally the same */}
      <AddExtraModal
        open={extraModal !== null}
        onClose={() => setExtraModal(null)}
        section={activeSection}
        coursesForSection={coursesForActiveSection}
        numDays={payload.num_days}
        onSubmit={(dayIndex, courseId) => handleExtraSubmitLocal(dayIndex, courseId)} 
      />

      <RescheduleModal
        open={rescheduleModal !== null}
        onClose={() => setRescheduleModal(null)}
        classLabel={
          rescheduleModal
            ? `${normalizeCourseName(rescheduleModal.cls.course_name)} · Period ${rescheduleModal.cls.period} · ${DAY_LABELS[rescheduleModal.cls.day]}`
            : ''
        }
        numDays={payload.num_days}
        onSubmit={(day) => handleRescheduleSubmitLocal(day)} 
        onRemove={handleRemoveClassLocal}
      />
    </div>
  )
}
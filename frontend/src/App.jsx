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
} from 'lucide-react'
import {
  generateTimetable,
  exportExcel,
  scheduleExtra,
  rescheduleDynamic,
  getErrorMessage,
} from './api/client'
import { samplePayload, DAY_LABELS } from './data/samplePayload'
import ErrorBanner from './components/ErrorBanner'
import TimetableGrid from './components/TimetableGrid'
import AddExtraModal from './components/AddExtraModal'
import RescheduleModal from './components/RescheduleModal'

function normalizeCourseName(name) {
  return name
    .replace(/\s*\(Rescheduled\)\s*$/i, '')
    .replace(/\s*\(Extra\)\s*$/i, '')
    .trim()
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
    const keys = Object.keys(parsed)
    if (keys.length === 0) return null
    for (const k of keys) {
      if (!Array.isArray(parsed[k])) return null
    }
    return parsed
  } catch {
    return null
  }
}

export default function App() {
  const [schedule, setSchedule] = useState(null)
  const [activeSection, setActiveSection] = useState('AIML-A')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  const [extraModal, setExtraModal] = useState(null)
  const [rescheduleModal, setRescheduleModal] = useState(null)

  const { num_days, num_periods, rooms, courses } = samplePayload
  const sections = useMemo(
    () => (schedule ? Object.keys(schedule).sort() : samplePayload.sections),
    [schedule],
  )

  const coursesForActiveSection = useMemo(
    () => courses.filter((c) => c.section === activeSection),
    [courses, activeSection],
  )

  const sectionClasses = schedule?.[activeSection] ?? []

  const dashboardStats = useMemo(() => {
    if (!schedule) return null
    const keys = Object.keys(schedule)
    let sessions = 0
    let breaks = 0
    for (const k of keys) {
      for (const c of schedule[k]) {
        if (c.is_recess) breaks += 1
        else sessions += 1
      }
    }
    return { sections: keys.length, sessions, breaks }
  }, [schedule])

  const loadTimetable = useCallback(async (fromButton = false) => {
    setError('')
    if (fromButton) setInfo('')
    setLoading(true)
    try {
      const data = await generateTimetable(samplePayload)
      if (data.status === 'success' && data.schedule) {
        setSchedule(data.schedule)
        const first = Object.keys(data.schedule).sort()[0]
        if (first) setActiveSection(first)
        setInfo(
          fromButton
            ? data.message || 'Timetable generated.'
            : data.message || 'Timetable loaded from backend.',
        )
      }
    } catch (e) {
      setSchedule(null)
      setError(getErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }, [])

  // Strict Mode–safe: ref-based "run once" breaks in React 18 dev (double mount → skip restore).
  useEffect(() => {
    let cancelled = false
    const saved = loadScheduleFromStorage()
    if (saved) {
      const first = Object.keys(saved).sort()[0]
      setSchedule(saved)
      if (first) setActiveSection(first)
      setLoading(false)
      setInfo('Saved timetable restored (this browser — refresh safe).')
      return
    }

    setLoading(true)
    ;(async () => {
      try {
        setError('')
        const data = await generateTimetable(samplePayload)
        if (cancelled) return
        if (data.status === 'success' && data.schedule) {
          setSchedule(data.schedule)
          const first = Object.keys(data.schedule).sort()[0]
          if (first) setActiveSection(first)
          setInfo(data.message || 'Timetable loaded from backend.')
        }
      } catch (e) {
        if (!cancelled) {
          setSchedule(null)
          setError(getErrorMessage(e))
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
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
    try {
      localStorage.removeItem(SCHEDULE_STORAGE_KEY)
    } catch {
      /* ignore */
    }
    setSchedule(null)
    await loadTimetable(true)
  }, [loadTimetable])

  const runExport = async () => {
    if (!schedule) return
    setError('')
    setLoading(true)
    try {
      await exportExcel({ schedule, num_days, num_periods })
      setInfo('Excel file downloaded.')
    } catch (e) {
      setError(getErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }

  const handleExtraSubmit = async (courseId) => {
    if (!schedule || extraModal === null) return
    setError('')
    setLoading(true)
    try {
      const data = await scheduleExtra({
        current_schedule: schedule,
        course_id: courseId,
        section: activeSection,
        all_courses: courses,
        all_rooms: rooms,
        target_day: extraModal.day,
        num_days,
        num_periods,
      })
      if (data.status === 'success' && data.schedule) {
        setSchedule(data.schedule)
        setInfo(data.message || 'Extra class added.')
        setExtraModal(null)
      }
    } catch (e) {
      setError(getErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }

  const handleRescheduleSubmit = async (targetDay) => {
    if (!schedule || rescheduleModal === null) return
    const cls = rescheduleModal.cls
    const course = findCourseForClass(cls, activeSection, courses)
    if (!course) {
      setError('Could not match this slot to a catalog course for rescheduling.')
      return
    }
    setError('')
    setLoading(true)
    try {
      const data = await rescheduleDynamic({
        current_schedule: schedule,
        target_day: targetDay,
        course,
        all_rooms: rooms,
        num_periods,
      })
      if (data.status === 'success' && data.schedule) {
        setSchedule(data.schedule)
        setInfo(data.message || 'Schedule updated.')
        setRescheduleModal(null)
      }
    } catch (e) {
      setError(getErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }

  const onEmptySlot = useCallback(
    (day, period) => {
      if (!schedule) return
      setExtraModal({ day, period })
    },
    [schedule],
  )

  const onClassClick = useCallback((cls) => {
    if (cls.is_recess) return
    setRescheduleModal({ cls })
  }, [])

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
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-50/60 via-white to-indigo-50/40" />
            <div className="relative flex flex-col items-center gap-5">
              <div className="relative flex h-14 w-14 items-center justify-center">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-500/15" />
                <Loader2 className="relative h-9 w-9 animate-spin text-blue-600" strokeWidth={2.25} />
              </div>
              <div className="max-w-[240px] text-center">
                <p className="text-sm font-semibold text-slate-800">
                  {schedule ? 'Applying changes…' : 'Building your timetable'}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                  {schedule ? 'Almost there.' : 'OR-Tools is placing classes under your constraints.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 shadow-[0_1px_0_0_rgba(15,23,42,0.04)] backdrop-blur-xl supports-[backdrop-filter]:bg-white/70">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4 sm:h-[3.75rem] sm:px-6 lg:px-8">
          <div className="flex min-w-0 flex-1 items-center gap-5 lg:gap-8">
            <div className="flex min-w-0 items-center gap-3">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 via-blue-600 to-indigo-600 text-white shadow-md ring-1 ring-slate-900/[0.08]"
                aria-hidden
              >
                <LayoutGrid className="h-[18px] w-[18px]" strokeWidth={2.25} />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[15px] font-semibold tracking-tight text-slate-900">AcadFlow</span>
                  <span className="hidden rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-800 ring-1 ring-emerald-600/15 sm:inline">
                    Live
                  </span>
                </div>
                <p className="truncate text-xs text-slate-500">University timetabling</p>
              </div>
            </div>

            <nav className="hidden items-center gap-0.5 md:flex" aria-label="Product">
              <span className="rounded-md bg-slate-900/[0.06] px-3 py-1.5 text-xs font-semibold text-slate-900">
                Timetable
              </span>
              <a
                href="http://127.0.0.1:8000/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
              >
                API docs
                <ExternalLink className="h-3 w-3 opacity-70" aria-hidden />
              </a>
            </nav>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <div className="mr-0.5 hidden h-7 w-px bg-slate-200/90 sm:mr-1 sm:block" aria-hidden />

            <button
              type="button"
              onClick={() => loadTimetable(true)}
              disabled={loading}
              aria-label="Regenerate timetable"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50 sm:px-3.5 sm:text-sm"
            >
              <Sparkles className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Regenerate</span>
            </button>

            <button
              type="button"
              onClick={runExport}
              disabled={loading || !schedule}
              aria-label="Export to Excel"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-40 sm:px-3.5 sm:text-sm"
            >
              <Download className="h-3.5 w-3.5 shrink-0 text-blue-600 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Export</span>
            </button>

            <button
              type="button"
              onClick={clearSavedAndRegenerate}
              disabled={loading}
              title="Clear browser save and regenerate from server"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 text-xs font-medium text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-800 disabled:opacity-40 sm:px-3"
            >
              <Trash2 className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
              <span className="hidden lg:inline">Clear</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-20 pt-10 sm:px-6 lg:px-8">
        <div className="mb-8 space-y-4">
          <ErrorBanner message={error} onDismiss={() => setError('')} />
          {info && !error && (
            <div className="flex items-start gap-3 rounded-2xl border border-emerald-200/70 bg-gradient-to-r from-emerald-50/95 via-teal-50/40 to-white px-5 py-4 text-sm text-emerald-950 shadow-soft">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                <CalendarDays className="h-4 w-4" />
              </span>
              <p className="min-w-0 flex-1 pt-1 leading-relaxed">{info}</p>
              <button
                type="button"
                onClick={() => setInfo('')}
                className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-100/80"
              >
                Dismiss
              </button>
            </div>
          )}
        </div>

        {!schedule && !loading && (
          <div className="mx-auto max-w-lg rounded-3xl border border-slate-200/80 bg-white/90 p-10 text-center shadow-soft backdrop-blur-sm">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-glow">
              <LayoutGrid className="h-8 w-8" strokeWidth={1.75} />
            </div>
            {error ? (
              <>
                <h3 className="text-lg font-semibold text-slate-900">Can&apos;t reach the solver</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Start the API at{' '}
                  <code className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-xs">127.0.0.1:8000</code>
                </p>
                <p className="mt-3 font-mono text-xs text-slate-500">cd Backend && uvicorn main:app --reload</p>
                <button
                  type="button"
                  onClick={() => loadTimetable(true)}
                  className="mt-8 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-blue-700"
                >
                  <Sparkles className="h-4 w-4" />
                  Retry
                </button>
              </>
            ) : (
              <p className="text-slate-600">
                Waiting for the timetable. Use <strong>Regenerate</strong> in the header or refresh once the backend is
                up.
              </p>
            )}
          </div>
        )}

        {schedule && dashboardStats && (
          <div className="animate-fade-up space-y-10 opacity-0 [animation-fill-mode:forwards]">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl space-y-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-blue-600">Live schedule</p>
                <h2 className="text-3xl font-bold tracking-tight sm:text-[2.35rem] sm:leading-[1.15]">
                  <span className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-800 bg-clip-text text-transparent">
                    Constraint-aware, production-ready grids
                  </span>
                </h2>
                <p className="max-w-xl text-base leading-relaxed text-slate-600">
                  Faculty, rooms, labs, parallel electives, and recess — balanced by OR-Tools. Refine slots below; your
                  browser keeps the latest version safe across refreshes.
                </p>
              </div>

              <div className="grid w-full grid-cols-3 gap-3 sm:max-w-md lg:max-w-lg">
                {[
                  { label: 'Sections', value: dashboardStats.sections, icon: Layers, hint: 'cohorts' },
                  { label: 'Sessions', value: dashboardStats.sessions, icon: Grid3X3, hint: 'slots' },
                  { label: 'Breaks', value: dashboardStats.breaks, icon: Coffee, hint: 'recess' },
                ].map((s) => (
                  <div
                    key={s.label}
                    className="rounded-2xl border border-slate-200/70 bg-white/95 p-4 shadow-soft backdrop-blur-sm transition hover:border-slate-300/80 hover:shadow-md"
                  >
                    <s.icon className="h-4 w-4 text-blue-600 opacity-80" strokeWidth={2} />
                    <p className="mt-3 text-2xl font-bold tabular-nums tracking-tight text-slate-900">{s.value}</p>
                    <p className="text-xs font-semibold text-slate-800">{s.label}</p>
                    <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{s.hint}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Clock className="h-4 w-4 text-slate-400" />
                <span>
                  <span className="font-semibold text-slate-800">{activeSection}</span>
                  <span className="text-slate-400"> · </span>
                  {DAY_LABELS.slice(0, num_days).join(', ')} · periods 1–{num_periods}
                </span>
              </div>
              <div
                className="inline-flex flex-wrap rounded-2xl border border-slate-200/70 bg-slate-100/50 p-1.5 shadow-inner backdrop-blur-sm"
                role="tablist"
                aria-label="Section"
              >
                {sections.map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    role="tab"
                    aria-selected={sec === activeSection}
                    onClick={() => setActiveSection(sec)}
                    className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 ${
                      sec === activeSection
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md ring-1 ring-blue-500/20'
                        : 'text-slate-600 hover:bg-white/90 hover:text-slate-900'
                    }`}
                  >
                    {sec}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-start gap-4 rounded-2xl border border-blue-100/80 bg-gradient-to-r from-blue-50/50 via-white to-indigo-50/40 p-5 shadow-soft">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm ring-1 ring-blue-100">
                <MousePointerClick className="h-5 w-5" strokeWidth={2} />
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-900">Built for real edits</p>
                <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-600">
                  Tap any class to move it to another day. Empty cells can take an extra session. Export to Excel when
                  you&apos;re happy — same polished layout.
                </p>
              </div>
            </div>

            <TimetableGrid
              sectionClasses={sectionClasses}
              numDays={num_days}
              numPeriods={num_periods}
              onEmptySlot={onEmptySlot}
              onClassClick={onClassClick}
            />
          </div>
        )}
      </main>

      <AddExtraModal
        open={extraModal !== null}
        onClose={() => setExtraModal(null)}
        section={activeSection}
        coursesForSection={coursesForActiveSection}
        targetDay={extraModal?.day}
        loading={loading}
        onSubmit={handleExtraSubmit}
      />

      <RescheduleModal
        open={rescheduleModal !== null}
        onClose={() => setRescheduleModal(null)}
        classLabel={
          rescheduleModal
            ? `${normalizeCourseName(rescheduleModal.cls.course_name)} · Period ${rescheduleModal.cls.period} · ${DAY_LABELS[rescheduleModal.cls.day]}`
            : ''
        }
        numDays={num_days}
        loading={loading}
        onSubmit={handleRescheduleSubmit}
      />

      <footer className="mx-auto max-w-7xl border-t border-slate-200/60 px-4 py-10 text-center sm:px-6 lg:px-8">
        <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
          AcadFlow · Dev proxy <code className="text-slate-500">/api</code> →{' '}
          <code className="text-slate-500">127.0.0.1:8000</code>
        </p>
      </footer>
      </div>
    </div>
  )
}

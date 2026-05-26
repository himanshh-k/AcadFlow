import { DAY_LABELS } from '../data/samplePayload'

const PERIOD_TIMES = [
  '9–10',
  '10–11',
  '11–12',
  '12–1',
  '1–2',
  '2–3',
  '3–4',
  '4–5',
]

function slotClasses(sectionClasses, day, period) {
  return sectionClasses.filter((c) => c.day === day && c.period === period)
}

function classDetails(courseName) {
  const extra = /\s*\(Extra\)\s*$/i.test(courseName)
  const rescheduled = /\s*\(Rescheduled\)\s*$/i.test(courseName)
  const title = courseName
    .replace(/\s*\(Extra\)\s*$/i, '')
    .replace(/\s*\(Rescheduled\)\s*$/i, '')
    .trim()
  return { title, extra, rescheduled }
}

const TheoryIcon = () => (
  <svg className="w-[10px] h-[10px] opacity-50 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
)

const LabIcon = () => (
  <svg className="w-[10px] h-[10px] opacity-50 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
)

const ExtraIcon = () => (
  <svg className="w-[10px] h-[10px] shrink-0 text-amber-300" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
)

function OrDivider() {
  return (
    <div className="flex items-center justify-center relative py-1 z-10 -mx-1">
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="h-[1px] w-full bg-slate-200"></div>
      </div>
      <span className="relative text-[8px] font-bold uppercase tracking-widest text-slate-400 bg-white px-2">or</span>
    </div>
  )
}

function ClassCard({ cls, onClassClick }) {
  if (cls.is_recess) {
    return (
      <div className="w-full h-full min-h-[3.5rem] flex items-center justify-center bg-[repeating-linear-gradient(45deg,transparent,transparent_6px,rgba(0,0,0,0.03)_6px,rgba(0,0,0,0.03)_12px)] text-xs font-bold uppercase tracking-[0.25em] text-slate-500 rounded border border-slate-200/80">
        Break
      </div>
    )
  }

  const { title, extra, rescheduled } = classDetails(cls.course_name)
  const isLab = cls.room?.toLowerCase().includes('lab') || /\bLAB\b/i.test(cls.course_name || '')
  
  let bgStyle = "bg-white text-slate-800 border-slate-200/80 hover:border-slate-400 hover:ring-1 hover:ring-slate-200"
  let Icon = TheoryIcon
  
  if (isLab) {
    bgStyle = "bg-slate-100 text-slate-800 border-slate-300 hover:border-slate-500 hover:ring-1 hover:ring-slate-300 shadow-inner"
    Icon = LabIcon
  }
  
  if (extra || rescheduled) {
    bgStyle = "bg-slate-800 text-white border-slate-900 hover:border-slate-700 hover:ring-1 hover:ring-slate-600 shadow-md"
    Icon = ExtraIcon
  }

  return (
    <button
      type="button"
      onClick={() => onClassClick(cls)}
      className={`group relative w-full h-full min-h-[3.5rem] rounded border p-2 text-left transition-all ${bgStyle} flex flex-col`}
    >
      <div className="flex items-start gap-1.5 pr-6 mb-auto">
        <div className="mt-[3px]"><Icon /></div>
        <p className="text-xs font-bold leading-tight tracking-tight line-clamp-3">{title}</p>
      </div>
      
      <div className={`absolute top-1 right-1 px-1 rounded text-[10px] font-extrabold tracking-wider ${extra || rescheduled ? 'bg-slate-700/80 text-slate-300' : 'bg-slate-200/50 text-slate-500'}`}>
        {cls.room}
      </div>

      {/* Hidden Teacher Name, revealed entirely on hover */}
      <div className="mt-2 h-0 opacity-0 transform translate-y-1 transition-all duration-300 group-hover:h-4 group-hover:opacity-100 group-hover:translate-y-0 overflow-hidden">
        <p className={`text-[10px] font-semibold tracking-wide truncate ${extra || rescheduled ? 'text-slate-400' : 'text-slate-500'}`}>
          {cls.teachers?.join(', ') || '—'}
        </p>
      </div>
    </button>
  )
}

export default function TimetableGrid({
  sectionClasses,
  numDays,
  numPeriods,
  onClassClick,
}) {
  const periods = Array.from({ length: numPeriods }, (_, i) => i + 1)
  const days = Array.from({ length: numDays }, (_, i) => i)

  return (
    <div className="overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm ring-1 ring-slate-900/[0.03]">
      <div className="border-b border-slate-300 bg-slate-50 px-5 py-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Weekly matrix</h3>
            <p className="mt-0.5 text-xs text-slate-500 font-medium">Monochrome typography view</p>
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-2.5 py-1.5 border border-blue-200 shadow-sm">
            <span className="text-sm leading-none">💡</span>
            <p className="text-[11px] font-bold text-blue-700">Click a scheduled class to move it</p>
          </div>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-sm table-fixed">
          <thead>
            <tr className="bg-slate-100/90">
              <th className="sticky left-0 z-20 w-[6rem] border-b border-r border-slate-300 bg-slate-100 px-3 py-2 text-left text-[9px] font-bold uppercase tracking-widest text-slate-500">
                Day
              </th>
              {periods.map((p) => (
                <th
                  key={p}
                  className="border-b border-r border-slate-300 bg-slate-50/50 px-1.5 py-2 text-center w-[12.5%]"
                >
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-xs font-black text-slate-700">{p}</span>
                    <span className="text-[9px] font-semibold text-slate-500">
                      {PERIOD_TIMES[p - 1] ?? '—'}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {days.map((d) => {
              const rowCells = []
              let skipNext = false
              
              for (let p = 1; p <= numPeriods; p++) {
                if (skipNext) {
                  skipNext = false
                  continue
                }
                
                const currentItems = slotClasses(sectionClasses, d, p)
                const nextItems = p < numPeriods ? slotClasses(sectionClasses, d, p + 1) : []
                
                const currentTeaching = currentItems.filter(c => !c.is_recess)
                const nextTeaching = nextItems.filter(c => !c.is_recess)
                
                // Only merge if it's a lab group
                const isLabGroup = currentTeaching.length > 0 && currentTeaching.every(c => c.room?.toLowerCase().includes('lab') || /\bLAB\b/i.test(c.course_name || ''))
                
                let continues = false
                if (isLabGroup && currentTeaching.length === nextTeaching.length) {
                  const currentKeys = currentTeaching.map(c => c.course_name).sort().join('|')
                  const nextKeys = nextTeaching.map(c => c.course_name).sort().join('|')
                  if (currentKeys === nextKeys && currentKeys !== '') {
                    continues = true
                  }
                }
                
                if (continues) {
                  rowCells.push({ period: p, span: 2, items: currentItems })
                  skipNext = true
                } else {
                  rowCells.push({ period: p, span: 1, items: currentItems })
                }
              }

              return (
                <tr key={d} className="transition-colors hover:bg-slate-50/50 group/row">
                  <th className="sticky left-0 z-10 border-b border-r border-slate-300 bg-slate-50/95 px-3 py-2 text-left text-[11px] font-bold text-slate-800 transition-colors group-hover/row:bg-slate-100/80">
                    {DAY_LABELS[d] ?? `Day ${d}`}
                  </th>
                  {rowCells.map((cell) => {
                    const { period: p, span, items } = cell
                    const teaching = items.filter((c) => !c.is_recess)
                    const recessOnly = items.length > 0 && teaching.length === 0

                    return (
                      <td
                        key={`${d}-${p}`}
                        colSpan={span}
                        className={`relative border-b border-r border-slate-300 p-1.5 align-top transition-colors ${
                          recessOnly ? 'bg-slate-50/50' : 'bg-white'
                        }`}
                      >
                        {items.length === 0 ? (
                          <div className="w-full min-h-[3.5rem] rounded bg-transparent"></div>
                        ) : (
                          <div className={`flex w-full h-full min-h-[3.5rem] flex-col gap-1`}>
                            {teaching.map((cls, idx) => (
                              <div key={`${cls.course_name}-${cls.room}-${idx}`} className="flex-1 flex flex-col">
                                {idx > 0 && <OrDivider />}
                                <div className={`flex-1 flex ${idx > 0 ? 'mt-1' : ''}`}>
                                  <ClassCard cls={cls} onClassClick={onClassClick} />
                                </div>
                              </div>
                            ))}
                            
                            {items.some((c) => c.is_recess) && (
                              <div className="flex-1 flex">
                                {items.filter((c) => c.is_recess).map((cls, idx) => (
                                  <ClassCard key={`recess-${idx}`} cls={cls} onClassClick={() => {}} />
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

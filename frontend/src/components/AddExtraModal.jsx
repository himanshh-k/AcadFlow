import { useState } from 'react'
import { BookOpen, X } from 'lucide-react'
import { DAY_LABELS } from '../data/samplePayload'

export default function AddExtraModal({
  open,
  onClose,
  section,
  coursesForSection,
  numDays,
  onSubmit,
}) {
  const [courseId, setCourseId] = useState('')
  const [dayIndex, setDayIndex] = useState('0')

  if (!open) return null

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!courseId) return
    onSubmit(parseInt(dayIndex), courseId)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        aria-label="Close modal"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md rounded-3xl border border-slate-200/80 bg-white p-7 shadow-2xl ring-1 ring-slate-900/[0.04]">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
              <BookOpen className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Schedule Extra Class</h2>
              <p className="text-sm text-slate-500">
                For section <strong>{section}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Target Day</span>
            <select
              value={dayIndex}
              onChange={(e) => setDayIndex(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none ring-blue-500 focus:ring-2"
              required
            >
              {Array.from({ length: numDays }).map((_, i) => (
                <option key={i} value={i}>
                  {DAY_LABELS[i]}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Subject</span>
            <select
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none ring-blue-500 focus:ring-2"
              required
            >
              <option value="">Select a course…</option>
              {coursesForSection.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.is_lab ? '(Lab)' : ''}
                </option>
              ))}
            </select>
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!courseId}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
            >
              Apply
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

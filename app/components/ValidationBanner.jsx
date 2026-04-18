'use client'

export default function ValidationBanner({ status, result }) {
  if (status === 'idle' || !status) return null

  if (status === 'computed') {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border-t border-green-200 text-green-700 text-xs">
        <span className="text-green-500">✓</span>
        <span className="font-medium">Expected values computed.</span>
        <span className="text-green-600">Optimal path highlighted in green.</span>
      </div>
    )
  }

  if (status === 'error') {
    const errors = result?.errors?.filter(e => !e.warning) ?? []
    const warnings = result?.errors?.filter(e => e.warning) ?? []
    return (
      <div className="px-4 py-2 bg-red-50 border-t border-red-200 text-xs">
        {errors.map((err, i) => (
          <div key={i} className="flex items-start gap-2 text-red-700 mb-1">
            <span className="mt-0.5 shrink-0">✗</span>
            <span>{err.message}</span>
          </div>
        ))}
        {warnings.map((w, i) => (
          <div key={i} className="flex items-start gap-2 text-amber-600 mb-1">
            <span className="mt-0.5 shrink-0">⚠</span>
            <span>{w.message}</span>
          </div>
        ))}
      </div>
    )
  }

  return null
}

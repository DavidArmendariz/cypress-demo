import type { TodoFilter } from '../../shared/types'

export interface TodoFiltersProps {
  value: TodoFilter
  counts: Record<TodoFilter, number>
  onChange: (filter: TodoFilter) => void
}

const FILTERS: { id: TodoFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'completed', label: 'Completed' },
]

export function TodoFilters({ value, counts, onChange }: TodoFiltersProps) {
  return (
    <div className="filters" data-cy="todo-filters" role="group" aria-label="Filter todos">
      {FILTERS.map((filter) => (
        <button
          key={filter.id}
          type="button"
          data-cy={`filter-${filter.id}`}
          aria-pressed={value === filter.id}
          onClick={() => onChange(filter.id)}
        >
          {filter.label} ({counts[filter.id]})
        </button>
      ))}
    </div>
  )
}

import { areaFor, type Destination } from '../areas'

export function AreaNavigation({ current, onNavigate }: { current: Destination; onNavigate: (destination: Destination) => void }) {
  const area = areaFor(current)
  if (!area) return null

  return <nav className="area-navigation" aria-label={`Navegação de ${area.label}`}>
    <span className="area-navigation-label">{area.label}</span>
    <div className="area-navigation-items">
      {area.destinations.map((item) => <button key={item.id} type="button" aria-current={current === item.id ? 'page' : undefined} onClick={() => onNavigate(item.id)}>{item.label}</button>)}
    </div>
  </nav>
}

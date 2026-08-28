import { ArrowLeft, CheckCircle2, Map } from 'lucide-react'
import type { KarelLevel } from '@shared/types'
import { KAREL_LEVELS } from '@shared/catalog'
import lvl1Icon from '../../assets/lvl1icon.png'
import lvl2Icon from '../../assets/lvl2icon.png'
import lvl3Icon from '../../assets/lvl3icon.png'
import lvl4Icon from '../../assets/lvl4icon.png'

interface LevelSelectGridProps {
  onBack: () => void
  onSelectLevel: (level: KarelLevel) => void
}

const LEVEL_ICONS: Record<number, string> = {
  1: lvl1Icon,
  2: lvl2Icon,
  3: lvl3Icon,
  4: lvl4Icon,
}

export function LevelSelectGrid({ onBack, onSelectLevel }: LevelSelectGridProps) {
  return (
    <section className="h-[100dvh] max-w-md mx-auto flex flex-col justify-between p-4 bg-[#0a0f12] text-white select-none">
      <header className="flex items-center gap-3 mb-4">
        <button
          className="bg-gray-900/80 border border-gray-700/50 rounded-xl p-2.5 hover:border-emerald-400 transition-colors"
          type="button"
          onClick={onBack}
          aria-label="Volver"
        >
          <ArrowLeft className="w-5 h-5 text-gray-300" />
        </button>
        <div>
          <p className="text-[10px] font-mono font-bold text-emerald-400 tracking-wider uppercase">
            MAPAS DE APRENDIZAJE
          </p>
          <h1 className="text-xl font-bold text-white">Selecciona un Mapa</h1>
        </div>
      </header>
      <div className="grid grid-cols-2 gap-3 flex-1" aria-label="Niveles de Karel">
        {KAREL_LEVELS.slice(0, 4).map((level) => (
          <button
            key={level.id}
            className="bg-gray-950/80 border border-emerald-500/20 rounded-2xl p-4 flex flex-col justify-between items-center text-center transition-all hover:border-emerald-400 active:scale-95 cursor-pointer shadow-lg"
            type="button"
            onClick={() => onSelectLevel(level)}
          >
            <span className="w-full flex justify-between items-center">
              <span className="text-[11px] font-bold text-emerald-400 tracking-wide font-mono">
                NIVEL {level.id}
              </span>
              <CheckCircle2 className="text-emerald-400 w-4 h-4" />
            </span>

            <span className="w-16 h-16 rounded-xl bg-black/40 border border-emerald-500/10 flex items-center justify-center overflow-hidden my-2 p-2">
              <img
                src={LEVEL_ICONS[level.id]}
                alt={level.title}
                className="w-full h-full object-contain"
                draggable={false}
              />
            </span>

            <span className="text-sm font-bold text-gray-100 leading-snug px-1 line-clamp-2">
              {level.title.replace(/^Nivel \d+:\s*/, '')}
            </span>

            <span className="flex items-center justify-center gap-1.5 text-[11px] font-semibold text-emerald-400 mt-2">
              <Map className="w-3.5 h-3.5" />
              Disponible
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}

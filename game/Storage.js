const STORAGE_KEY = 'retroRacer3D_records'

const DEFAULT_STATE = {
  melhorPontuacao: 0,
  melhorTempo: null,
  fasesCompletadas: 0,
}

export default class Storage {
  static load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return { ...DEFAULT_STATE }
      const parsed = JSON.parse(raw)
      // Validar estrutura mínima para evitar dados corrompidos
      if (typeof parsed !== 'object' || parsed === null) return { ...DEFAULT_STATE }
      return {
        melhorPontuacao: Number(parsed.melhorPontuacao) || 0,
        melhorTempo: typeof parsed.melhorTempo === 'string' ? parsed.melhorTempo : null,
        fasesCompletadas: Math.max(0, Math.min(3, Number(parsed.fasesCompletadas) || 0)),
      }
    } catch {
      return { ...DEFAULT_STATE }
    }
  }

  static save(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch {
      // localStorage pode estar indisponível (modo privado iOS)
    }
  }

  static reset() {
    localStorage.removeItem(STORAGE_KEY)
  }

  // Atualiza apenas se o novo resultado for melhor
  static updateIfBetter({ pontuacao, tempo, faseCompletada }) {
    const current = Storage.load()
    let updated = false

    if (typeof pontuacao === 'number' && pontuacao > current.melhorPontuacao) {
      current.melhorPontuacao = pontuacao
      updated = true
    }

    // Tempo: menor é melhor. Formato "M:SS.mm" — comparar em ms
    if (typeof tempo === 'string') {
      const novoMs = Storage._tempoParaMs(tempo)
      const atualMs = Storage._tempoParaMs(current.melhorTempo)
      if (novoMs > 0 && (atualMs === 0 || novoMs < atualMs)) {
        current.melhorTempo = tempo
        updated = true
      }
    }

    // fasesCompletadas nunca diminui
    if (typeof faseCompletada === 'number' && faseCompletada > current.fasesCompletadas) {
      current.fasesCompletadas = Math.min(3, faseCompletada)
      updated = true
    }

    if (updated) {
      Storage.save(current)
    }

    return current
  }

  // Converte "M:SS.mm" para milissegundos
  static _tempoParaMs(tempo) {
    if (!tempo || typeof tempo !== 'string') return 0
    try {
      const [minSec, ms = '0'] = tempo.split('.')
      const [min, sec = '0'] = minSec.split(':')
      return (parseInt(min) * 60000) + (parseInt(sec) * 1000) + parseInt(ms.padEnd(3, '0'))
    } catch {
      return 0
    }
  }

  // Formata milissegundos para "M:SS.mm"
  static msParaTempo(ms) {
    const min = Math.floor(ms / 60000)
    const sec = Math.floor((ms % 60000) / 1000)
    const centesimos = Math.floor((ms % 1000) / 10)
    return `${min}:${String(sec).padStart(2, '0')}.${String(centesimos).padStart(2, '0')}`
  }
}

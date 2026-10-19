import { createContext, useCallback, useContext, useState } from 'react'

const Ctx = createContext(() => {})

export function ToastProvider({ children }) {
  const [msgs, setMsgs] = useState([])
  const mostrar = useCallback((texto) => {
    const id = Math.random()
    setMsgs((m) => [...m, { id, texto }])
    setTimeout(() => setMsgs((m) => m.filter((x) => x.id !== id)), 2800)
  }, [])
  return (
    <Ctx.Provider value={mostrar}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-3 z-[70] flex flex-col items-center gap-2 px-4">
        {msgs.map((m) => (
          <div key={m.id} className="animate-pop rounded-2xl bg-navy px-4 py-3 text-sm font-semibold text-white shadow-xl ring-1 ring-energia/40">
            {m.texto}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}

export const useToast = () => useContext(Ctx)

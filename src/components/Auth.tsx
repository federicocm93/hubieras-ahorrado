'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import Image from 'next/image'

export default function Auth() {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    setLoading(true)

    try {
      if (isSignUp) {
        if (password !== confirmPassword) {
          toast.error('Las contraseñas no coinciden')
          return
        }
        const { error } = await supabase.auth.signUp({
          email,
          password,
        })
        if (error) throw error
        toast.success('¡Revisa tu email para el enlace de confirmación!')
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
      }
    } catch (error) {
      const message = 'No pudimos iniciar sesión. Verifica tus credenciales e inténtalo nuevamente.'
      if (isSignUp) {
        toast.error(error instanceof Error ? error.message : 'Error desconocido')
      } else {
        setErrorMessage(message)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-950 text-slate-100">
      <div className="relative flex-1 px-8 py-12 bg-gradient-to-b from-slate-950 to-slate-900 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-50">
          <div className="absolute -top-16 -right-24 w-72 h-72 bg-indigo-500/30 blur-3xl rounded-full"></div>
          <div className="absolute -bottom-20 -left-10 w-64 h-64 bg-cyan-400/30 blur-3xl rounded-full"></div>
        </div>
        <div className="relative max-w-lg mx-auto lg:mx-0 h-full flex flex-col gap-8 text-left">
          <div>
            <Image
              src="/hubieras-ahorrado.svg"
              alt="Hubieras Ahorrado Logo"
              width={320}
              height={120}
              className="w-48 md:w-64 lg:w-72"
            />
          </div>
          <div className="space-y-3 mt-auto pb-4">
            <p className="text-lg md:text-2xl font-semibold text-white max-w-md">
              Organiza tus gastos compartidos sin fricción.
            </p>
            <p className="text-sm md:text-base text-slate-300 max-w-md">
              Divide cuentas, registra quién pagó qué y evita malentendidos. Tu panel financiero colaborativo
              siempre a mano.
            </p>
          </div>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center bg-gray-50 px-6 py-12">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 space-y-8">
          <div>
            {isSignUp && <h2 className="text-2xl font-bold text-slate-500 text-center">
              Crea tu cuenta
            </h2>}
            {isSignUp && (
              <p className="mt-2 text-center text-sm text-slate-500">
                Regístrate para empezar a organizar tus gastos con amigos y familia.
              </p>
            )}
          </div>
          <form className="space-y-5" onSubmit={handleAuth}>
            <div className="space-y-4">
              <div className="space-y-3">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-400 placeholder-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  placeholder="tucorreo@ejemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-3">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-400 placeholder-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                {!isSignUp && errorMessage && (
                  <p className="text-sm text-red-600 mt-2">{errorMessage}</p>
                )}
              </div>
              {isSignUp && (
                <div className="space-y-3">
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 mb-1.5">
                    Confirmar contraseña
                  </label>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    required
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-400 placeholder-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    placeholder="Repite tu contraseña"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              )}
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-indigo-600 py-3 text-white font-semibold hover:bg-indigo-500 transition focus:outline-none focus:ring-4 focus:ring-indigo-200 disabled:opacity-60"
            >
              {loading ? 'Cargando...' : isSignUp ? 'Registrarme' : 'Iniciar sesión'}
            </button>
          </form>
          <div className="text-center text-sm text-slate-600">
            <span>{isSignUp ? '¿Ya tienes cuenta?' : '¿No tienes cuenta?'}</span>{' '}
            <button
              type="button"
              className="font-semibold text-indigo-600 hover:text-indigo-500"
              onClick={() => {
                setIsSignUp(!isSignUp)
                setErrorMessage(null)
              }}
            >
              {isSignUp ? 'Inicia sesión' : 'Regístrate'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

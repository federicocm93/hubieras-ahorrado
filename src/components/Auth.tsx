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
    <div className="min-h-screen flex flex-col lg:flex-row bg-gray-50 lg:bg-slate-950 text-slate-100">
      <div className="lg:hidden flex justify-center px-6 pt-12 pb-6">
        <Image src="/hubieras-ahorrado.svg" alt="Hubieras Ahorrado Logo" width={520} height={180} className="w-full max-w-[80rem]" />
      </div>
      <div className="hidden lg:flex relative flex-1 px-6 py-10 sm:px-10 sm:py-12 bg-gradient-to-br from-indigo-700 via-indigo-800 to-slate-900 overflow-hidden">
        {/* Geometric accent — clean, not blurry */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] border border-white/5 rounded-full -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] border border-white/5 rounded-full translate-y-1/3 -translate-x-1/4 pointer-events-none" />

        <div className="relative max-w-6xl w-full mx-auto flex flex-col items-center gap-8 text-center">
          <Image
            src="/hubieras-ahorrado.svg"
            alt="Hubieras Ahorrado Logo"
            width={400}
            height={140}
            className="w-[48rem] md:w-[64rem] lg:w-[72rem] max-w-full"
          />
          <div className="space-y-4 mt-auto pb-4">
            <p className="text-2xl md:text-3xl font-bold text-white max-w-md mx-auto leading-tight">
              Organiza tus gastos compartidos sin fricción.
            </p>
            <p className="text-base text-indigo-200 max-w-md mx-auto leading-relaxed">
              Divide cuentas, registra quién pagó qué y evita malentendidos. Tu panel financiero colaborativo
              siempre a mano.
            </p>
          </div>
        </div>
      </div>
      <div className="relative z-20 flex flex-1 items-center justify-center bg-gray-50 px-5 py-10 sm:px-8 lg:py-12 text-slate-900 dark:text-slate-100">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 sm:p-8 space-y-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 text-center">
              {isSignUp ? 'Crea tu cuenta' : 'Bienvenido de nuevo'}
            </h2>
            {isSignUp && (
              <p className="mt-2 text-center text-sm text-slate-500 dark:text-slate-400">
                Regístrate para empezar a organizar tus gastos con amigos y familia.
              </p>
            )}
          </div>
          <form className="space-y-5" onSubmit={handleAuth}>
            <div className="space-y-4">
              <div className="space-y-3">
                <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900"
                  placeholder="tucorreo@ejemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-3">
                <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
                  Contraseña
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                {!isSignUp && errorMessage && (
                  <p className="text-sm text-red-600 dark:text-red-400 mt-2">{errorMessage}</p>
                )}
              </div>
              {isSignUp && (
                <div className="space-y-3">
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
                    Confirmar contraseña
                  </label>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    required
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900"
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
              className="btn-press w-full rounded-xl bg-indigo-600 py-3.5 text-white font-bold hover:bg-indigo-500 transition focus:outline-none focus:ring-4 focus:ring-indigo-200 dark:focus:ring-indigo-900 disabled:opacity-60 text-base"
            >
              {loading ? 'Cargando...' : isSignUp ? 'Registrarme' : 'Iniciar sesión'}
            </button>
          </form>
          <div className="text-center text-sm text-slate-600 dark:text-slate-300">
            <span>{isSignUp ? '¿Ya tienes cuenta?' : '¿No tienes cuenta?'}</span>{' '}
            <button
              type="button"
              className="font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
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

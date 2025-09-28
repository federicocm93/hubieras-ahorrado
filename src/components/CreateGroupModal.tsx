'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { X, Plus, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

interface CreateGroupModalProps {
  onClose: () => void
  onSuccess: () => void
}

export default function CreateGroupModal({ onClose, onSuccess }: CreateGroupModalProps) {
  const { user } = useAuth()
  const [groupName, setGroupName] = useState('')
  const [inviteEmails, setInviteEmails] = useState([''])
  const [loading, setLoading] = useState(false)

  const addEmailField = () => {
    setInviteEmails([...inviteEmails, ''])
  }

  const removeEmailField = (index: number) => {
    if (inviteEmails.length > 1) {
      setInviteEmails(inviteEmails.filter((_, i) => i !== index))
    }
  }

  const updateEmail = (index: number, email: string) => {
    const newEmails = [...inviteEmails]
    newEmails[index] = email
    setInviteEmails(newEmails)
  }

  const validateEmails = (emails: string[]) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const validEmails = emails.filter(email => email.trim() && emailRegex.test(email.trim()))
    return validEmails
  }


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !groupName.trim()) return

    setLoading(true)

    try {
      // Validate emails
      const validEmails = validateEmails(inviteEmails)
      if (validEmails.length === 0) {
        toast.error('Por favor ingresa al menos un email válido')
        return
      }

      // Remove current user's email if included
      const filteredEmails = validEmails.filter(email => email.toLowerCase() !== user.email?.toLowerCase())
      
      if (filteredEmails.length === 0) {
        toast.error('No puedes invitarte a ti mismo')
        return
      }

      // Create the group
      const { data: group, error: groupError } = await supabase
        .from('groups')
        .insert([{
          name: groupName.trim(),
          created_by: user.id,
        }])
        .select()
        .single()

      if (groupError) throw groupError

      // Add creator as group member
      const { error: memberError } = await supabase
        .from('group_members')
        .insert([{
          group_id: group.id,
          user_id: user.id,
        }])

      if (memberError) throw memberError

      // Send invitations
      const invitations = filteredEmails.map(email => ({
        group_id: group.id,
        invited_by: user.id,
        invited_email: email.trim().toLowerCase(),
        status: 'pending' as const,
      }))

      const { error: inviteError } = await supabase
        .from('group_invitations')
        .insert(invitations)

      if (inviteError) throw inviteError

      // Note: Notifications will be created when invited users log in or refresh
      // The AuthContext will check for pending invitations and create notifications
      
      toast.success(`Grupo "${groupName}" creado exitosamente`)
      onSuccess()
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      console.error('Error creating group:', errorMessage)
      toast.error('Error al crear el grupo: ' + errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-white/10 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-colors">
      <div className="bg-white dark:bg-slate-900 rounded-lg max-w-md w-full text-gray-900 dark:text-slate-100 shadow-lg transition-colors">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700 transition-colors">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 transition-colors">
            Crear Grupo
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label htmlFor="groupName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors">
              Nombre del Grupo
            </label>
            <input
              type="text"
              id="groupName"
              required
              className="mt-1 block w-full border border-gray-300 dark:border-slate-700 rounded-md px-3 py-2 text-gray-900 dark:text-slate-100 bg-white dark:bg-slate-800 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Ej: Roommates, Viaje a Europa"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 transition-colors">
              Invitar Usuarios (Email)
            </label>
            {inviteEmails.map((email, index) => (
              <div key={index} className="flex items-center space-x-2 mb-2">
                <input
                  type="email"
                  className="flex-1 border border-gray-300 dark:border-slate-700 rounded-md px-3 py-2 text-gray-900 dark:text-slate-100 bg-white dark:bg-slate-800 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  value={email}
                  onChange={(e) => updateEmail(index, e.target.value)}
                  placeholder="usuario@ejemplo.com"
                />
                {inviteEmails.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeEmailField(index)}
                    className="text-red-500 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addEmailField}
              className="flex items-center text-sm text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
            >
              <Plus className="h-4 w-4 mr-1" />
              Agregar otro email
            </button>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100 dark:border-slate-800 transition-colors">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-slate-700 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Creando...' : 'Crear Grupo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

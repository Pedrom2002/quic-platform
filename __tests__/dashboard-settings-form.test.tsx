// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest'
import { SettingsForm } from '@/app/dashboard/settings/SettingsForm'
import type { TeamMember, Organization } from '@/types/database'

const { mockUpdate, mockEq, mockFrom, mockUpdateUser, mockCreateClient, mockToastError, mockToastSuccess } = vi.hoisted(() => ({
  mockUpdate: vi.fn(),
  mockEq: vi.fn(),
  mockFrom: vi.fn(),
  mockUpdateUser: vi.fn(),
  mockCreateClient: vi.fn(),
  mockToastError: vi.fn(),
  mockToastSuccess: vi.fn(),
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: mockCreateClient,
}))
vi.mock('sonner', () => ({
  toast: { error: mockToastError, success: mockToastSuccess },
}))

afterEach(() => {
  cleanup()
})

beforeEach(() => {
  mockUpdate.mockReset()
  mockEq.mockReset()
  mockFrom.mockReset()
  mockUpdateUser.mockReset()
  mockCreateClient.mockReset()
  mockToastError.mockReset()
  mockToastSuccess.mockReset()

  mockUpdate.mockReturnValue({ eq: mockEq })
  mockFrom.mockReturnValue({ update: mockUpdate })
  mockCreateClient.mockReturnValue({
    from: mockFrom,
    auth: { updateUser: mockUpdateUser },
  })
})

const member = {
  id: 'member-1',
  full_name: 'Maria Silva',
  role: 'admin',
  organizations: { name: 'Quic Eventos', slug: 'quic-eventos' },
} as unknown as TeamMember & { organizations: Pick<Organization, 'name' | 'slug'> | null }

describe('SettingsForm', () => {
  it('renders organization, profile and password sections', () => {
    render(<SettingsForm member={member} userEmail="maria@example.com" />)

    expect(screen.getByText('Quic Eventos')).toBeInTheDocument()
    expect(screen.getByText('quic-eventos')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Maria Silva')).toBeInTheDocument()
    expect(screen.getByDisplayValue('maria@example.com')).toBeDisabled()
    expect(screen.getByText('admin')).toBeInTheDocument()
  })

  it('saves the profile name and shows a success toast', async () => {
    mockEq.mockResolvedValue({ error: null })
    render(<SettingsForm member={member} userEmail="maria@example.com" />)

    fireEvent.change(screen.getByDisplayValue('Maria Silva'), { target: { value: 'Maria Nova' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar perfil' }))

    await waitFor(() => expect(mockToastSuccess).toHaveBeenCalledWith('Perfil atualizado'))
    expect(mockFrom).toHaveBeenCalledWith('team_members')
    expect(mockUpdate).toHaveBeenCalledWith({ full_name: 'Maria Nova' })
    expect(mockEq).toHaveBeenCalledWith('id', 'member-1')
  })

  it('shows an error toast when saving the profile fails', async () => {
    mockEq.mockResolvedValue({ error: { message: 'Falha ao guardar' } })
    render(<SettingsForm member={member} userEmail="maria@example.com" />)

    fireEvent.click(screen.getByRole('button', { name: 'Guardar perfil' }))

    await waitFor(() => expect(mockToastError).toHaveBeenCalledWith('Falha ao guardar'))
    expect(mockToastSuccess).not.toHaveBeenCalled()
  })

  it('rejects changing the password when the two fields do not match', async () => {
    render(<SettingsForm member={member} userEmail="maria@example.com" />)

    fireEvent.change(screen.getByPlaceholderText('Mínimo 6 caracteres'), { target: { value: 'password1' } })
    fireEvent.change(screen.getByPlaceholderText('Repetir password'), { target: { value: 'password2' } })
    fireEvent.click(screen.getByRole('button', { name: 'Alterar password' }))

    await waitFor(() => expect(mockToastError).toHaveBeenCalledWith('As passwords não coincidem'))
    expect(mockUpdateUser).not.toHaveBeenCalled()
  })

  it('rejects a password shorter than 6 characters', async () => {
    render(<SettingsForm member={member} userEmail="maria@example.com" />)

    fireEvent.change(screen.getByPlaceholderText('Mínimo 6 caracteres'), { target: { value: '123' } })
    fireEvent.change(screen.getByPlaceholderText('Repetir password'), { target: { value: '123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Alterar password' }))

    await waitFor(() => expect(mockToastError).toHaveBeenCalledWith('A password deve ter pelo menos 6 caracteres'))
    expect(mockUpdateUser).not.toHaveBeenCalled()
  })

  it('changes the password and clears the fields on success', async () => {
    mockUpdateUser.mockResolvedValue({ error: null })
    render(<SettingsForm member={member} userEmail="maria@example.com" />)

    const newPasswordInput = screen.getByPlaceholderText('Mínimo 6 caracteres')
    const confirmPasswordInput = screen.getByPlaceholderText('Repetir password')
    fireEvent.change(newPasswordInput, { target: { value: 'newpassword' } })
    fireEvent.change(confirmPasswordInput, { target: { value: 'newpassword' } })
    fireEvent.click(screen.getByRole('button', { name: 'Alterar password' }))

    await waitFor(() => expect(mockToastSuccess).toHaveBeenCalledWith('Password alterada com sucesso'))
    expect(mockUpdateUser).toHaveBeenCalledWith({ password: 'newpassword' })
    expect(newPasswordInput).toHaveValue('')
    expect(confirmPasswordInput).toHaveValue('')
  })
})

// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { axe, toHaveNoViolations } from 'jest-axe'

expect.extend(toHaveNoViolations)

vi.mock('@/app/dashboard/events/[eventId]/tasks/actions', () => ({
  uploadFileToTaskAction: vi.fn(),
  linkFileToTaskAction: vi.fn(),
  unlinkFileFromTaskAction: vi.fn(),
}))

vi.mock('@/app/dashboard/events/[eventId]/checklist/actions-files', () => ({
  loadEventFilesForLinkingAction: vi.fn(),
}))

import TaskSidePanelFiles from '@/components/events/TaskSidePanelFiles'
import {
  uploadFileToTaskAction,
  linkFileToTaskAction,
  unlinkFileFromTaskAction,
} from '@/app/dashboard/events/[eventId]/tasks/actions'
import { loadEventFilesForLinkingAction } from '@/app/dashboard/events/[eventId]/checklist/actions-files'
import type { EventTaskFileLink, EventFileWithUploader } from '@/types/app'

afterEach(cleanup)

function makeFileLink(overrides: Partial<EventTaskFileLink> = {}): EventTaskFileLink {
  return {
    id: 'link-1',
    task_id: 'task-1',
    event_file_id: 'file-1',
    organization_id: 'org-1',
    linked_by: 'member-1',
    created_at: '2026-07-01T00:00:00.000Z',
    file: {
      id: 'file-1',
      event_id: 'event-1',
      organization_id: 'org-1',
      uploaded_by: 'member-1',
      file_name: 'contrato.pdf',
      file_size: 2048,
      mime_type: 'application/pdf',
      blob_url: 'https://blob.example.com/contrato.pdf',
      blob_pathname: 'contrato.pdf',
      created_at: '2026-07-01T00:00:00.000Z',
      uploader: { id: 'member-1', full_name: 'Ana Silva', avatar_url: null },
    },
    ...overrides,
  }
}

function makeEventFile(overrides: Partial<EventFileWithUploader> = {}): EventFileWithUploader {
  return {
    id: 'file-2',
    event_id: 'event-1',
    organization_id: 'org-1',
    uploaded_by: 'member-1',
    file_name: 'rider.pdf',
    file_size: 1024,
    mime_type: 'application/pdf',
    blob_url: 'https://blob.example.com/rider.pdf',
    blob_pathname: 'rider.pdf',
    created_at: '2026-07-01T00:00:00.000Z',
    uploader: { id: 'member-1', full_name: 'Ana Silva', avatar_url: null },
    ...overrides,
  }
}

function baseProps(overrides: Partial<React.ComponentProps<typeof TaskSidePanelFiles>> = {}) {
  return {
    eventId: 'event-1',
    taskId: 'task-1',
    fileLinks: [] as EventTaskFileLink[] | null,
    setFileLinks: vi.fn(),
    ...overrides,
  }
}

describe('TaskSidePanelFiles', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing given typical props', () => {
    render(<TaskSidePanelFiles {...baseProps()} />)
    expect(screen.getByText('Ficheiros')).toBeInTheDocument()
  })

  it('shows a loading state when fileLinks is null', () => {
    render(<TaskSidePanelFiles {...baseProps({ fileLinks: null })} />)
    expect(screen.getByText('A carregar...')).toBeInTheDocument()
  })

  it('shows the file count and renders existing file links', () => {
    const fileLinks = [makeFileLink()]
    render(<TaskSidePanelFiles {...baseProps({ fileLinks })} />)
    expect(screen.getByText('contrato.pdf')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('shows the download link pointing to the file blob url', () => {
    const fileLinks = [makeFileLink()]
    render(<TaskSidePanelFiles {...baseProps({ fileLinks })} />)
    const downloadLink = screen.getByRole('link', { name: 'Descarregar contrato.pdf' })
    expect(downloadLink).toHaveAttribute('href', 'https://blob.example.com/contrato.pdf')
  })

  it('uploading a file calls uploadFileToTaskAction and updates fileLinks', async () => {
    const uploaded = makeFileLink({ id: 'link-new' })
    vi.mocked(uploadFileToTaskAction).mockResolvedValue(uploaded)
    const setFileLinks = vi.fn()
    render(<TaskSidePanelFiles {...baseProps({ setFileLinks })} />)

    const file = new File(['conteudo'], 'novo.pdf', { type: 'application/pdf' })
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [file] } })

    await waitFor(() => {
      expect(uploadFileToTaskAction).toHaveBeenCalledWith('event-1', 'task-1', expect.any(FormData))
    })
    await waitFor(() => {
      expect(setFileLinks).toHaveBeenCalled()
    })
  })

  it('shows an uploading indicator while the upload is in progress', async () => {
    let resolveUpload: (value: EventTaskFileLink | null) => void = () => {}
    vi.mocked(uploadFileToTaskAction).mockReturnValue(new Promise(res => { resolveUpload = res }))
    render(<TaskSidePanelFiles {...baseProps()} />)

    const file = new File(['conteudo'], 'novo.pdf', { type: 'application/pdf' })
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [file] } })

    expect(await screen.findByText('A carregar...')).toBeInTheDocument()
    resolveUpload(null)
  })

  it('unlinking a file removes it optimistically and calls unlinkFileFromTaskAction', async () => {
    vi.mocked(unlinkFileFromTaskAction).mockResolvedValue(true)
    const fileLinks = [makeFileLink({ id: 'link-to-remove' })]
    const setFileLinks = vi.fn()
    render(<TaskSidePanelFiles {...baseProps({ fileLinks, setFileLinks })} />)

    fireEvent.click(screen.getByRole('button', { name: 'Desligar contrato.pdf' }))

    expect(setFileLinks).toHaveBeenCalled()
    await waitFor(() => {
      expect(unlinkFileFromTaskAction).toHaveBeenCalledWith('event-1', 'task-1', 'link-to-remove')
    })
  })

  it('opening the link-existing picker loads event files via loadEventFilesForLinkingAction', async () => {
    vi.mocked(loadEventFilesForLinkingAction).mockResolvedValue([makeEventFile()])
    render(<TaskSidePanelFiles {...baseProps()} />)

    fireEvent.click(screen.getByRole('button', { name: /ligar existente/i }))

    await waitFor(() => {
      expect(loadEventFilesForLinkingAction).toHaveBeenCalledWith('event-1')
    })
    expect(await screen.findByText('rider.pdf')).toBeInTheDocument()
  })

  it('excludes already-linked files from the picker results', async () => {
    const linked = makeEventFile({ id: 'file-1', file_name: 'contrato.pdf' })
    const unlinked = makeEventFile({ id: 'file-2', file_name: 'rider.pdf' })
    vi.mocked(loadEventFilesForLinkingAction).mockResolvedValue([linked, unlinked])
    const fileLinks = [makeFileLink({ event_file_id: 'file-1' })]
    render(<TaskSidePanelFiles {...baseProps({ fileLinks })} />)

    fireEvent.click(screen.getByRole('button', { name: /ligar existente/i }))

    const picker = await screen.findByText('Ligar ficheiro existente')
    expect(picker).toBeInTheDocument()
    expect(screen.getByText('rider.pdf')).toBeInTheDocument()
    // "contrato.pdf" already appears once in the main file-links list; it should not
    // also show up as a pickable option in the modal.
    expect(screen.getAllByText('contrato.pdf')).toHaveLength(1)
  })

  it('linking a file from the picker calls linkFileToTaskAction and updates state', async () => {
    const toLink = makeEventFile()
    vi.mocked(loadEventFilesForLinkingAction).mockResolvedValue([toLink])
    vi.mocked(linkFileToTaskAction).mockResolvedValue(makeFileLink({ id: 'link-new-2', event_file_id: 'file-2' }))
    const setFileLinks = vi.fn()
    render(<TaskSidePanelFiles {...baseProps({ setFileLinks })} />)

    fireEvent.click(screen.getByRole('button', { name: /ligar existente/i }))
    const pickerItem = await screen.findByText('rider.pdf')
    fireEvent.click(pickerItem)

    await waitFor(() => {
      expect(linkFileToTaskAction).toHaveBeenCalledWith('event-1', 'task-1', 'file-2')
    })
    await waitFor(() => {
      expect(setFileLinks).toHaveBeenCalled()
    })
  })

  it('filters picker results by search text', async () => {
    vi.mocked(loadEventFilesForLinkingAction).mockResolvedValue([
      makeEventFile({ id: 'a', file_name: 'rider.pdf' }),
      makeEventFile({ id: 'b', file_name: 'planta-palco.pdf' }),
    ])
    render(<TaskSidePanelFiles {...baseProps()} />)

    fireEvent.click(screen.getByRole('button', { name: /ligar existente/i }))
    await screen.findByText('rider.pdf')

    fireEvent.change(screen.getByPlaceholderText('Pesquisar...'), { target: { value: 'planta' } })

    expect(screen.queryByText('rider.pdf')).not.toBeInTheDocument()
    expect(screen.getByText('planta-palco.pdf')).toBeInTheDocument()
  })

  it('closing the picker via the X button hides the modal', async () => {
    vi.mocked(loadEventFilesForLinkingAction).mockResolvedValue([makeEventFile()])
    render(<TaskSidePanelFiles {...baseProps()} />)

    fireEvent.click(screen.getByRole('button', { name: /ligar existente/i }))
    await screen.findByText('Ligar ficheiro existente')

    fireEvent.click(screen.getByRole('button', { name: 'Fechar' }))
    expect(screen.queryByText('Ligar ficheiro existente')).not.toBeInTheDocument()
  })

  it('upload trigger and link-existing button are accessible (a11y basics)', () => {
    const fileLinks = [makeFileLink()]
    render(<TaskSidePanelFiles {...baseProps({ fileLinks })} />)
    expect(screen.getByRole('button', { name: /ligar existente/i })).toBeInTheDocument()
    expect(document.querySelector('input[type="file"]')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Descarregar contrato.pdf' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Desligar contrato.pdf' })).toBeInTheDocument()
  })

  it('has no axe violations', async () => {
    const fileLinks = [makeFileLink()]
    const { container } = render(<TaskSidePanelFiles {...baseProps({ fileLinks })} />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  }, 15000)
})

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export async function POST(req: Request) {
  try {
    const { fullName, email, phone, company, message } = await req.json()

    if (!fullName?.trim() || !email?.trim()) {
      return Response.json(
        { error: 'Nome e email são obrigatórios' },
        { status: 400 }
      )
    }

    if (!isValidEmail(email)) {
      return Response.json(
        { error: 'Email inválido' },
        { status: 400 }
      )
    }

    // TODO: Guardar em BD quando tabela golden_circle_applications existir
    // Por enquanto, retorna sucesso (email será enviado via função edge/cron)
    console.log('Golden Circle application:', { fullName, email, phone, company })

    return Response.json(
      { success: true, message: 'Candidatura recebida com sucesso. Enviaremos um email de confirmação.' },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error:', error)
    return Response.json(
      { error: 'Erro ao processar candidatura' },
      { status: 500 }
    )
  }
}

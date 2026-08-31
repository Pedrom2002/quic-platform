import { createClient } from '@/lib/supabase/server'
import { validateEmail } from '@/lib/validate'

export async function POST(req: Request) {
  try {
    const { fullName, email, phone, company, message } = await req.json()

    if (!fullName?.trim() || !email?.trim()) {
      return Response.json(
        { error: 'Nome e email são obrigatórios' },
        { status: 400 }
      )
    }

    if (!validateEmail(email)) {
      return Response.json(
        { error: 'Email inválido' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { error: insertError } = await supabase
      .from('golden_circle_applications')
      .insert({
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone?.trim() || null,
        company: company?.trim() || null,
        message: message?.trim() || null,
        status: 'pending',
        created_at: new Date().toISOString(),
      })

    if (insertError) {
      console.error('DB error:', insertError)
      return Response.json(
        { error: 'Erro ao guardar candidatura. Tenta novamente.' },
        { status: 500 }
      )
    }

    // TODO: Enviar email de confirmação

    return Response.json(
      { success: true, message: 'Candidatura recebida com sucesso' },
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

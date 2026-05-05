# CSV Client Import — Design

**Goal:** Importar até 50 clientes de uma vez via CSV na página de clientes do evento.

**Constraints:** Sem novas dependências. Usa actions existentes. Só no contexto de um evento.

---

## Localização

Botão "Importar CSV" na página `app/dashboard/events/[eventId]/clients/page.tsx`, junto ao botão "Novo Cliente".

## Fluxo

1. User clica "Importar CSV" → abre Dialog
2. Upload de ficheiro `.csv` → parse no cliente (browser FileReader + split por linha)
3. Preview em tabela: nome, email, telefone, empresa + coluna de erros por linha
4. Linhas com erro (nome vazio, email inválido) marcadas a vermelho com mensagem
5. User confirma → chamada em sequência a `createAndAddClientAction` para cada linha válida
6. Progresso mostrado ("3 de 10 importados...") + resumo final ("10 importados, 2 com erro")

## Formato CSV

```
nome,email,telefone,empresa
João Silva,joao@exemplo.pt,+351912345678,Empresa Lda
```

- Primeira linha = headers (case-insensitive, ordem livre)
- Colunas obrigatórias: `nome` (ou `name`)
- Colunas opcionais: `email`, `telefone` (ou `phone`), `empresa` (ou `company`)
- Separador: vírgula. Encoding: UTF-8.
- Máximo 50 linhas de dados (excluindo header)

## Validação (cliente-side)

- Nome vazio: erro "Nome obrigatório"
- Email presente mas formato inválido: erro "Email inválido"
- Mais de 50 linhas: erro global, import bloqueado

## Ficheiros

| Ficheiro | Tipo |
|---|---|
| `components/events/CsvImportDialog.tsx` | Novo — Dialog com upload, preview, confirmação |
| `app/dashboard/events/[eventId]/clients/page.tsx` | Modificado — botão + integração do dialog |

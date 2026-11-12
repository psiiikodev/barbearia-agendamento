# Barbearia — Sistema de Agendamento

Projeto de estudo para criar um sistema de agendamento usando Node.js, Express,
HTML, CSS e JavaScript.

## Requisitos

- Node.js 22 ou superior
- npm

## Como executar

Na pasta do projeto, crie seu arquivo local de credenciais e inicie o servidor:

```powershell
Copy-Item .env.example .env
npm install
npm run dev
```

Edite o `.env` e substitua os valores de exemplo. `ADMIN_PASSWORD` deve ter ao
menos 12 caracteres e `SESSION_SECRET` ao menos 32. Gere um segredo aleatório
executando:

```powershell
node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
```

Use o valor gerado em `SESSION_SECRET`. Não compartilhe nem envie o `.env` ao
Git. Acesse <http://localhost:3000/admin> para entrar na área administrativa.

Abra <http://localhost:3000>. Para verificar a API diretamente, acesse
<http://localhost:3000/api/health>.

## Estrutura inicial

- `server.js`: servidor Express, rotas REST e autenticação por sessão.
- `db/database.js`: inicialização das tabelas SQLite.
- `private/admin.html`: página administrativa, servida somente após login.
- `public/`: páginas, estilos e scripts públicos.
- `.env`: credenciais locais, ignoradas pelo Git.

## Página pública

A página inicial apresenta o nome exibido no perfil, a cidade e os serviços
informados no Instagram. Horário e localização estão identificados como dados
do perfil/a confirmar; preços, endereço completo e durações não são presumidos.
Os links de contato direcionam ao Instagram até a confirmação dos canais de
agendamento.

O banco SQLite é criado automaticamente em `data/barbearia.sqlite` na primeira
execução. A pasta `data/` contém os dados locais e não deve ser enviada ao Git.

## Rotas disponíveis

| Método | Rota | Descrição |
| --- | --- | --- |
| `GET` | `/api/health` | Verifica se a API está funcionando. |
| `GET` | `/api/auth/session` | Informa se a sessão atual está autenticada. |
| `POST` | `/api/auth/login` | Inicia sessão com usuário e senha do `.env`. |
| `POST` | `/api/auth/logout` | Encerra a sessão atual. |
| `GET` | `/api/services` | Lista serviços (requer login). |
| `POST` | `/api/services` | Cadastra serviço (requer login). |
| `GET` | `/api/barbers` | Lista barbeiros (requer login). |
| `POST` | `/api/barbers` | Cadastra barbeiro (requer login). |

Exemplo de corpo para `POST /api/services`:

```json
{
  "name": "Corte",
  "durationMinutes": 30,
  "price": 45
}
```

Exemplo de corpo para `POST /api/barbers`:

```json
{
  "name": "Alex"
}
```

Os campos `active` são opcionais e assumem `true` por padrão. Nomes repetidos
retornam `409 Conflict`; dados inválidos retornam `400 Bad Request`.

## Sessão e publicação

A página <http://localhost:3000/admin> permite cadastrar e consultar serviços e
barbeiros após o login. As sessões expiram após oito horas e usam cookie `HttpOnly`
e `SameSite=Strict`; em produção o cookie também é `Secure`. Há limite de cinco
tentativas de login por IP a cada 15 minutos.

O armazenamento de sessões padrão do Express é apenas para desenvolvimento e
reiniciar o servidor encerra as sessões. Antes de publicar, configure um
armazenamento de sessão persistente apropriado para sua hospedagem e use HTTPS.
Também confirme que o armazenamento do SQLite na hospedagem é persistente; caso
contrário, migre para um banco de dados hospedado.

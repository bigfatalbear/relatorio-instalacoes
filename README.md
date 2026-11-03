# Relatório de Instalações (PWA)

**App online:** https://bigfatalbear.github.io/relatorio-instalacoes/

App instalável para registrar instalações de internet e câmeras, gerar **relatórios semanais, mensais e sob demanda** e compartilhar por **WhatsApp**, **e-mail**, texto ou CSV.

Baseado na planilha `rolatorio.xlsx`: colunas DATA, SEMANA, ID, CLIENTES, INSTALAÇÃO (R$ 120), CÂMERA (R$ 50), QTD.INSTALAÇÃO e QTD.CÂMERA.

## Funcionalidades

- **Lançamentos**: data, ID e nome do cliente, quantidade e valor de instalações e câmeras, status e observação.
- **Editar / apagar** qualquer lançamento, com filtro por mês e busca por nome/ID.
- **Relatório semanal** (segunda a domingo, semana ISO).
- **Relatório mensal** por mês.
- **Relatório personalizado** por intervalo de datas, com atalhos (hoje, últimos 7 dias, esta semana, este mês, mês passado).
- **Totais**: instalações, câmeras, valor por dia, média diária e total geral.
- **Compartilhar**:
  - WhatsApp (`wa.me`) com texto formatado;
  - E-mail (`mailto:`) com assunto pronto;
  - Compartilhamento nativo do Android (Web Share API);
  - Copiar texto, baixar **CSV** e **imprimir/salvar PDF**.
- **Importar planilha** `.xlsx`, `.xls` ou `.csv` (detecta cabeçalhos e datas).
- **Backup** em JSON, restauração e **compartilhamento do arquivo** (Drive, WhatsApp, e-mail…).
- **Login com Google** e **sincronização automática** com o Google Drive (pasta privada do app).
- **PWA**: funciona offline, instala na tela inicial, abre em tela cheia.

## Privacidade

Os dados ficam **somente no armazenamento local do navegador** do aparelho (`localStorage`). Nada é enviado para servidor algum. O repositório não contém dados de clientes — apenas o app.

> ⚠️ Se limpar os dados do navegador, os lançamentos são apagados. Use **Ajustes → Baixar backup** periodicamente.

## Como usar

1. Abra o link do GitHub Pages no Chrome do celular.
2. Toque em **Instalar app** (ou menu ⋮ → *Adicionar à tela inicial*).
3. Vá em **Ajustes**, confira os valores padrão e importe a planilha (opcional).
4. Cadastre lançamentos em **Lançamentos**.
5. Em **Relatórios**, escolha o tipo, gere e compartilhe.

### Importar a planilha

Em **Ajustes → Importar planilha**, selecione o `.xlsx`. O app lê todas as abas, ignora linhas de total e entende datas do Excel. Se já houver lançamentos, escolha:

- **OK** → adiciona aos existentes (duplicados são ignorados);
- **Cancelar** → substitui tudo pelos dados da planilha.

## Google Drive (login e sincronização)

O app entra com a **sua** conta Google e guarda um `relatorio-instalacoes-backup.json` na pasta privada do app no Drive (escopo `drive.appdata`). O arquivo **não aparece** na lista normal do Drive e nenhum outro app consegue lê-lo.

### Configuração única (10 min, gratuita)

1. Abra <https://console.cloud.google.com> e crie um projeto (ex.: `Relatorio Instalacoes`).
2. **APIs e serviços → Biblioteca** → ative **Google Drive API**.
3. **APIs e serviços → Tela de consentimento OAuth**:
   - Tipo: **Externo**;
   - Preencha nome do app e e-mail de suporte;
   - Em **Usuários de teste**, adicione o seu e-mail;
   - Salve.
4. **APIs e serviços → Credenciais → Criar credenciais → ID do cliente OAuth**:
   - Tipo: **Aplicativo da Web**;
   - **Origens JavaScript autorizadas**: `https://bigfatalbear.github.io`
     (sem caminho, sem barra no final);
   - Criar.
5. Copie o **Client ID** (termina em `.apps.googleusercontent.com`).
6. No app: **Ajustes → Google Drive**, cole o Client ID e toque em **Entrar com Google**.
7. Autorize o acesso e toque em **Sincronizar agora**.

> O Client ID é público (não é segredo). Não é necessário Client Secret nem URL de redirecionamento.
> Enquanto o app estiver em modo **Testing** no Google Cloud, só os e-mails cadastrados como testadores conseguem entrar.

### Como a sincronização funciona

- **Manual:** botões *Sincronizar agora* e *Restaurar do Drive*.
- **Automática:** ao salvar qualquer lançamento/ajuste, o app envia o backup após ~5 s (se a opção estiver marcada).
- **Conflitos:** se o arquivo no Drive estiver mais recente, o app pergunta antes de sobrescrever (OK restaura, Cancelar envia o local).
- O login vale ~1 hora por sessão; depois o app tenta renovar sozinho ou pede um toque em *Entrar com Google*.
- Offline: as alterações ficam no aparelho e são enviadas quando a conexão volta.

### Limitações

- É necessário criar o Client ID na sua conta Google (não há como embutir um segredo no site estático).
- Para distribuir o app para muitas pessoas fora dos testadores, o Google pode exigir verificação do OAuth.
- A exclusão do backup no Drive não apaga os dados locais (e vice-versa).

## Desenvolvimento local

```bash
npm start          # http://localhost:4173
npm run check      # valida sintaxe dos módulos
```

Ou:

```bash
python -m http.server 4173
```

Não abra o `index.html` direto como arquivo (`file://`): módulos ES e service worker exigem HTTP.

## Publicação no GitHub Pages

```bash
gh repo create relatorio-instalacoes --public --source=. --push
gh api -X POST repos/{owner}/relatorio-instalacoes/pages \
  -f build_type=legacy -f 'source[branch]=main' -f 'source[path]=/'
```

URL: `https://{owner}.github.io/relatorio-instalacoes/`

> Ao alterar arquivos, incremente `CACHE` no topo de `sw.js` (ex.: `ri-v2`) para forçar a atualização nos aparelhos que já instalaram o app.

## Estrutura

```
index.html            # telas (lançamentos, relatórios, ajustes)
css/styles.css        # tema claro/escuro, impressão
js/app.js             # interface e eventos
js/db.js              # localStorage, datas e valores
js/reports.js         # agregação, texto e CSV dos relatórios
js/share.js           # WhatsApp, e-mail, share nativo, download
js/import.js          # leitura de xlsx/xls/csv
js/drive.js           # login Google e sincronização com o Drive
sw.js                 # cache offline
manifest.webmanifest  # instalação PWA
vendor/xlsx.full.min.js
icons/
```

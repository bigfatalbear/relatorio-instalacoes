# Relatório de Instalações (PWA)

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
- **Backup** em JSON e restauração.
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

## Estrutura

```
index.html            # telas (lançamentos, relatórios, ajustes)
css/styles.css        # tema claro/escuro, impressão
js/app.js             # interface e eventos
js/db.js              # localStorage, datas e valores
js/reports.js         # agregação, texto e CSV dos relatórios
js/share.js           # WhatsApp, e-mail, share nativo, download
js/import.js          # leitura de xlsx/xls/csv
sw.js                 # cache offline
manifest.webmanifest  # instalação PWA
vendor/xlsx.full.min.js
icons/
```

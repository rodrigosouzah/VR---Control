# VR Control — Gestão Rural

Primeira versão do app baseada no protótipo fornecido, preservando a paleta verde, os fundos claros e os destaques âmbar, azul e lilás. A imagem original está em `logos/Logo2.png`.

## Desenvolvimento

Requer Node.js 22.12+ (validado com Node.js 24) e npm.

```sh
npm ci
npm run dev
```

O Vite informa a porta no terminal. Para gerar os arquivos de produção:

```sh
npm run build
npm run preview
```

Para gerar um arquivo que abre diretamente no navegador, sem instalar Node.js no computador de quem vai usá-lo:

```sh
npm run build:standalone
```

Abra `dist/VR-Control.html` com Chrome, Safari, Edge ou Firefox. O HTML contém o código, o estilo e o logo. Não depende de um servidor ou da conexão com este ambiente. Os dados continuam locais ao navegador; alguns navegadores podem restringir a persistência de arquivos abertos diretamente do disco, e o app mostra um aviso se não conseguir salvar.

Em ambientes que não permitem escrever no cache padrão do npm, acrescente `--cache /tmp/vr-npm-cache` aos comandos de instalação.

## Funcionalidades

- Painel com indicadores calculados a partir dos registros.
- Cadastros de colheita, insumos, receitas, despesas e atividades.
- Alertas de estoque mínimo, busca, filtros e exclusão com confirmação.
- Calendário mensal, conclusão e reabertura de atividades.
- Relatórios e exportação CSV dos registros, respeitando os filtros da área.
- Configuração de fazenda, responsável, localização e safra.
- Layout responsivo, navegação por teclado e formulários em português.

## Dados e limites da primeira versão

O app inicia com **dados de demonstração**. Os registros ficam exclusivamente no `localStorage` deste navegador, com a chave `vr-control-v1`. Não existe backend, autenticação, sincronização entre dispositivos ou backup automático. Excluir os dados do navegador remove os registros. Exporte os CSVs antes disso; a importação ainda não está implementada.

O financeiro soma apenas lançamentos realizados. O gráfico mostra receitas efetivamente registradas por mês. A produtividade agrega a produção e a área dos registros de colheita; talhões repetidos em registros distintos contam novamente. Não há movimentação automática de estoque entre os módulos.

Não são necessárias credenciais ou serviços externos para executar esta versão. O logo e os demais recursos usados pelo app são locais.

## Publicação no GitHub Pages

O build usa caminhos relativos e pode ser hospedado em `/VR---Control/`. Os arquivos da primeira publicação estão na branch `gh-pages`.

No repositório, em **Settings → Pages**, selecione **Deploy from a branch**, branch **gh-pages**, pasta **/ (root)** e salve. O GitHub precisa concluir o deploy antes de o endereço `https://rodrigosouzah.github.io/VR---Control/` ficar disponível. O envio da branch, por si só, não confirma a ativação do site.

Em atualizações futuras, gere `npm run build` e publique o conteúdo de `dist/` na branch `gh-pages`. A publicação desta versão não adiciona servidor de dados nem login.

## Verificação funcional

Com o app em execução, usando Python com `playwright` e Chromium instalados:

```sh
python tests/smoke.py
```

Use `BASE_URL` para mudar a URL padrão de teste e `CHROMIUM_PATH` para o executável do navegador. Os testes usam um contexto isolado, sem alterar os dados de uma sessão de usuário. Cobrem criação nos quatro módulos, cálculos financeiros, persistência, filtros, CSV, calendário, exclusão, configurações e navegação em celular.

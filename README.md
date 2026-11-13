# VR Control — Gestão Rural

Aplicativo para a gestão de uma fazenda produtora de uvas em Petrolina, PE, baseado no protótipo fornecido. Preserva a paleta verde, os fundos claros e os destaques âmbar, azul e lilás. A imagem original está em `logos/Logo2.png`.

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

## Organização

O painel tem nove cards: **Plantio, Planilha de Colheita, Planilha de Insumos, Água, Fruta, Relatórios, Folhas de Funcionários, Colaboradores e Fluxo Financeiro**. Plantio aparece antes de Colheita também no menu.

- **Plantio:** calendário diário, semanal e mensal por lote e válvula, lista suspensa de variedades, previsão de colheita, quantidade plantada e múltiplos insumos com tipo, quantidade, unidade e custo. A equipe utiliza os colaboradores cadastrados, com horas, diárias e pagamentos. Insumos e mão de obra são apontamentos vinculados: editar ou excluir o plantio atualiza o grupo inteiro, sem duplicar custos. Registros planejados não viram despesas realizadas. A previsão de colheita gera um evento de calendário; não se presume um ciclo de produção. Para mudar a válvula ou data de um insumo/funcionário vinculado, edite o plantio principal.

- **Tempo por dia no Plantio:** ícones clicáveis em todos os dias abrem temperatura mínima/máxima, chance e volume de chuva, para a localização configurada. A Open-Meteo é consultada com horizonte de até 16 dias. Datas sem resposta, passadas ou além do horizonte são identificadas como indisponíveis; o app não extrapola previsões. Dados salvos e falhas de atualização são sinalizados. A tela inicial continua mostrando os próximos sete dias. A consulta e o cache são compartilhados entre o painel e o calendário, com atualização a cada dez minutos e botão para atualizar manualmente.

- **Lotes e válvulas:** 467 tem oito válvulas; 463 tem dez. A identidade inclui lote e número da válvula, evitando mistura entre números iguais de lotes diferentes. As variedades iniciais seguem a referência fornecida: 467 V.01 Sugar Crisp, V.02–08 Vitória; 463 V.01–02 e V.04 Timpson, V.03 e V.05–07 Vitória, V.08–10 Sugar Crisp.
- **Colheita:** calendário diário, semanal e mensal com números de válvula clicáveis. A ficha reúne produção, equipe, custos, água, vendas, previsões de poda e colheita e anotações diárias/semanais. Metadados e lançamentos podem ser editados. Mudar a variedade atual da válvula não reescreve a variedade histórica salva nos lançamentos.
- **Diário interno:** data, lote, válvula, cachos, caixas, peso em kg e equipe. Cada pessoa tem horários, intervalo, horas ajustáveis, diária inteira/meia diária ou cálculo por hora, extra e comissão. Editar o diário atualiza a equipe vinculada sem duplicar apontamentos.
- **Colaboradores e folhas:** cadastro Fixo/Avulso, função, valores de referência e histórico individual. A folha consolida os mesmos apontamentos e oferece uma grade por dia, filtros e exportação CSV. Falta e falta justificada são registradas explicitamente; dias sem registro não são classificados como faltas.
- **Insumos:** cadastro de compras/saldo, fornecedor, quantidade, preço, nota fiscal e anexo. Calendário simples de adubação vinculado à válvula, separando aplicação planejada de realizada.
- **Fruta:** vendas independentes do diário interno. ARGOFRUTA vem como comprador padrão editável; data/semana, NF, variedade, descrição, peso, caixas, base do preço kg/caixa, bruto, desconto editável, líquido, M.I/M.E, vencimento e recebimento pendente/parcial/total. Exportação CSV segue as colunas do controle comercial.
- **Água e financeiro:** volume de irrigação em m³ e custo por válvula. Custos fixos e outros lançamentos gerais permanecem no financeiro. Custos de produção são apropriados por realização; caixa recebe apenas pagamentos/recebimentos confirmados. A mesma linha vinculada é reutilizada, sem criar uma segunda despesa automática.
- **Clima:** consulta Open-Meteo para as coordenadas de Petrolina, PE, com fonte, horário, temperatura, vento e previsão de chuva e sete dias. Atualização a cada dez minutos enquanto a tela está aberta, cache identificado e tratamento de indisponibilidade. Coordenadas são configuráveis; geolocalização só é solicitada ao usar o botão correspondente. Não há valores meteorológicos inventados como fallback.

## Dados e limites da primeira versão

O app inicia com o cadastro dos 18 números de válvula e suas variedades, **sem importar nomes de funcionários, valores ou registros manuscritos das imagens**. Os registros ficam no `localStorage`, chave `vr-control-v1`; documentos ficam no IndexedDB `vr-control-documents`. Migrações preservam os lançamentos anteriormente salvos. Registros gerais de colheita de versões anteriores estão em **Registros Anteriores**.

Esta versão não possui backend, autenticação, sincronização entre dispositivos ou backup automático. Limpar os dados do navegador remove os registros e documentos. Não utilize o repositório público para armazenar notas fiscais ou dados de funcionários. As informações digitadas e anexadas no app ficam no dispositivo e não são enviadas ao GitHub.

Os anexos aceitam PDF, PNG, JPG e WebP de até 5 MB. Em Relatórios é possível exportar/importar um backup JSON dos lotes e colaboradores com validação antes da restauração. **Esse backup não contém os arquivos anexados**; baixe e guarde esses arquivos separadamente. Os demais lançamentos gerais podem ser exportados em CSV.

Caixas, cachos e peso são informados separadamente; toneladas são calculadas de kg, sem supor o peso de uma caixa. Salário mensal do cadastro é apenas referência: não há rateio salarial ou regras trabalhistas inferidas automaticamente. Horas de ausência são zeradas nos apontamentos e não geram custo de serviço na válvula; pagamentos salariais gerais podem ser registrados separadamente no financeiro. O estoque mantém o saldo cadastrado e **não é baixado automaticamente pelas aplicações**. Ajuste o saldo manualmente.

O app não precisa de credenciais para executar. Recursos visuais e logo são locais. A previsão necessita de internet e acesso HTTPS a `api.open-meteo.com`; falhas de rede são exibidas na tela. O teste automatizado usa respostas meteorológicas de teste e não comprova disponibilidade da API externa na rede do usuário.

## Publicação no GitHub Pages

O build usa caminhos relativos e pode ser hospedado em `/VR---Control/`. Os arquivos da primeira publicação estão na branch `gh-pages`.

No repositório, em **Settings → Pages**, selecione **Deploy from a branch**, branch **gh-pages**, pasta **/ (root)** e salve. O GitHub precisa concluir o deploy antes de o endereço `https://rodrigosouzah.github.io/VR---Control/` ficar disponível. O envio da branch, por si só, não confirma a ativação do site.

Em atualizações futuras, gere `npm run build` e publique o conteúdo de `dist/` na branch `gh-pages`. A publicação desta versão não adiciona servidor de dados nem login.

## Verificação funcional

Com o app em execução, usando Python com `playwright` e Chromium instalados:

```sh
python tests/smoke.py
python tests/vineyard_smoke.py
python tests/planting_smoke.py
```

Use `BASE_URL` para mudar a URL padrão de teste e `CHROMIUM_PATH` para o executável do navegador. Os testes usam contextos isolados, sem alterar uma sessão de usuário. Cobrem cadastros gerais, migração, isolamento por válvula/lote, horários, meia diária, ausência, edição sem duplicação, adubação planejada/realizada, anexos, venda com desconto e recebimento parcial, caixa, backup, parâmetros da previsão, falha de clima e navegação em celular.

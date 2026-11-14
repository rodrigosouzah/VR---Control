# VR Control — Gestão Rural

Aplicativo para a gestão de uma fazenda produtora de uvas em Petrolina, PE, baseado no protótipo fornecido. Preserva a paleta verde, os fundos claros e os destaques âmbar, azul e lilás. A imagem original está em `logos/Logo2.png`.

## Demonstração Preenchida

A cópia para testes está em **[VR Control — Demo](https://rodrigosouzah.github.io/VR---Control/demo/)**. O app principal continua no endereço original. O rodapé do principal também oferece o link **Testar com Dados Fictícios**.

Na primeira visita, a demonstração abre com seis meses de registros inventados, relativos ao dia da abertura: 18 válvulas com ciclos anteriores e atuais, plantios futuros, colheitas com equipes, adubações, notas de manejo, serviços, diesel, insumos, despesas fixas, vendas recebidas/parciais/vencidas, visitas realizadas/canceladas/agendadas e agenda. Há 10 profissionais fictícios, fixos e avulsos, um desligado, fichas completas, avatares ilustrativos, frequência, ausências, anexos de exemplo e pagamentos vinculados aos custos de mão de obra.

Os exemplos podem ser editados e excluídos; alterações persistem após recarregar. **Restaurar Dados de Exemplo** pede confirmação e recria somente a demonstração, com datas relativas ao dia da restauração. O clima e o histórico de chuva da demo são simulados, claramente identificados, e funcionam sem consultar a Open-Meteo. Produtos, doses, datas e ciclos não são orientações agronômicas. Nomes e contatos não são dados reais. Os PDFs de exemplo não possuem valor fiscal ou médico.

O HTML `demo/index.html` seleciona o modo de teste. Nenhum parâmetro da URL transforma o app principal em demonstração. Dados da demo usam `vr-control-demo-v1` e o IndexedDB `vr-control-demo-documents`; o principal mantém `vr-control-v1` e `vr-control-documents`. A restauração não remove dados ou anexos do principal. Cada navegador tem a própria cópia de teste. O build gera ambas as páginas e seus recursos compartilhados; a publicação deve incluir a pasta `demo/` e `assets/`.

## Desenvolvimento Local

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

Abra `dist/VR-Control.html` com Chrome, Safari, Edge ou Firefox. O HTML contém o código e o estilo. Não depende de um servidor ou da conexão com este ambiente. Os dados continuam locais ao navegador; alguns navegadores podem restringir a persistência de arquivos abertos diretamente do disco, e o app mostra um aviso se não conseguir salvar.

Em ambientes que não permitem escrever no cache padrão do npm, acrescente `--cache /tmp/vr-npm-cache` aos comandos de instalação.

## Organização

O painel reúne **Plantio, Planilha de Colheita, Planilha de Insumos, Serviços e Custos, Vendas, Controle de Funcionários, Agroturismo, Relatórios e Financeiro**. Água e Fruta não têm seções próprias; os registros históricos são preservados. Colaboradores é uma aba de Controle de Funcionários.

A Visão Geral mostra a saudação e a data antes do clima, os valores a receber e pagar, o saldo de caixa, as próximas visitas e as 18 válvulas. Os cards podem ser arrastados, movidos por botões, ocultados e restaurados; as preferências ficam neste navegador. Atividade Recente aparece em cada módulo. O subtítulo Gestão Rural é verde e o logo inferior foi removido.

Cada válvula mostra a variedade, o mês previsto de colheita e uma barra de tempo decorrido entre as datas informadas. A barra não mede maturação da fruta. As cores editoriais são Vitória (roxo), Sugar Crisp (verde) e Timpson (âmbar); não representam características agronômicas verificadas. A consulta externa às fontes oficiais foi bloqueada pela rede do ambiente.

- **Plantio:** calendário diário, semanal e mensal por lote e válvula, lista suspensa de variedades, previsão de colheita, quantidade plantada e múltiplos insumos com tipo, quantidade, unidade e custo. A equipe utiliza os colaboradores cadastrados, com horas, diárias e pagamentos. Insumos e mão de obra são apontamentos vinculados: editar ou excluir o plantio atualiza o grupo inteiro, sem duplicar custos. Registros planejados não viram despesas realizadas. A previsão de colheita gera um evento de calendário; não se presume um ciclo de produção. Para mudar a válvula ou data de um insumo/funcionário vinculado, edite o plantio principal.

- **Tempo por dia no Plantio:** ícones clicáveis em todos os dias abrem temperatura mínima/máxima, chance e volume de chuva, para a localização configurada. A Open-Meteo é consultada com horizonte de até 16 dias. Datas sem resposta, passadas ou além do horizonte são identificadas como indisponíveis; o app não extrapola previsões. Dados salvos e falhas de atualização são sinalizados. A tela inicial continua mostrando os próximos sete dias. A consulta e o cache são compartilhados entre o painel e o calendário, com atualização a cada dez minutos e botão para atualizar manualmente.

- **Lotes e válvulas:** 467 tem oito válvulas; 463 tem dez. A identidade inclui lote e número da válvula, evitando mistura entre números iguais de lotes diferentes. As variedades iniciais seguem a referência fornecida: 467 V.01 Sugar Crisp, V.02–08 Vitória; 463 V.01–02 e V.04 Timpson, V.03 e V.05–07 Vitória, V.08–10 Sugar Crisp.
- **Colheita:** calendário diário, semanal e mensal com números de válvula clicáveis. A ficha reúne produção, equipe, custos, água, vendas, previsões de poda e colheita e anotações diárias/semanais. Metadados e lançamentos podem ser editados. Mudar a variedade atual da válvula não reescreve a variedade histórica salva nos lançamentos.
- **Diário interno:** data, lote, válvula, cachos, caixas, peso em kg e equipe. Cada pessoa tem horários, intervalo, horas ajustáveis, diária inteira/meia diária ou cálculo por hora, extra e comissão. Editar o diário atualiza a equipe vinculada sem duplicar apontamentos.
- **Controle de Funcionários:** cadastro Fixo/Avulso com foto, função, contato, endereço, admissão e contato de emergência. Abas de colaboradores, frequência, ausências e atestados, pagamentos, trabalhos por válvula e histórico. Horários e intervalos são livres, com ajuste manual de horas. Não se presume falta por ausência de registro. Atestados ficam anexados ao período e não geram desconto automático. Pagamentos permitem diária, hora, serviço, semana, quinzena ou mês, vencimento, adicionais e descontos manuais. Uma folha pode vincular apontamentos operacionais e pagar uma única vez no caixa. Desligamento arquiva o cadastro e preserva o histórico; exclusão definitiva só é permitida sem registros vinculados.
- **Insumos:** cadastro de compras/saldo, fornecedor, quantidade, preço, nota fiscal e anexo. Calendário simples de adubação vinculado à válvula, separando aplicação planejada de realizada. Alerta de compra por saldo mínimo, prazo configurável ou programação maior que o saldo. Duração estimada = saldo atual dividido pelo consumo diário médio dos últimos 30 dias, usando produto e unidade compatíveis. Sem consumo registrado, não há estimativa. O saldo continua sendo ajustado manualmente.
- **Vendas:** vendas independentes do diário interno. ARGOFRUTA vem como comprador padrão editável; data/semana, NF, variedade, descrição, peso, caixas, base do preço kg/caixa, bruto, desconto editável, líquido, M.I/M.E, vencimento e recebimento pendente/parcial/total. Exportação CSV segue as colunas do controle comercial.
- **Serviços e Custos:** poda, amarrio, outros serviços, diesel, matéria-prima e registros históricos de água. Quantidade, unidade, preço, prestador, máquina, vencimento e pagamento; apropriação por válvula ou Geral / Não Rateado. Despesas do financeiro são reutilizadas nos custos, sem duplicação.
- **Financeiro:** contas a receber e pagar com filtros de atraso, hoje e próximos sete dias. Pendências abrem o lançamento de origem. Vendas admitem vencimento e recebimento parcial/total; pagamentos de funcionários são integrados ao caixa sem contar os apontamentos vinculados duas vezes. Alertas são internos, enquanto o app está aberto.
- **Agroturismo:** calendário mensal de visitas com grupo, pessoas, data, horário, contato, responsável, situação e atribuição opcional por lote/válvula/variedade.
- **Relatórios:** ficha imprimível por válvula, com filtro de período, custos realizados e planejados separados, serviços, diesel, insumos, equipe, horas, cachos, caixas, kg/toneladas, vendas, recebimentos, custo por kg e resultado operacional. Despesas gerais não rateadas ficam fora do resultado daquela válvula.
- **Chuva no Ciclo:** consulta de precipitação diária regional desde o plantio até a previsão de colheita, somente em datas já encerradas. Mostra dias com chuva (> 0 mm), cobertura de datas e total acumulado por válvula. Usa arquivo histórico e dados recentes da Open-Meteo. Valores ausentes permanecem indisponíveis, nunca viram zero. São estimativas meteorológicas, não medições de pluviômetro da fazenda. Hoje e datas futuras não são contabilizados.
- **Clima:** consulta Open-Meteo para as coordenadas de Petrolina, PE, com fonte, horário, temperatura, vento e previsão de chuva e sete dias. Atualização a cada dez minutos enquanto a tela está aberta, cache identificado e tratamento de indisponibilidade. Coordenadas são configuráveis; geolocalização só é solicitada ao usar o botão correspondente. Não há valores meteorológicos inventados como fallback.

Todos os lançamentos operacionais usam seletores separados de **Lote → Válvula → Variedade de Uva**. Trocar o lote limpa a válvula anterior e restringe suas opções ao lote selecionado. Compras, financeiro, agenda e o cadastro de colaboradores também oferecem a atribuição; registros compartilhados podem permanecer como Geral. Uma mudança de atribuição em um apontamento vinculado o torna independente, preservando a operação original.

## Dados e limites da primeira versão

O app inicia com o cadastro dos 18 números de válvula e suas variedades, **sem importar nomes de funcionários, valores ou registros manuscritos das imagens**. Os registros ficam no `localStorage`, chave `vr-control-v1`; documentos ficam no IndexedDB `vr-control-documents`. Migrações preservam os lançamentos anteriormente salvos. Registros gerais de colheita de versões anteriores estão em **Registros Anteriores**.

Esta versão não possui backend, autenticação, sincronização entre dispositivos ou backup automático. Limpar os dados do navegador remove os registros e documentos. Não utilize o repositório público para armazenar notas fiscais ou dados de funcionários. As informações digitadas e anexadas no app ficam no dispositivo e não são enviadas ao GitHub.

Os anexos aceitam PDF, PNG, JPG e WebP de até 5 MB. Em Relatórios é possível exportar/importar um backup JSON dos registros operacionais, funcionários, frequência, ausências, pagamentos, visitas, estoque e financeiro com validação antes da restauração. **Esse backup não contém os arquivos anexados**; baixe e guarde esses arquivos separadamente. Fotos e documentos não são incluídos no JSON. Agenda, preferências e histórico geral podem ser exportados separadamente em CSV quando disponível.

Caixas, cachos e peso são informados separadamente; toneladas são calculadas de kg, sem supor o peso de uma caixa. Salário mensal do cadastro é uma referência. A frequência e as ausências não lançam custos automaticamente. O operador define o pagamento e o vínculo com os serviços executados; a parcela não rateada aparece como despesa geral. Não se aplicam descontos ou regras trabalhistas automaticamente. O estoque mantém o saldo cadastrado e **não é baixado automaticamente pelas aplicações**. Ajuste o saldo manualmente.

O app não precisa de credenciais para executar. Recursos visuais e logo são locais. A previsão necessita de internet e acesso HTTPS a `api.open-meteo.com` e `archive-api.open-meteo.com`; falhas de rede são exibidas na tela. O teste automatizado usa respostas meteorológicas de teste e não comprova disponibilidade da API externa na rede do usuário.

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
python tests/management_smoke.py
python tests/demo_smoke.py
```

Use `BASE_URL` para mudar a URL padrão de teste e `CHROMIUM_PATH` para o executável do navegador. Os testes usam contextos isolados, sem alterar uma sessão de usuário. Cobrem cadastros gerais, migração, isolamento por válvula/lote, horários, meia diária, ausência, edição sem duplicação, adubação planejada/realizada, anexos, venda com desconto e recebimento parcial, caixa, backup, parâmetros da previsão, falha de clima e navegação em celular.

Os testes de gestão também cobrem arraste e ocultação persistente dos cards, foto e atestado, jornada livre, desligamento sem perda de histórico, pagamentos sem duplicação, contas vencidas, serviços/diesel, calendário de visitas, progresso temporal, cobertura meteorológica, previsão de duração de estoque e a janela de impressão.

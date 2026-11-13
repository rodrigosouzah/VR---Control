"""End-to-end checks for independent valves, harvest crew, fertilization and sales.

Run against the production server: BASE_URL=http://127.0.0.1:4176/VR---Control/ python tests/vineyard_smoke.py
Weather responses are isolated test fixtures; the application itself calls Open-Meteo.
No photograph, real employee identity or real accounting entry is seeded in this test.
"""
import base64
import json
import os
from datetime import date, timedelta
from playwright.sync_api import sync_playwright, expect

URL = os.environ.get('BASE_URL', 'http://127.0.0.1:5173')
TODAY = date.today().isoformat()
PNG = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j3ioAAAAASUVORK5CYII=')
forecast = {
    'timezone': 'America/Recife',
    'current': {'temperature_2m': 31.4, 'weather_code': 1, 'wind_speed_10m': 12.3},
    'daily': {
        'time': [(date.today() + timedelta(days=i)).isoformat() for i in range(7)],
        'temperature_2m_min': [22] * 7, 'temperature_2m_max': [34] * 7,
        'weather_code': [1] * 7, 'precipitation_probability_max': [35] * 7,
        'precipitation_sum': [2.1] * 7,
    },
}

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH', '/usr/bin/chromium'), headless=True, args=['--no-sandbox'])
    context = browser.new_context(viewport={'width': 1440, 'height': 1100}, locale='pt-BR', timezone_id='America/Recife')
    weather_urls = []

    def weather(route):
        weather_urls.append(route.request.url)
        route.fulfill(status=200, json=forecast, headers={'access-control-allow-origin': '*'})

    context.route('https://api.open-meteo.com/**', weather)
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto(URL, wait_until='networkidle')

    def data():
        return page.evaluate("JSON.parse(localStorage.getItem('vr-control-v1'))")

    def model():
        return data()['vineyard']

    def navigate(name):
        if page.viewport_size['width'] <= 820:
            page.get_by_role('button', name='Abrir menu', exact=True).click()
        page.locator('aside').get_by_role('button', name=name, exact=True).click()

    def dialog():
        return page.get_by_role('dialog')

    def save():
        dialog().get_by_role('button', name='Salvar Registro', exact=True).click()
        expect(dialog()).to_have_count(0)

    def valve_field(value='467-v01'):
        dialog().get_by_role('combobox', name='Lote e Válvula do Registro').select_option(value)

    def entry_id(kind, name=None):
        return next(e['id'] for e in model()['entries'] if e['kind'] == kind and (not name or e['name'] == name))

    expect(page.locator('.module-card')).to_have_count(9)
    expect(page.get_by_role('region', name='Previsão do Tempo')).to_contain_text('31°C')
    assert weather_urls and 'latitude=-9.3891' in weather_urls[0] and 'longitude=-40.5031' in weather_urls[0]
    page.get_by_role('button', name='Próximos 7 Dias').click()
    expect(page.locator('.weather-days > div')).to_have_count(7)
    valves = model()['valves']
    assert len(valves) == len({v['id'] for v in valves}) == 18
    assert [v['variety'] for v in valves if v['lot'] == '467'] == ['Sugar Crisp'] + ['Vitória'] * 7
    assert [v['variety'] for v in valves if v['lot'] == '463'] == ['Timpson', 'Timpson', 'Vitória', 'Timpson', 'Vitória', 'Vitória', 'Vitória', 'Sugar Crisp', 'Sugar Crisp', 'Sugar Crisp']
    print('PASS: nine cards, exact registry, correct Petrolina API parameters and seven-day forecast')

    navigate('Colaboradores')
    for name, link, daily in [('Profissional Fixo Teste', 'Fixo', '100'), ('Profissional Avulso Teste', 'Avulso', '80')]:
        page.get_by_role('button', name='Novo Colaborador', exact=True).click()
        dialog().get_by_label('Nome do Profissional', exact=True).fill(name)
        dialog().get_by_label('Tipo de Vínculo', exact=True).select_option(link)
        dialog().get_by_label('Função Principal', exact=True).fill('Colheita')
        dialog().get_by_label('Valor da Diária (R$)', exact=True).fill(daily)
        dialog().get_by_role('button', name='Salvar Colaborador').click()
        expect(dialog()).to_have_count(0)
    people = model()['employees']
    assert [p['type'] for p in people] == ['Fixo', 'Avulso']

    navigate('Colheita')
    page.get_by_role('button', name='Diário de Colheita', exact=True).click()
    valve_field()
    dialog().get_by_label('Quantidade de Cachos', exact=True).fill('500')
    dialog().get_by_label('Caixas Colhidas', exact=True).fill('100')
    dialog().get_by_label('Peso Colhido (kg)', exact=True).fill('1000')
    for i, person in enumerate(people, 1):
        dialog().get_by_role('button', name='Adicionar Pessoa').click()
        prefix = f'Pessoa {i} · '
        dialog().get_by_role('combobox', name=prefix + 'Profissional', exact=True).select_option(person['id'])
        dialog().get_by_label(prefix + 'Entrada', exact=True).fill('07:00')
        dialog().get_by_label(prefix + 'Saída', exact=True).fill('16:00')
        dialog().get_by_label(prefix + 'Intervalo (min)', exact=True).fill('60')
        expect(dialog().get_by_label(prefix + 'Horas Trabalhadas', exact=True)).to_have_value('8')
        if i == 1:
            dialog().get_by_label(prefix + 'Diária Trabalhada', exact=True).select_option('0.5')
            dialog().get_by_label(prefix + 'Extra (R$)', exact=True).fill('10')
            dialog().get_by_label(prefix + 'Comissão (R$)', exact=True).fill('5')
    save()
    harvest = next(e for e in model()['entries'] if e['kind'] == 'harvest')
    labor = [e for e in model()['entries'] if e['kind'] == 'labor']
    assert len(labor) == 2 and sum(e['hours'] for e in labor) == 16
    assert all(e['valveId'] == '467-v01' and e['groupId'] == harvest['id'] for e in labor)
    page.get_by_role('button', name=f"Editar registro {harvest['id']}", exact=True).click()
    dialog().get_by_label('Peso Colhido (kg)', exact=True).fill('1200')
    dialog().get_by_label('Pessoa 1 · Diária Trabalhada', exact=True).select_option('1')
    save()
    assert len([e for e in model()['entries'] if e['kind'] == 'labor']) == 2
    page.get_by_role('button', name='Abrir Lote 467 · Válvula 01', exact=True).click()
    detail = page.get_by_role('region', name='Ficha Lote 467 · Válvula 01', exact=True)
    expect(detail).to_contain_text('1,2 t')
    expect(detail.locator('.v-kpi').filter(has_text='Custo Realizado')).to_contain_text('195,00')
    print('PASS: fixed/temporary employees, harvest diary, clock interval, half-day, extras, no duplicate payroll on edit')

    page.get_by_role('button', name='Abrir Lote 463 · Válvula 01', exact=True).click()
    other = page.get_by_role('region', name='Ficha Lote 463 · Válvula 01', exact=True)
    expect(other).to_contain_text('Timpson')
    expect(other.locator('.v-kpi').filter(has_text='Produção')).to_contain_text('0 t')
    expect(other.locator('.v-kpi').filter(has_text='Custo Realizado')).to_contain_text('0,00')
    page.get_by_role('button', name='Abrir Lote 467 · Válvula 01', exact=True).click()
    detail.get_by_role('button', name='Editar Válvula').click()
    future = (date.today() + timedelta(days=2)).isoformat()
    dialog().get_by_label('Previsão de Poda', exact=True).fill(future)
    dialog().get_by_label('Área (ha)', exact=True).fill('2.5')
    dialog().get_by_role('button', name='Salvar Válvula').click()
    page.locator('.v-calendar-event').filter(has_text='Previsão de Poda').click()
    expect(detail).to_be_visible()
    for mode in ['Diário', 'Semanal', 'Mensal']:
        page.get_by_role('button', name=mode, exact=True).click()
        expect(page.get_by_role('button', name=mode, exact=True)).to_have_attribute('aria-pressed', 'true')
    print('PASS: isolation between lot 467 valve 1 and lot 463 valve 1, editable dates, clickable calendar and daily/weekly/monthly views')

    navigate('Insumos e Estoque')
    page.get_by_role('button', name='Novo Registro', exact=True).click()
    valve_field()
    dialog().get_by_label('Descrição / Produto', exact=True).fill('Aplicação NPK Teste')
    dialog().get_by_label('Quantidade Aplicada', exact=True).fill('10')
    dialog().get_by_label('Custo por kg (R$)', exact=True).fill('5')
    dialog().get_by_label('Anexar Nota Fiscal / Comprovante', exact=True).set_input_files({'name': 'nota-teste.png', 'mimeType': 'image/png', 'buffer': PNG})
    save()
    application = next(e for e in model()['entries'] if e['kind'] == 'fertilization')
    assert application['status'] == 'Planejado' and application['invoiceDocument']['name'] == 'nota-teste.png'
    page.get_by_role('button', name=f"Editar registro {application['id']}", exact=True).click()
    with page.expect_download() as info:
        dialog().get_by_role('button', name='Baixar nota-teste.png', exact=True).click()
    assert open(info.value.path(), 'rb').read() == PNG
    dialog().get_by_label('Situação do Registro', exact=True).select_option('Realizado')
    dialog().get_by_label('Situação do Pagamento', exact=True).select_option('Pago')
    dialog().get_by_label('Data do Pagamento', exact=True).fill(TODAY)
    save()
    assert len([e for e in model()['entries'] if e['kind'] == 'fertilization']) == 1
    print('PASS: fertilization schedule, actual vs planned, payment confirmation and persistent invoice attachment')

    navigate('Água')
    page.get_by_role('button', name='Novo Registro', exact=True).click()
    valve_field()
    dialog().get_by_label('Descrição / Produto', exact=True).fill('Irrigação Teste')
    dialog().get_by_label('Volume de Água (m³)', exact=True).fill('2')
    dialog().get_by_label('Custo por m³ (R$)', exact=True).fill('3')
    save()

    navigate('Fruta')
    page.get_by_role('button', name='Novo Registro', exact=True).click()
    valve_field()
    expect(dialog().get_by_label('Comprador', exact=True)).to_have_value('ARGOFRUTA')
    dialog().get_by_label('Descrição / Classificação da Fruta', exact=True).fill('Venda Teste')
    dialog().get_by_label('Número da Nota Fiscal', exact=True).fill('NF-TESTE')
    dialog().get_by_label('Peso Vendido (kg)', exact=True).fill('1000')
    dialog().get_by_label('Caixas Vendidas', exact=True).fill('100')
    dialog().get_by_label('Preço Unitário da Venda (R$)', exact=True).fill('4')
    expect(dialog().locator('.v-sale-preview')).to_contain_text('3.940,00')
    save()
    sale = next(e for e in model()['entries'] if e['kind'] == 'sale')
    expect(page.locator('.v-kpi').filter(has_text='A Receber')).to_contain_text('3.940,00')
    page.get_by_role('button', name=f"Editar venda {sale['id']}", exact=True).click()
    dialog().get_by_label('Situação do Recebimento', exact=True).select_option('Parcial')
    dialog().get_by_label('Valor Já Recebido (R$)', exact=True).fill('1000')
    dialog().get_by_label('Data do Recebimento', exact=True).fill(TODAY)
    save()
    expect(page.locator('.v-kpi').filter(has_text='A Receber')).to_contain_text('2.940,00')
    navigate('Financeiro')
    expect(page.locator('.kpi').filter(has_text='Saldo realizado')).to_contain_text('950,00')
    expect(page.locator('.v-finance-connection')).to_contain_text('251,00')
    print('PASS: irrigation costs, ARGOFRUTA sale, editable discount, net value, partial receipt, cash flow excludes unpaid costs')

    navigate('Folhas de Funcionários')
    expect(page.locator('.v-kpi').filter(has_text='Horas Trabalhadas')).to_contain_text('16 h')
    expect(page.locator('.v-kpi').filter(has_text='Valor Apurado')).to_contain_text('195,00')
    page.get_by_role('button', name='Novo Registro', exact=True).click()
    valve_field('463-v01')
    dialog().get_by_label('Profissional', exact=True).select_option(people[1]['id'])
    dialog().get_by_label('Presença', exact=True).select_option('Falta')
    save()
    expect(page.locator('.v-kpi').filter(has_text='Faltas Registradas')).to_contain_text('1')
    expect(page.locator('.v-kpi').filter(has_text='Valor Apurado')).to_contain_text('195,00')
    page.reload(wait_until='networkidle')
    assert len(model()['employees']) == 2 and len(model()['valves']) == 18
    assert any(e['kind'] == 'sale' and e['receivedAmount'] == 1000 for e in model()['entries'])

    navigate('Relatórios')
    with page.expect_download() as backup_info:
        page.get_by_role('button', name='Exportar Backup', exact=True).click()
    backup = json.load(open(backup_info.value.path()))
    assert len(backup['vineyard']['valves']) == 18
    assert any(e['invoiceDocument']['name'] == 'nota-teste.png' for e in backup['vineyard']['entries'] if e.get('invoiceDocument'))
    invalid = json.loads(json.dumps(backup))
    invalid['vineyard']['valves'] = []
    page.locator('input[type=file]').set_input_files({'name': 'invalid.json', 'mimeType': 'application/json', 'buffer': json.dumps(invalid).encode()})
    expect(page.get_by_role('status')).to_contain_text('Arquivo de backup inválido')
    assert len(model()['valves']) == 18
    page.locator('input[type=file]').set_input_files({'name': 'backup.json', 'mimeType': 'application/json', 'buffer': json.dumps(backup).encode()})
    dialog().get_by_role('button', name='Restaurar Backup', exact=True).click()
    expect(dialog()).to_have_count(0)
    assert len(model()['entries']) == len(backup['vineyard']['entries'])
    print('PASS: payroll aggregation, explicit absence, reload persistence, backup restoration and invalid-backup protection')

    page.set_viewport_size({'width': 390, 'height': 844})
    for name in ['Colheita', 'Insumos e Estoque', 'Água', 'Fruta', 'Relatórios', 'Folhas de Funcionários', 'Colaboradores', 'Financeiro', 'Visão Geral']:
        navigate(name)
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), name
    assert not errors, errors
    print('PASS: all eight areas on mobile, no horizontal page overflow and no JavaScript errors')

    # Upgrade an existing browser dataset without erasing legacy user-entered records.
    legacy_context = browser.new_context()
    legacy_context.route('https://api.open-meteo.com/**', lambda route: route.abort())
    legacy_context.add_init_script("localStorage.setItem('vr-control-v1', JSON.stringify({settings:{farm:'Fazenda Existente',owner:'Teste',location:'Araraquara, SP',season:'2026'},harvest:[{id:'preserve-me',name:'Registro Existente',quantity:3,area:1,date:'2026-11-01'}],inventory:[],transactions:[],tasks:[],activity:[]}));")
    legacy_page = legacy_context.new_page()
    legacy_page.goto(URL, wait_until='networkidle')
    upgraded = legacy_page.evaluate("JSON.parse(localStorage.getItem('vr-control-v1'))")
    assert upgraded['harvest'][0]['id'] == 'preserve-me' and len(upgraded['vineyard']['valves']) == 18
    expect(legacy_page.get_by_role('region', name='Previsão do Tempo')).to_contain_text('indisponível')
    print('PASS: migration preserves existing user records; weather failure has no fabricated temperature')
    legacy_context.close()
    context.close()
    browser.close()
    print('All vineyard functional checks passed.')

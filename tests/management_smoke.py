"""Owner workflow: configurable dashboard, RH, costs, sales, tourism and reports.

All identities and documents are synthetic. Meteorological fixtures validate date
coverage and UI behavior without claiming a live API check.
"""
import base64
import json
import os
from datetime import datetime, timedelta
from urllib.parse import urlsplit, parse_qs
from zoneinfo import ZoneInfo
from playwright.sync_api import sync_playwright, expect

DAY = datetime.now(ZoneInfo('America/Recife')).date()
TODAY = DAY.isoformat()
PAST = (DAY - timedelta(days=1)).isoformat()
START = (DAY - timedelta(days=10)).isoformat()
END = (DAY + timedelta(days=20)).isoformat()
URL = os.environ.get('BASE_URL', 'http://127.0.0.1:5173')
PNG = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j3ioAAAAASUVORK5CYII=')
forecast = {'timezone': 'America/Recife', 'current': {'temperature_2m': 31, 'weather_code': 1, 'wind_speed_10m': 12}, 'daily': {'time': [(DAY + timedelta(days=i)).isoformat() for i in range(16)], 'weather_code': [1] * 16, 'temperature_2m_min': [22] * 16, 'temperature_2m_max': [35] * 16, 'precipitation_probability_max': [40] * 16, 'precipitation_sum': [2] * 16}}
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
    context = browser.new_context(viewport={'width': 1440, 'height': 1100}, locale='pt-BR', timezone_id='America/Recife')
    def weather(route):
        query = parse_qs(urlsplit(route.request.url).query)
        if 'start_date' not in query:
            route.fulfill(status=200, json=forecast)
            return
        first = datetime.fromisoformat(query['start_date'][0]).date()
        last = datetime.fromisoformat(query['end_date'][0]).date()
        days = [first + timedelta(days=i) for i in range((last - first).days + 1)]
        route.fulfill(status=200, json={'daily': {'time': [d.isoformat() for d in days], 'precipitation_sum': [2 if d.toordinal() % 2 == 0 else 0 for d in days]}})
    context.route('https://api.open-meteo.com/**', weather)
    context.route('https://archive-api.open-meteo.com/**', weather)
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto(URL, wait_until='networkidle')
    def data(): return page.evaluate("JSON.parse(localStorage.getItem('vr-control-v1'))")
    def model(): return data()['vineyard']
    def nav(name):
        if page.viewport_size['width'] <= 820:
            page.get_by_role('button', name='Abrir menu', exact=True).click()
        page.locator('aside nav').get_by_role('button', name=name, exact=True).click()
    def dlg(): return page.get_by_role('dialog')
    def scope(lot='467', valve='467-v02'):
        dlg().get_by_label('Lote', exact=True).select_option(lot)
        dlg().get_by_label('Válvula', exact=True).select_option(valve)
    def save(label='Salvar Registro'):
        dlg().get_by_role('button', name=label, exact=True).click()
        expect(dlg()).to_have_count(0)

    expect(page.locator('.powered-by')).to_have_count(0)
    assert page.locator('.brand-copy>span').evaluate('(e)=>getComputedStyle(e).color') == 'rgb(36, 107, 69)'
    assert page.locator('.welcome').bounding_box()['y'] < page.locator('.weather-panel').bounding_box()['y']
    assert not page.locator('aside nav').get_by_role('button', name='Água', exact=True).count()
    assert not page.locator('aside nav').get_by_role('button', name='Fruta', exact=True).count()
    assert not page.locator('aside nav').get_by_role('button', name='Colaboradores', exact=True).count()
    page.get_by_role('button', name='Personalizar Painel', exact=True).click()
    dlg().get_by_role('checkbox', name='Dias com Chuva no Ciclo', exact=True).uncheck()
    dlg().get_by_role('button', name='Subir Saldo Atual do Caixa', exact=True).click()
    save('Concluir')
    page.reload(wait_until='networkidle')
    assert not page.locator('[data-dashboard-widget=rain]').count()
    assert 'rain' in data()['settings']['dashboard']['hidden']
    page.get_by_role('button', name='Reorganizar Cards', exact=True).click()
    handle = page.get_by_role('button', name='Arrastar Saldo Atual do Caixa', exact=True)
    handle.scroll_into_view_if_needed()
    box = handle.bounding_box()
    target = page.locator('[data-dashboard-widget=weather]').bounding_box()
    page.mouse.move(box['x'] + 10, box['y'] + 10)
    page.mouse.down()
    page.mouse.move(target['x'] + 20, target['y'] + 70, steps=12)
    page.mouse.up()
    assert data()['settings']['dashboard']['order'].index('cash') < data()['settings']['dashboard']['order'].index('weather')
    page.get_by_role('button', name='Concluir Organização', exact=True).click()
    page.get_by_role('button', name='Personalizar Painel', exact=True).click()
    dlg().get_by_role('button', name='Restaurar Organização Padrão').click()
    save('Concluir')
    print('PASS: branding, greeting before weather, removed pages, persistent visibility/order and pointer drag-and-drop')

    nav('Controle de Funcionários')
    page.get_by_role('button', name='Cadastrar Funcionário').click()
    dlg().get_by_label('Nome do Profissional', exact=True).fill('Funcionário de Teste')
    dlg().get_by_label('Tipo de Vínculo', exact=True).select_option('Fixo')
    dlg().get_by_label('Função Principal', exact=True).fill('Poda')
    dlg().get_by_label('Valor da Diária (R$)', exact=True).fill('100')
    dlg().get_by_label('Foto do Funcionário', exact=True).set_input_files({'name': 'foto.png', 'mimeType': 'image/png', 'buffer': PNG})
    save('Salvar Colaborador')
    person = model()['employees'][0]
    assert person['photo']['name'] == 'foto.png'
    expect(page.locator('.v-employee img').first).to_be_visible()
    page.get_by_role('tab', name='Frequência', exact=True).click()
    page.get_by_role('button', name='Registrar Jornada', exact=True).click()
    dlg().get_by_label('Funcionário', exact=True).select_option(person['id'])
    dlg().get_by_label('Horário de Entrada', exact=True).fill('06:30')
    dlg().get_by_label('Horário de Saída', exact=True).fill('15:30')
    dlg().get_by_label('Intervalo em Minutos', exact=True).fill('75')
    expect(dlg().get_by_label('Horas da Jornada', exact=True)).to_have_value('7.75')
    save('Salvar Jornada')
    assert model()['attendance'][0]['hours'] == 7.75
    page.get_by_role('button', name='Registrar Jornada', exact=True).click()
    dlg().get_by_label('Funcionário', exact=True).select_option(person['id'])
    dlg().get_by_label('Horas da Jornada', exact=True).fill('8')
    dlg().get_by_role('button', name='Salvar Jornada', exact=True).click()
    expect(dlg().get_by_role('alert')).to_contain_text('Já existe ponto')
    dlg().get_by_role('button', name='Fechar', exact=True).last.click()
    page.get_by_role('tab', name='Ausências e Atestados', exact=True).click()
    page.get_by_role('button', name='Registrar Ausência / Atestado', exact=True).click()
    dlg().get_by_label('Funcionário', exact=True).select_option(person['id'])
    dlg().get_by_label('Anexar Atestado / Documento', exact=True).set_input_files({'name': 'atestado-teste.png', 'mimeType': 'image/png', 'buffer': PNG})
    save('Salvar Ausência')
    assert model()['absences'][0]['document']['name'] == 'atestado-teste.png'
    print('PASS: employee photo, free fixed-worker hours/breaks, duplicate daily attendance protection and medical attachment')

    nav('Plantio')
    page.get_by_role('button', name='Adicionar Plantio', exact=True).click()
    scope()
    dlg().get_by_label('Data do Registro', exact=True).fill(START)
    dlg().get_by_label('Previsão de Colheita do Plantio', exact=True).fill(END)
    dlg().get_by_label('Situação do Registro', exact=True).select_option('Realizado')
    save()
    nav('Serviços e Custos')
    page.get_by_role('button', name='Registrar Serviço', exact=True).click()
    scope()
    dlg().get_by_label('Descrição / Produto', exact=True).fill('Poda Contratada Teste')
    dlg().get_by_label('Quantidade de Serviço', exact=True).fill('2')
    dlg().get_by_label('Valor Unitário do Serviço (R$)', exact=True).fill('100')
    dlg().get_by_label('Previsão de Pagamento', exact=True).fill(PAST)
    save()
    page.get_by_role('button', name='Registrar Diesel', exact=True).click()
    scope()
    dlg().get_by_label('Descrição / Produto', exact=True).fill('Diesel Teste')
    dlg().get_by_label('Litros de Diesel', exact=True).fill('10')
    dlg().get_by_label('Preço por Litro (R$)', exact=True).fill('5')
    dlg().get_by_label('Máquina / Equipamento', exact=True).fill('Trator Teste')
    dlg().get_by_label('Situação do Pagamento', exact=True).select_option('Pago')
    dlg().get_by_label('Data do Pagamento', exact=True).fill(TODAY)
    save()
    nav('Controle de Funcionários')
    page.get_by_role('tab', name='Trabalhos por Válvula', exact=True).click()
    page.get_by_role('button', name='Novo Registro', exact=True).click()
    scope()
    dlg().get_by_label('Profissional', exact=True).select_option(person['id'])
    dlg().get_by_label('Serviço / Função', exact=True).fill('Amarrio')
    dlg().get_by_label('Horas Trabalhadas', exact=True).fill('8')
    save()
    page.get_by_role('tab', name='Pagamentos', exact=True).click()
    page.get_by_role('button', name='Novo Pagamento', exact=True).click()
    dlg().get_by_label('Funcionário', exact=True).select_option(person['id'])
    dlg().get_by_label('Periodicidade do Pagamento', exact=True).select_option('Semanal')
    dlg().get_by_label('Valor Base (R$)', exact=True).fill('300')
    dlg().get_by_label('Situação do Pagamento', exact=True).select_option('Pago')
    dlg().get_by_label('Data Efetiva do Pagamento', exact=True).fill(TODAY)
    save('Salvar Pagamento')
    assert model()['entries'][-1]['paymentStatus'] == 'Pago'
    nav('Financeiro')
    expect(page.locator('.kpi').filter(has_text='Saldo realizado')).to_contain_text('350,00')
    assert '-R$' in page.locator('.kpi').filter(has_text='Saldo realizado').inner_text()
    print('PASS: service/diesel controls, custom pay frequency and payroll cash without counting labor twice')

    nav('Vendas')
    page.get_by_role('button', name='Novo Registro', exact=True).click()
    scope()
    dlg().get_by_label('Descrição / Classificação da Fruta', exact=True).fill('Venda a Prazo Teste')
    dlg().get_by_label('Peso Vendido (kg)', exact=True).fill('100')
    dlg().get_by_label('Preço Unitário da Venda (R$)', exact=True).fill('4')
    dlg().get_by_label('Vencimento / Previsão de Recebimento', exact=True).fill(PAST)
    save()
    nav('Financeiro')
    expect(page.locator('.financial-board')).to_contain_text('ARGOFRUTA')
    expect(page.locator('.financial-board')).to_contain_text('Atrasado')
    page.locator('.financial-board').get_by_role('button', name='Conferir / Atualizar', exact=True).click()
    dlg().get_by_label('Situação do Recebimento', exact=True).select_option('Recebido')
    dlg().get_by_label('Data do Recebimento', exact=True).fill(TODAY)
    save()
    nav('Financeiro')
    expect(page.locator('.kpi').filter(has_text='Saldo realizado')).to_contain_text('44,00')
    assert '-R$' not in page.locator('.kpi').filter(has_text='Saldo realizado').inner_text()
    expect(page.locator('.financial-board')).not_to_contain_text('ARGOFRUTA')
    print('PASS: due-date receivable alert, direct payment review and pending alert cleared only after receipt confirmation')

    nav('Agroturismo')
    page.get_by_role('button', name='Cadastrar Visita', exact=True).click()
    dlg().get_by_label('Nome do Grupo', exact=True).fill('Grupo Escolar Teste')
    dlg().get_by_label('Horário da Visita', exact=True).fill('09:30')
    dlg().get_by_label('Quantidade de Pessoas', exact=True).fill('18')
    save('Salvar Visita')
    expect(page.locator('.v-calendar')).to_contain_text('Grupo Escolar Teste')
    nav('Visão Geral')
    expect(page.get_by_role('progressbar', name='Progresso Lote 467 · Válvula 02', exact=True)).to_have_attribute('aria-valuenow', '33')
    expect(page.locator('.rain-history')).to_contain_text('10 de 10')
    wet_expected = sum(1 for i in range(10) if (DAY - timedelta(days=10) + timedelta(days=i)).toordinal() % 2 == 0)
    expect(page.locator('.rain-history tbody tr').first.locator('td').nth(2)).to_have_text(str(wet_expected))
    print('PASS: tourism calendar, crop progress/month, rain history counts with full measured-date coverage')

    nav('Insumos e Estoque')
    page.get_by_role('button', name='Novo registro', exact=True).click()
    dlg().get_by_label('Nome do insumo', exact=True).fill('Fertilizante Teste')
    dlg().get_by_label('Quantidade', exact=True).fill('5')
    dlg().get_by_label('Estoque mínimo', exact=True).fill('2')
    dlg().get_by_label('Preço unitário (R$)', exact=True).fill('4')
    save('Salvar lançamento')
    item = data()['inventory'][0]
    page.get_by_role('button', name='Novo Registro', exact=True).click()
    scope()
    dlg().get_by_label('Produto do Estoque', exact=True).select_option(item['id'])
    dlg().get_by_label('Quantidade Aplicada', exact=True).fill('30')
    dlg().get_by_label('Data do Registro', exact=True).fill(PAST)
    dlg().get_by_label('Situação do Registro', exact=True).select_option('Realizado')
    save()
    expect(page.locator('.inventory-forecast')).to_contain_text('5 dias')
    expect(page.locator('.inventory-forecast')).to_contain_text('Compra Próxima')
    nav('Relatórios')
    row = page.locator('tbody tr').filter(has_text='Lote 467 · Válvula 02').first
    row.get_by_role('button', name='Imprimir Ficha', exact=True).click()
    expect(dlg().locator('.printable-report')).to_contain_text('Poda Contratada Teste')
    expect(dlg().locator('.printable-report')).to_contain_text('Diesel Teste')
    page.evaluate("window.__printed='';window.open=()=>({document:{write:s=>window.__printed=s,close:()=>{}},focus:()=>{},print:()=>{window.__printCalled=true}})")
    dlg().get_by_role('button', name='Imprimir / Salvar PDF', exact=True).click()
    assert page.evaluate('window.__printCalled')
    assert 'Lote 467' in page.evaluate('window.__printed')
    dlg().get_by_role('button', name='Fechar', exact=True).last.click()
    print('PASS: inventory consumption/duration alert and printable valve report with actual cost lines')

    nav('Controle de Funcionários')
    page.get_by_role('tab', name='Colaboradores', exact=True).click()
    page.get_by_role('button', name='Desligar', exact=True).click()
    save('Confirmar Desligamento')
    assert model()['employees'][0]['active'] is False
    assert model()['employeeHistory'][0]['action'] == 'Desligamento'
    assert len(model()['attendance']) == 1 and len(model()['absences']) == 1 and len(model()['payrolls']) == 1
    page.get_by_role('button', name='Histórico Detalhado', exact=True).click()
    expect(page.get_by_role('heading', name='Funcionário de Teste', exact=True)).to_be_visible()
    page.reload(wait_until='networkidle')
    assert model()['employees'][0]['active'] is False
    page.set_viewport_size({'width': 390, 'height': 844})
    for name in ['Visão Geral', 'Controle de Funcionários', 'Agroturismo', 'Serviços e Custos', 'Vendas', 'Relatórios', 'Financeiro']:
        nav(name)
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), name
    assert not errors, errors
    print('PASS: dismissal archives the employee and preserves photo/documents/payments; mobile navigation and no JavaScript errors')
    context.close()
    browser.close()
    print('All management checks passed.')

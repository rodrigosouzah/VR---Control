"""Planting and daily forecast integration. Uses isolated browser data and weather fixtures."""
import json
import os
import re
from datetime import date, timedelta
from playwright.sync_api import sync_playwright, expect

URL = os.environ.get('BASE_URL', 'http://127.0.0.1:5173')
TODAY = date.today().isoformat()
HARVEST = (date.today() + timedelta(days=100)).isoformat()
forecast = {
    'timezone': 'America/Recife',
    'current': {'temperature_2m': 30, 'weather_code': 0, 'wind_speed_10m': 10},
    'daily': {
        'time': [(date.today() + timedelta(days=i)).isoformat() for i in range(16)],
        'temperature_2m_min': [21] * 16, 'temperature_2m_max': [35] * 16,
        'weather_code': [61] * 16, 'precipitation_probability_max': [70] * 16,
        'precipitation_sum': [4.2] * 16,
    },
}
with sync_playwright() as playwright:
    browser = playwright.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH', '/usr/bin/chromium'), headless=True, args=['--no-sandbox'])
    context = browser.new_context(viewport={'width': 1440, 'height': 1100}, locale='pt-BR', timezone_id='America/Recife')
    requests = []
    def weather(route):
        requests.append(route.request.url)
        route.fulfill(status=200, json=forecast)
    context.route('https://api.open-meteo.com/**', weather)
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto(URL, wait_until='networkidle')
    def model(): return page.evaluate("JSON.parse(localStorage.getItem('vr-control-v1')).vineyard")
    def nav(name):
        if page.viewport_size['width'] <= 820: page.get_by_role('button', name='Abrir menu', exact=True).click()
        page.locator('aside').get_by_role('button', name=name, exact=True).click()
    def dialog(): return page.get_by_role('dialog')
    def save():
        dialog().get_by_role('button', name='Salvar Registro', exact=True).click()
        expect(dialog()).to_have_count(0)

    labels = page.locator('aside nav button').all_text_contents()
    assert labels.index('Plantio') < labels.index('Colheita')
    expect(page.locator('.module-card').first).to_contain_text('Plantio')
    nav('Plantio')
    expect(page.get_by_role('heading', name='Calendário de Plantio', exact=True)).to_be_visible()
    assert requests and 'forecast_days=16' in requests[0]
    assert page.locator('.v-day-weather').count() == page.locator('.v-calendar-day').count()
    page.get_by_role('button', name=re.compile(f'Tempo em {TODAY}: Chuva')).click()
    expect(dialog()).to_contain_text('21°C a 35°C')
    expect(dialog()).to_contain_text('70%')
    expect(dialog()).to_contain_text('4.2 mm')
    dialog().get_by_role('button', name='Fechar', exact=True).click()
    past = (date.today() - timedelta(days=1)).isoformat()
    page.get_by_label('Ir para Data', exact=True).fill(past)
    page.get_by_role('button', name=re.compile(f'Tempo em {past}: Previsão indisponível')).click()
    expect(dialog()).to_contain_text('Não há previsão atualizada disponível')
    dialog().get_by_role('button', name='Fechar', exact=True).click()
    page.get_by_role('button', name='Hoje', exact=True).click()
    print('PASS: Plantio precedes Colheita; each calendar day has a forecast icon; valid forecast and unavailable past dates are distinguished')

    nav('Colaboradores')
    page.get_by_role('button', name='Novo Colaborador', exact=True).click()
    dialog().get_by_label('Nome do Profissional', exact=True).fill('Equipe Plantio Teste')
    dialog().get_by_label('Valor da Diária (R$)', exact=True).fill('120')
    dialog().get_by_label('Função Principal', exact=True).fill('Plantio')
    dialog().get_by_role('button', name='Salvar Colaborador', exact=True).click()
    employee = model()['employees'][0]
    nav('Plantio')
    page.get_by_role('button', name='Adicionar Plantio', exact=True).click()
    dialog().get_by_label('Lote e Válvula do Registro', exact=True).select_option('467-v01')
    dialog().get_by_label('Variedade do Registro', exact=True).select_option('Vitória')
    dialog().get_by_label('Previsão de Colheita do Plantio', exact=True).fill(HARVEST)
    dialog().get_by_label('Quantidade Plantada (mudas)', exact=True).fill('500')
    for i, name, kind, quantity, price in [(1, 'Mudas Teste', 'Mudas', '500', '2'), (2, 'NPK Teste', 'Fertilizantes', '10', '5')]:
        dialog().get_by_role('button', name='Adicionar Insumo', exact=True).click()
        prefix = f'Insumo {i} · '
        dialog().get_by_label(prefix + 'Produto', exact=True).fill(name)
        dialog().get_by_label(prefix + 'Tipo de Insumo', exact=True).select_option(kind)
        dialog().get_by_label(prefix + 'Quantidade', exact=True).fill(quantity)
        dialog().get_by_label(prefix + 'Custo Unitário (R$)', exact=True).fill(price)
    dialog().get_by_role('button', name='Adicionar Pessoa', exact=True).click()
    dialog().get_by_label('Pessoa 1 · Profissional', exact=True).select_option(employee['id'])
    dialog().get_by_label('Pessoa 1 · Horas Trabalhadas', exact=True).fill('8')
    dialog().get_by_label('Pessoa 1 · Diária Trabalhada', exact=True).select_option('0.5')
    expect(dialog().get_by_label('Pessoa 1 · Serviço / Função', exact=True)).to_have_value('Plantio')
    expect(dialog().locator('.v-entry-preview').last).to_contain_text('1.110,00')
    save()
    planting = next(e for e in model()['entries'] if e['kind'] == 'planting')
    children = [e for e in model()['entries'] if e.get('groupId') == planting['id']]
    assert len(children) == 3 and all(e['status'] == 'Planejado' for e in children)
    assert planting['variety'] == 'Vitória' and planting['expectedHarvestDate'] == HARVEST
    expect(page.locator('.v-kpi').filter(has_text='Custo Realizado')).to_contain_text('0,00')
    page.get_by_label('Ir para Data', exact=True).fill(HARVEST)
    forecast_event = page.locator('.v-calendar-event').filter(has_text='Previsão de Colheita do Plantio')
    expect(forecast_event).to_have_count(1)
    forecast_event.click()
    detail = page.get_by_role('region', name='Ficha Lote 467 · Válvula 01', exact=True)
    expect(detail).to_contain_text('Previsão de Colheita (Plantio)')
    detail.get_by_role('button', name='Fechar ficha', exact=True).click()
    print('PASS: editable variety, expected harvest event, two input types/quantities, employee, half-day and planned costs')

    page.get_by_role('button', name=f"Editar registro {planting['id']}", exact=True).click()
    dialog().get_by_label('Insumo 1 · Quantidade', exact=True).fill('600')
    dialog().get_by_label('Insumo 2 · Quantidade', exact=True).fill('20')
    dialog().get_by_label('Pessoa 1 · Diária Trabalhada', exact=True).select_option('1')
    dialog().get_by_label('Situação do Registro', exact=True).select_option('Realizado')
    dialog().get_by_label('Insumo 1 · Pagamento', exact=True).select_option('Pago')
    dialog().get_by_label('Insumo 1 · Data do Pagamento', exact=True).fill(TODAY)
    save()
    children = [e for e in model()['entries'] if e.get('groupId') == planting['id']]
    assert len(children) == 3 and len({e['id'] for e in children}) == 3
    expect(page.locator('.v-kpi').filter(has_text='Custo Realizado')).to_contain_text('1.420,00')
    nav('Folhas de Funcionários')
    expect(page.locator('.v-kpi').filter(has_text='Valor Apurado')).to_contain_text('120,00')
    nav('Financeiro')
    expect(page.locator('.kpi').filter(has_text='Saldo realizado')).to_contain_text(re.compile(r'-R\$\s*1\.200,00'))
    nav('Plantio')
    page.get_by_role('button', name=f"Editar registro {planting['id']}", exact=True).click()
    dialog().get_by_label('Lote e Válvula do Registro', exact=True).select_option('463-v01')
    dialog().get_by_label('Variedade do Registro', exact=True).select_option('Sugar Crisp')
    dialog().get_by_role('button', name='Remover insumo 2', exact=True).click()
    save()
    entries = model()['entries']
    assert all(e['valveId'] == '463-v01' for e in entries)
    assert len(entries) == 3 and sum(e['kind'] == 'labor' for e in entries) == 1
    assert all(e['variety'] == 'Sugar Crisp' for e in entries)
    expect(page.locator('.v-kpi').filter(has_text='Custo Realizado')).to_contain_text('1.320,00')
    page.reload(wait_until='networkidle')
    assert len(model()['entries']) == 3
    print('PASS: editing/reassignment/removal update linked inputs and payroll atomically, without duplicates; cash flow and reload persistence remain correct')

    nav('Plantio')
    page.set_viewport_size({'width': 390, 'height': 844})
    expect(page.get_by_role('heading', name='Plantio', exact=True)).to_be_visible()
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    page.get_by_role('button', name=re.compile(f'Tempo em {TODAY}: Chuva')).click()
    expect(dialog()).to_contain_text('70%')
    dialog().get_by_role('button', name='Fechar', exact=True).click()
    page.get_by_role('button', name=f"Excluir registro {planting['id']}", exact=True).click()
    dialog().get_by_role('button', name='Excluir Registro', exact=True).click()
    assert not model()['entries']
    assert not errors, errors
    print('PASS: mobile calendar icons, no overflow, deletion cleans the whole planting group and no JavaScript errors')
    context.close()
    browser.close()
    print('All planting checks passed.')

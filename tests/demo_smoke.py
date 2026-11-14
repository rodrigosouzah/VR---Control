"""Six months of synthetic data, usable workflows, and strict production isolation."""
import json
import math
import os
from collections import defaultdict
from datetime import date
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

URL = os.environ.get('BASE_URL', 'http://127.0.0.1:5173/').rstrip('/') + '/'
PRODUCTION = 'vr-control-v1'
DEMO = 'vr-control-demo-v1'

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
    context = browser.new_context(viewport={'width': 1440, 'height': 1050}, locale='pt-BR', timezone_id='America/Recife', accept_downloads=True)
    context.route('https://api.open-meteo.com/**', lambda r: r.abort())
    context.route('https://archive-api.open-meteo.com/**', lambda r: r.abort())
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto(URL, wait_until='networkidle')
    assert page.locator('.demo-banner').count() == 0
    assert len(page.evaluate(f"JSON.parse(localStorage.getItem('{PRODUCTION}')).vineyard.entries")) == 0
    page.evaluate("""async () => {
      let d = JSON.parse(localStorage.getItem('vr-control-v1'));
      d.settings.farm = 'Fazenda Principal Preservada';
      localStorage.setItem('vr-control-v1', JSON.stringify(d));
      await new Promise((resolve, reject) => {
        const r = indexedDB.open('vr-control-documents', 1);
        r.onupgradeneeded = () => r.result.createObjectStore('documents', {keyPath:'id'});
        r.onerror = reject;
        r.onsuccess = () => { const db=r.result; const t=db.transaction('documents','readwrite');
          t.objectStore('documents').put({id:'production-sentinel',blob:new Blob(['production-document'])});
          t.oncomplete=()=>{db.close();resolve()}; t.onerror=reject;
        };
      });
    }""")
    original = page.evaluate(f"localStorage.getItem('{PRODUCTION}')")
    page.goto(URL + 'demo/', wait_until='networkidle')
    expect(page.get_by_role('region', name='Ambiente de Testes')).to_be_visible()
    expect(page.locator('.weather-panel')).to_contain_text('Clima Simulado')
    expect(page.locator('.rain-history')).to_contain_text('Histórico de Chuva Simulado')
    assert not page.evaluate("Object.keys(localStorage).some(k=>k.startsWith('vr-weather:') || k.startsWith('vr-rain:'))")
    def data(): return page.evaluate(f"JSON.parse(localStorage.getItem('{DEMO}'))")
    def nav(name):
        if page.viewport_size['width'] <= 820:
            page.get_by_role('button', name='Abrir menu', exact=True).click()
        page.locator('aside nav').get_by_role('button', name=name, exact=True).click()
    def dlg(): return page.get_by_role('dialog')
    d = data(); model = d['vineyard']; rows = model['entries']
    assert len(rows) > 1500 and len(model['attendance']) > 1000
    assert len(model['employees']) == 10 and len(model['valves']) == 18
    assert len(model['visits']) >= 28 and len(model['payrolls']) > 100
    start, anchor = date.fromisoformat(d['demo']['from']), date.fromisoformat(d['demo']['anchor'])
    assert 181 <= (anchor - start).days <= 184
    assert min(r['date'] for r in rows) == start.isoformat()
    assert len({r['date'][:7] for r in rows if r['status'] == 'Realizado'}) >= 6
    assert len({r['date'][:7] for r in model['visits'] if r['status'] == 'Realizada'}) >= 6
    assert len({r['date'][:7] for r in d['transactions']}) >= 6
    assert len({r['id'] for r in rows}) == len(rows)
    valves = {v['id']: v for v in model['valves']}; employees = {e['id']: e for e in model['employees']}
    row_ids = {r['id'] for r in rows}; pay_ids = {r['id'] for r in model['payrolls']}
    days = defaultdict(float)
    for r in rows:
        valve = valves[r['valveId']]
        assert r['lot'] == valve['lot'] and r['variety'] == valve['variety']
        assert r['date'] >= start.isoformat()
        if r.get('groupId'): assert r['groupId'] in row_ids
        if r.get('payrollId'): assert r['payrollId'] in pay_ids
        if r['kind'] == 'labor' and r['status'] == 'Realizado':
            assert r['employeeId'] in employees
            assert r['date'] >= employees[r['employeeId']]['startDate']
            days[(r['employeeId'], r['date'])] += r['hours']
    attendance = {(a['employeeId'], a['date']): a for a in model['attendance']}
    assert len(attendance) == len(model['attendance'])
    for key, hours in days.items():
        assert key in attendance, key
        assert math.isclose(hours, attendance[key]['hours'], abs_tol=.001), (key, hours, attendance[key])
    for valve_id in valves:
        kinds = {r['kind'] for r in rows if r['valveId'] == valve_id}
        assert {'planting', 'harvest', 'sale', 'labor', 'service', 'diesel', 'fertilization', 'note'} <= kinds
    assert {r['paymentStatus'] for r in rows if r['kind'] == 'sale'} == {'Pendente', 'Recebido', 'Parcial'}
    expect(page.get_by_role('progressbar')).to_have_count(18)
    assert page.evaluate(f"localStorage.getItem('{PRODUCTION}')") == original
    print('PASS: six-month dataset, all 18 valves, coherent labor hours/payroll references and no production data changes')

    nav('Controle de Funcionários')
    page.get_by_role('tab', name='Colaboradores', exact=True).click()
    expect(page.locator('.v-employee')).to_have_count(9)
    expect(page.locator('.v-employee img').first).to_be_visible()
    assert page.locator('.v-employee img').first.evaluate('(img)=>img.complete && img.naturalWidth===240')
    card = page.locator('.v-employee').filter(has_text='Ana Exemplo')
    expect(card).to_contain_text('Apurado')
    expect(card).not_to_contain_text('R$ 0,00')
    page.get_by_role('button', name='Editar Ana Exemplo', exact=True).click()
    expect(dlg().get_by_label('Salário Mensal de Referência (R$)', exact=True)).to_have_value('3960')
    dlg().get_by_label('Telefone', exact=True).fill('(87) 00000-9999')
    dlg().get_by_role('button', name='Salvar Colaborador', exact=True).click()
    expect(dlg()).to_have_count(0)
    assert next(e for e in data()['vineyard']['employees'] if e['name'] == 'Ana Exemplo')['phone'] == '(87) 00000-9999'
    page.get_by_role('tab', name='Ausências e Atestados', exact=True).click()
    with page.expect_download() as pending:
        page.get_by_role('button', name='Baixar Documento', exact=True).click()
    download = pending.value
    assert Path(download.path()).read_bytes().startswith(b'%PDF-1.4')
    page.get_by_role('tab', name='Pagamentos', exact=True).click()
    assert page.locator('tbody tr').count() > 100
    print('PASS: editable employee profile, illustrative photo, actual downloadable synthetic PDF and filled payments')

    for name in ['Plantio', 'Colheita', 'Insumos e Estoque', 'Serviços e Custos', 'Vendas', 'Agroturismo', 'Relatórios', 'Financeiro', 'Agenda Agrícola']:
        nav(name)
        assert page.locator('tbody tr').count() > 0 or name == 'Agenda Agrícola', name
        if name == 'Plantio': expect(page.locator('.v-calendar-weather-status')).to_contain_text('Clima Simulado')
    nav('Visão Geral')
    cash_before = float(page.locator('[data-dashboard-widget=cash] strong').inner_text().replace('R$', '').replace('.', '').replace(',', '.').strip())
    nav('Vendas')
    sale = next(r for r in data()['vineyard']['entries'] if r['id'] == 'demo-recent-sale-0')
    page.get_by_role('button', name=f"Editar venda {sale['id']}", exact=True).click()
    dlg().get_by_label('Situação do Recebimento', exact=True).select_option('Recebido')
    dlg().get_by_label('Data do Recebimento', exact=True).fill(d['demo']['anchor'])
    dlg().get_by_role('button', name='Salvar Registro', exact=True).click()
    expect(dlg()).to_have_count(0)
    nav('Visão Geral')
    cash_after = float(page.locator('[data-dashboard-widget=cash] strong').inner_text().replace('R$', '').replace('.', '').replace(',', '.').strip())
    assert math.isclose(cash_after - cash_before, round(sale['kilograms'] * sale['unitPrice'] * .985, 2), abs_tol=.01)
    page.reload(wait_until='networkidle')
    assert next(r for r in data()['vineyard']['entries'] if r['id'] == sale['id'])['paymentStatus'] == 'Recebido'
    assert next(e for e in data()['vineyard']['employees'] if e['name'] == 'Ana Exemplo')['phone'] == '(87) 00000-9999'
    assert page.evaluate(f"localStorage.getItem('{PRODUCTION}')") == original
    print('PASS: filled operational pages, sale receipt editing and test changes persist after reload')

    page.get_by_role('button', name='Restaurar Dados de Exemplo', exact=True).click()
    dlg().get_by_role('button', name='Continuar Testando', exact=True).click()
    assert next(r for r in data()['vineyard']['entries'] if r['id'] == sale['id'])['paymentStatus'] == 'Recebido'
    page.get_by_role('button', name='Restaurar Dados de Exemplo', exact=True).click()
    with page.expect_navigation(wait_until='networkidle'):
        dlg().get_by_role('button', name='Restaurar Demonstração', exact=True).click()
    expect(page.get_by_role('heading', level=1)).to_contain_text('Fazenda Vitória · Demo')
    page.wait_for_load_state('networkidle')
    assert next(r for r in data()['vineyard']['entries'] if r['id'] == sale['id'])['paymentStatus'] == 'Pendente'
    assert next(e for e in data()['vineyard']['employees'] if e['name'] == 'Ana Exemplo')['phone'] == '(87) 00000-0001'
    assert page.evaluate(f"localStorage.getItem('{PRODUCTION}')") == original
    sentinel = page.evaluate("""async () => new Promise((resolve,reject)=>{
      const r=indexedDB.open('vr-control-documents',1);r.onerror=reject;r.onsuccess=()=>{
        const db=r.result;const q=db.transaction('documents').objectStore('documents').get('production-sentinel');
        q.onsuccess=async()=>{const text=await q.result.blob.text();db.close();resolve(text)};q.onerror=reject;
      };
    })""")
    assert sentinel == 'production-document'
    print('PASS: restore confirmation resets only demo records and preserves production records and attachments')
    page.set_viewport_size({'width': 390, 'height': 844})
    for name in ['Visão Geral', 'Plantio', 'Colheita', 'Controle de Funcionários', 'Agroturismo', 'Relatórios', 'Financeiro']:
        nav(name)
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), name
    page.goto(URL, wait_until='networkidle')
    expect(page.get_by_role('heading', level=1)).to_contain_text('Fazenda Principal Preservada')
    assert not page.locator('.demo-banner').count()
    assert not errors, errors
    # The independent HTML remains self-contained after adding multipage output.
    page.goto(URL + 'VR-Control.html', wait_until='networkidle')
    expect(page.get_by_role('heading', level=1)).to_be_visible()
    assert not page.locator('script[src],link[rel=stylesheet]').count()
    assert not errors, errors
    print('PASS: mobile populated pages, return to production, standalone HTML and no JavaScript errors')
    context.close(); browser.close()
    print('All demo checks passed.')

"""Functional browser checks. Run against a running app with: python tests/smoke.py.

Requires Python Playwright and Chromium. Set BASE_URL or CHROMIUM_PATH as needed.
Each run uses an isolated browser context and never changes a user's stored data.
"""
import csv
import io
import json
import os
from playwright.sync_api import sync_playwright, expect


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(
        executable_path=os.environ.get('CHROMIUM_PATH', '/usr/bin/chromium'),
        headless=True,
        args=['--no-sandbox'],
    )
    context = browser.new_context(viewport={'width': 1440, 'height': 1100}, locale='pt-BR', timezone_id='Europe/Madrid')
    context.route('https://api.open-meteo.com/**', lambda route: route.abort())
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(os.environ.get('BASE_URL', 'http://127.0.0.1:5173'), wait_until='networkidle')

    def navigate(name):
        if page.viewport_size['width'] <= 820:
            page.get_by_role('button', name='Abrir menu', exact=True).click()
        page.locator('aside').get_by_role('button', name=name, exact=True).click()

    def data():
        return page.evaluate("JSON.parse(localStorage.getItem('vr-control-v1'))")

    def new_record(kind):
        page.get_by_role('button', name='Novo lançamento', exact=True).click()
        page.get_by_role('combobox', name='Área de Gestão', exact=True).select_option(kind)
        return page.get_by_role('dialog')

    def save(dialog):
        dialog.get_by_role('button', name='Salvar lançamento').click()
        expect(page.get_by_role('dialog')).to_have_count(0)

    expect(page.get_by_role('heading', name='Áreas de Gestão')).to_be_visible()
    expect(page.locator('.balance strong')).to_contain_text('0,00')
    assert page.locator('.powered-by img').evaluate('(img) => img.complete && img.naturalWidth === 1536')
    print('PASS: dashboard, original logo, calculated financial balance')

    dialog = new_record('transactions')
    dialog.get_by_label('Descrição', exact=True).fill('Receita teste')
    dialog.get_by_label('Valor (R$)', exact=True).fill('1000.50')
    save(dialog)
    expect(page.locator('.balance strong')).to_contain_text('1.000,50')
    page.reload(wait_until='networkidle')
    expect(page.locator('.balance strong')).to_contain_text('1.000,50')
    assert any(row['name'] == 'Receita teste' for row in data()['transactions'])
    dialog = new_record('transactions')
    dialog.get_by_label('Descrição', exact=True).fill('Receita pendente teste')
    dialog.get_by_label('Valor (R$)', exact=True).fill('5000')
    dialog.get_by_label('Status', exact=True).select_option('Pendente')
    save(dialog)
    expect(page.locator('.balance strong')).to_contain_text('1.000,50')
    print('PASS: transaction creation, exact totals, reload persistence, pending excluded')

    dialog = new_record('inventory')
    dialog.get_by_label('Nome do insumo').fill('Insumo teste')
    dialog.get_by_label('Quantidade', exact=True).fill('5')
    dialog.get_by_label('Estoque mínimo').fill('10')
    dialog.get_by_label('Preço unitário (R$)').fill('20')
    save(dialog)
    navigate('Insumos e Estoque')
    page.get_by_role('combobox', name='Filtrar registros').select_option('Em alerta')
    expect(page.locator('tbody tr')).to_have_count(1)
    page.get_by_role('textbox', name='Buscar registros', exact=True).fill('Insumo teste')
    expect(page.locator('tbody tr')).to_have_count(1)
    expect(page.locator('.data-panel tbody')).to_contain_text('Estoque baixo')
    with page.expect_download() as download_info:
        page.get_by_role('button', name='Exportar CSV').click()
    download = download_info.value
    with open(download.path(), encoding='utf-8-sig') as handle:
        rows = list(csv.DictReader(io.StringIO(handle.read()), delimiter=';'))
    assert len(rows) == 1 and rows[0]['name'] == 'Insumo teste'
    print('PASS: inventory registration, low-stock calculation, search/filter, filtered CSV')

    dialog = new_record('harvest')
    dialog.get_by_label('Nome do talhão').fill('Talhão teste')
    dialog.get_by_label('Cultura', exact=True).fill('Soja')
    dialog.get_by_label('Área (ha)').fill('10')
    dialog.get_by_label('Produção (t)').fill('25')
    dialog.get_by_label('Status', exact=True).select_option('Concluída')
    save(dialog)
    navigate('Colheita')
    page.get_by_role('button', name='Registros Anteriores', exact=True).click()
    expect(page.locator('.kpi').first).to_contain_text('25 t')
    print('PASS: harvest creation and aggregate production')

    dialog = new_record('tasks')
    dialog.get_by_label('Nome da atividade').fill('Atividade teste')
    dialog.get_by_label('Talhão', exact=True).fill('Talhão teste')
    dialog.get_by_label('Cultura', exact=True).fill('Soja')
    save(dialog)
    navigate('Agenda Agrícola')
    expect(page.locator('.calendar-event').filter(has_text='Atividade teste')).to_be_visible()
    month = page.locator('.calendar-toolbar > strong').inner_text()
    page.get_by_role('button', name='Próximo mês', exact=True).click()
    assert page.locator('.calendar-toolbar > strong').inner_text() != month
    page.get_by_role('button', name='Hoje', exact=True).click()
    assert page.locator('.calendar-toolbar > strong').inner_text() == month
    page.get_by_role('button', name='Concluir Atividade teste', exact=True).click()
    assert next(t for t in data()['tasks'] if t['name'] == 'Atividade teste')['status'] == 'Concluída'
    page.get_by_role('button', name='Excluir Atividade teste', exact=True).click()
    page.get_by_role('button', name='Cancelar', exact=True).click()
    assert any(t['name'] == 'Atividade teste' for t in data()['tasks'])
    page.get_by_role('button', name='Excluir Atividade teste', exact=True).click()
    page.get_by_role('button', name='Excluir registro', exact=True).click()
    assert not any(t['name'] == 'Atividade teste' for t in data()['tasks'])
    print('PASS: agenda creation, calendar navigation, completion, cancellation and deletion')

    navigate('Configurações')
    page.get_by_label('Nome da fazenda', exact=True).fill('Fazenda de teste')
    page.get_by_role('button', name='Salvar configurações').click()
    page.reload(wait_until='networkidle')
    expect(page.locator('.weather strong')).to_have_text('Fazenda de teste')
    page.get_by_role('textbox', name='Buscar em toda a fazenda').fill('receita teste')
    expect(page.get_by_role('heading', name='Resultados da Busca')).to_be_visible()
    expect(page.get_by_role('button', name='Receita teste', exact=False)).to_be_visible()
    page.get_by_role('button', name='Limpar busca', exact=True).click()
    navigate('Relatórios')
    expect(page.get_by_role('heading', name='Relatórios por Lote e Válvula')).to_be_visible()
    expect(page.get_by_role('button', name='Exportar Backup', exact=True)).to_be_visible()
    print('PASS: settings persistence, global search and reports')

    navigate('Visão Geral')
    page.screenshot(path='/tmp/vr-control-desktop.png', full_page=True)
    page.set_viewport_size({'width': 390, 'height': 844})
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    page.screenshot(path='/tmp/vr-control-mobile.png', full_page=True, animations='disabled')
    for name in ['Colheita', 'Insumos e Estoque', 'Financeiro', 'Agenda Agrícola', 'Relatórios', 'Configurações', 'Central de Ajuda', 'Visão Geral']:
        navigate(name)
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), name
    dialog = new_record('transactions')
    dialog.get_by_label('Descrição', exact=True).fill('   ')
    dialog.get_by_label('Valor (R$)', exact=True).fill('10')
    dialog.get_by_role('button', name='Salvar lançamento').click()
    expect(dialog.get_by_role('alert')).to_be_visible()
    page.keyboard.press('Escape')
    expect(page.get_by_role('dialog')).to_have_count(0)
    assert not errors, errors
    print('PASS: mobile navigation, no page overflow, validation, Escape, no JavaScript errors')
    context.close()
    browser.close()
    print('All functional checks passed.')

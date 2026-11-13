import asyncio,contextlib,re,json,os
from pathlib import Path
from playwright.async_api import async_playwright
async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(headless=True)
  context=await browser.new_context(viewport={'width':1280,'height':1800})
  async def to_draft_db(route):
   try:
    if not route.request.frame.url.startswith('http://localhost:8080/'):return await route.abort()
    url='http://127.0.0.1:8001'+route.request.url.split('/_port_8001',1)[1]
    if '/functions/' in url:return await route.fulfill(status=503,content_type='application/json',body='{"error":"external side effects blocked in S01 test"}')
    await route.fulfill(response=await route.fetch(url=url,max_redirects=0,timeout=0))
   except Exception:
    with contextlib.suppress(Exception):await route.abort()
  await context.route(re.compile(r'^https?://[^/]+/_port_8001/'),to_draft_db)
  await context.add_init_script(r'''(() => { if (location.origin !== "http://localhost:8080") return; const W=WebSocket; WebSocket=new Proxy(W,{construct(t,a){a[0]=String(a[0]).replace(/^wss?:[/][/][^/]+[/]_port_8001(?=[/])/,"ws://127.0.0.1:8001");return Reflect.construct(t,a);}});})();''')
  # Block all non-local egress, including real email/tracking/auth.
  async def external(route):
   if '/_port_8001/' in route.request.url:return await route.fallback()
   if route.request.url.startswith(('http://localhost:8080/','http://127.0.0.1:8001/')):return await route.fallback()
   await route.abort()
  await context.route('**/*',external)
  page=await context.new_page();await page.goto('http://localhost:8080/auth');await page.wait_for_timeout(1800)
  await page.get_by_role('button',name='Criar conta',exact=True).click()
  await page.get_by_role('button',name='Tem um código promocional?').click()
  await page.get_by_label('Código promocional').fill('FICTS01')
  await page.wait_for_timeout(1500)
  await page.get_by_text('Os códigos promocionais estão temporariamente indisponíveis.',exact=False).wait_for()
  print('PROMO ORIGINAL:',(await page.locator('body').inner_text())[:1200])
  await page.screenshot(path='/tmp/browser/s01/promo-fixed.png')
  await page.get_by_label('Nome completo',exact=True).fill('Fict Signup Promo')
  await page.get_by_label('Email',exact=True).fill('fict-signup-verification-s01@example.invalid')
  secret=os.environ.get('S01_TEST_PASSWORD') or __import__('secrets').token_urlsafe(20)
  await page.get_by_label('Password',exact=True).fill(secret)
  await page.get_by_label('Confirmar password',exact=True).fill(secret)
  await page.get_by_role('button',name='Criar conta',exact=True).click()
  await page.wait_for_timeout(4000)
  assert page.url.endswith('/onboarding')
  await page.get_by_text('O código promocional não foi aplicado.',exact=False).wait_for()
  print('SIGNUP',page.url,(await page.locator('body').inner_text())[:1800])
  await page.screenshot(path='/tmp/browser/s01/signup-fixed.png')
  await browser.close()
asyncio.run(main())

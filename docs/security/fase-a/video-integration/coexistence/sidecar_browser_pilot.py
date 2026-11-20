"""Private SQL + actual candidate handlers + candidate UI; providers/identity fictitious."""
import asyncio,json,subprocess,shutil
from pathlib import Path
from playwright.async_api import async_playwright
here=Path(__file__).resolve().parent
def pilot(socket,pg,env,sql):
    video=Path('/tmp/browser/release-window/fixture.mp4')
    if not video.exists():raise RuntimeError('Explicit offline MP4 fixture required')
    media=video.read_bytes();bun=shutil.which('bun')
    if not bun:raise RuntimeError('Bun required')
    op='77777777-7777-4777-8777-777777777777'
    def request(body,member=False,upload=False):
        result=subprocess.run([bun,here/'pilot-rpc.ts',socket],input=json.dumps({'psql':str(pg/'psql'),'body':body,'member':member,'upload':upload,'bytes':len(media)}),text=True,capture_output=True,env=env,check=True)
        return json.loads(result.stdout)
    sql('UPDATE workspace_storage SET storage_limit_bytes=1000000;')
    issued=request({'action':'issue','operationId':op,'workspaceId':'11111111-1111-4111-8111-111111111111','projectId':'22222222-2222-4222-8222-222222222222','taskId':'55555555-5555-4555-8555-555555555555','fileName':'Piloto canónico.mp4','bytes':len(media),'type':'video/mp4'},True,True)
    assert issued['status']==201,issued
    processed=request({'action':'process','operationId':op},True,True);assert processed['status']==200,processed
    assert request({'action':'process','operationId':op},True,True)['status']==200
    link=request({'action':'link','workspaceId':'11111111-1111-4111-8111-111111111111','projectId':'22222222-2222-4222-8222-222222222222','taskId':'55555555-5555-4555-8555-555555555555'},True)
    assert link['status']==201,link
    token=link['body']['token'] # Fictitious, disposable capability only. Never print it.
    async def browser_check():
        shots=Path('/tmp/browser/sidecar-pilot');shots.mkdir(parents=True,exist_ok=True)
        async with async_playwright() as p:
            browser=await p.chromium.launch(headless=True)
            for mobile in (False,True):
                context=await browser.new_context(**({'viewport':{'width':390,'height':844}} if mobile else {}))
                page=await context.new_page();errors=[]
                page.on('pageerror',lambda e:errors.append(str(e)))
                async def route(r):
                    url=r.request.url
                    if not url.startswith('http://localhost:8080/'):
                        await r.abort();return
                    if url.endswith('/__sidecar_api'):
                        result=request(r.request.post_data_json)
                        await r.fulfill(status=result['status'],content_type='application/json',body=json.dumps(result['body']));return
                    if url.endswith('/__sidecar_fixture.mp4'):
                        await r.fulfill(content_type='video/mp4',body=media);return
                    if url.endswith('/__sidecar_pilot'):
                        html='''<html><head><title>WillFlow — ensaio privado</title><link rel="stylesheet" href="/src/index.css"></head><body><div id="root"></div>
                        <script type="module">import R from '/@react-refresh';R.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;</script>
                        <script type="module">import React from '/node_modules/.vite/deps/react.js';import {createRoot} from '/node_modules/.vite/deps/react-dom_client.js';
                        import {PrivateVideoApproval} from '/docs/security/fase-a/video-integration/coexistence/PrivateVideoApproval.tsx';
                        const request=async b=>{const r=await fetch('/__sidecar_api',{method:'POST',body:JSON.stringify(b)});if(!r.ok)throw Error('unavailable');return r.json();};
                        createRoot(document.getElementById('root')).render(React.createElement(PrivateVideoApproval,{request,token:TOKEN}));</script></body></html>'''.replace('TOKEN',json.dumps(token))
                        await r.fulfill(content_type='text/html',body=html);return
                    await r.continue_()
                await page.route('**/*',route)
                await page.goto('http://localhost:8080/__sidecar_pilot',wait_until='domcontentloaded')
                await page.get_by_label('Vídeo',exact=True).select_option(issued['body']['versionId'])
                await page.get_by_label('Vídeo para aprovação').wait_for()
                await page.wait_for_function('document.querySelector("video").readyState >= 2')
                await page.locator('video').evaluate('(v)=>v.play()')
                await page.wait_for_function('document.querySelector("video").currentTime > 0')
                await page.get_by_label('Nome',exact=True).fill('Cliente fictício')
                await page.get_by_label('Comentário',exact=True).fill('Corte canónico '+('mobile' if mobile else 'desktop'))
                await page.get_by_role('button',name='Enviar',exact=True).click()
                await page.get_by_text('Corte canónico '+('mobile' if mobile else 'desktop'),exact=True).wait_for()
                if not mobile:await page.get_by_role('button',name='Aprovar vídeo').click()
                await page.get_by_role('status').filter(has_text='Aprovado por Cliente fictício').wait_for()
                assert await page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
                await page.screenshot(path=str(shots/('mobile.png' if mobile else 'desktop.png')))
                assert not errors,errors
                await context.close()
            revoked=request({'action':'revoke','token':token},True);assert revoked['status']==200
            denied=request({'action':'read','token':token,'versionId':issued['body']['versionId']});assert denied['status']==403
            await browser.close()
    asyncio.run(browser_check())
    assert sql("SELECT count(*) FROM video_versions WHERE id='"+issued['body']['versionId']+"'")=='0'
    assert sql("SELECT count(*) FROM willflow_video_private.comments WHERE version_id='"+issued['body']['versionId']+"'")=='2'
    assert sql("SELECT count(*) FROM willflow_video_private.approvals WHERE version_id='"+issued['body']['versionId']+"'")=='1'
    print('PASS browser desktop/mobile: canonical upload/read, playback, two comments, approval readback, explicit revoke; legacy projection empty, zero console errors')
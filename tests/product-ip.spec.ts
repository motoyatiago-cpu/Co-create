import {test,expect} from '@playwright/test';
import {mkdirSync} from 'node:fs';

test('封面按需加载、picture切换、六种宽度真实截图与短屏完整铺满',async({page},info)=>{
  const images:string[]=[];
  page.on('request',r=>{if(r.url().includes('/products/ip/'))images.push(r.url());});
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');
  await expect(page.locator('#home-heading')).toBeVisible();expect(images).toHaveLength(0);
  await page.getByRole('navigation').getByRole('link',{name:'产品展厅',exact:true}).click();
  for(const image of await page.locator('.product-card__visual img').all())await expect(image).toHaveJSProperty('complete',true);
  expect(images).toHaveLength(2);
  const folder=`evidence/product-ip/${info.project.name}`;mkdirSync(folder,{recursive:true});
  for(const width of [320,375,390,768,1024,1440,420,421]){
    await page.setViewportSize({width,height:1000});
    for(const image of await page.locator('.product-card__visual img').all()){
      await expect.poll(()=>image.evaluate(n=>(n as HTMLImageElement).currentSrc)).toContain(width<=420?'-mobile.webp':'-desktop.webp');
      await image.evaluate(n=>(n as HTMLImageElement).decode());
      const rect=await image.evaluate(n=>{const a=n.getBoundingClientRect(),b=n.closest('.product-card__visual')!.getBoundingClientRect();return {w:a.width,h:a.height,cw:b.width,ch:b.height,fit:getComputedStyle(n).objectFit,nw:(n as HTMLImageElement).naturalWidth};});
      expect(rect.fit).toBe('cover');expect(rect.nw).toBe(width<=420?1152:1590);
      expect(Math.abs(rect.w-rect.cw)).toBeLessThanOrEqual(2);expect(Math.abs(rect.h-rect.ch)).toBeLessThanOrEqual(2);
    }
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    if([320,375,390,768,1024,1440].includes(width)){
      await page.screenshot({path:`${folder}/page-${width}.png`,fullPage:true,animations:'disabled'});
      for(let i=0;i<2;i++)await page.locator('.product-card').nth(i).screenshot({path:`${folder}/${i?'B':'A'}-${width}.png`,animations:'disabled'});
    }
  }
  await page.setViewportSize({width:1440,height:800});
  await expect(page.locator('.product-card__visual').first()).toHaveCSS('height','160px');
  await page.screenshot({path:`${folder}/short-desktop.png`,fullPage:true,animations:'disabled'});
  await expect(page.getByRole('link',{name:/打开回音结完整体验/})).toHaveAttribute('href','./experiences/echo-knot/index.html');
  await expect(page.getByRole('link',{name:/打开把感受剪成片完整体验/})).toHaveAttribute('href','./experiences/feeling-film/index.html');
});

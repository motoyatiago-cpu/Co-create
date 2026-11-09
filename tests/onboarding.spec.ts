import {test,expect} from '@playwright/test';
import {mkdirSync} from 'node:fs';
test('回音结目的入口、本地可用、引导关闭与重新查看、五种宽度',async({page},info)=>{
 await page.goto('/experiences/echo-knot/index.html');
 await page.getByRole('link',{name:'找个人聊聊',exact:true}).click();
 const guide=page.locator('[data-guide="modes"]');await expect(guide).toBeVisible();await expect(guide).toContainText('不调用云端模型');
 await guide.getByRole('button',{name:'收起引导'}).click();await expect(guide).not.toHaveAttribute('open','');
 await guide.locator('summary').click();await expect(guide).toHaveAttribute('open','');
 await page.locator('.chat-input').fill('你好');await page.getByRole('button',{name:'说给对方听',exact:true}).click();
 await expect(page.locator('.chat-messages')).toContainText('你好');
 const dir=`evidence/onboarding/${info.project.name}`;mkdirSync(dir,{recursive:true});
 for(const width of [320,390,768,1024,1440]){await page.setViewportSize({width,height:1000});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await page.screenshot({path:`${dir}/echo-${width}.png`,fullPage:true});}
});
test('解结结果下一步保留原保存与回复操作',async({page})=>{
 await page.goto('/experiences/echo-knot/index.html');await page.getByRole('link',{name:'读懂一句话',exact:true}).click();
 await page.getByRole('button',{name:'朋友',exact:true}).click();await page.getByRole('button',{name:'委屈',exact:true}).click();
 await page.locator('.message-area').fill('我没事，你忙吧。');await page.getByRole('button',{name:'听见这句话',exact:true}).click();
 await expect(page.locator('[data-guide="result"]')).toBeVisible();
 await expect(page.locator('[data-purpose]')).toHaveCount(0);
 await page.evaluate(()=>{Object.defineProperty(navigator.clipboard,'writeText',{value:async(text:string)=>{(window as any).__copied=text;},configurable:true});});
 await page.locator('.reply-copy').first().click();expect(await page.evaluate(()=>(window as any).__copied.length)).toBeGreaterThan(0);
 await page.getByRole('button',{name:'收进回音簿',exact:true}).click();
 expect(await page.evaluate(()=>(window as any).HuiYinJie.读取回音簿().count)).toBe(1);
 await expect(page.locator('.result-actions button')).not.toHaveCount(0);
 await page.locator('[data-guide="result"]').getByRole('link',{name:'了解自己的反应',exact:true}).click();await expect(page.locator('.option-row')).toHaveCount(3);
});
test('剪片示例至四步完成、可选配置可展开、播放和导出、五种宽度',async({page},info)=>{
 test.setTimeout(60000);await page.goto('/experiences/feeling-film/index.html');
 await expect(page.locator('#home-flow-title')).toContainText('四步');await expect(page.locator('.flow>li')).toHaveCount(4);
 await page.getByRole('button',{name:'使用示例体验',exact:true}).click();await expect(page.locator('#sentence-input')).not.toHaveValue('');
 await page.locator('[data-next-step]').click();
 await expect(page.locator('#upload-input')).toBeHidden();await expect(page.locator('.film-settings')).not.toHaveAttribute('open','');
 await page.locator('.film-settings summary').click();await expect(page.locator('.music-drop')).toBeVisible();await page.locator('.film-settings summary').click();
 await page.getByRole('button',{name:'去回答两道问题',exact:true}).click();
 await page.locator('[data-answer="first"]').first().click();await page.locator('[data-answer="second"]').first().click();await page.locator('#make-film').click();
 await expect(page.locator('.done-actions>[data-play-film]')).toBeVisible({timeout:25000});
 await expect(page.locator('[data-save-film]')).toBeHidden();await page.locator('.done-actions summary').click();await expect(page.locator('[data-save-film]')).toBeVisible();
 await page.getByRole('button',{name:'放一遍',exact:true}).click();await expect(page.locator('[data-theater-save]')).toBeVisible();await page.keyboard.press('Escape');
 const dir=`evidence/onboarding/${info.project.name}`;mkdirSync(dir,{recursive:true});
 for(const width of [320,390,768,1024,1440]){await page.setViewportSize({width,height:1000});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await page.screenshot({path:`${dir}/film-${width}.png`,fullPage:true});}
});

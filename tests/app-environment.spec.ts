import {expect,test} from '@playwright/test';
import type {Application} from '../src/app/index.js';

interface Session {isOpen():boolean;close():void;destroy():void;fail(message:string):void}
interface Fixture {app:Application;events:string[];old?:Session;nested?:Session}
declare global {interface Window {appEnvironmentFixture:Fixture}}

test.beforeEach(async ({page})=>{await page.goto('/tests/fixture.html');});

for(const kind of ['fixed','feature'] as const) test(`a nested ${kind} opening wins over the superseded outer replacement`,async ({page})=>{
  const result=await page.evaluate(async kind=>{
    const entry='/src/app/index.ts';const {createApplication}=await import(entry);
    const app:Application=createApplication(document.body),events:string[]=[];
    const open=(label:string,onClose:()=>void):Session=>kind==='fixed'
      ?app.settings.openSettings({baseUrl:`https://${label}.example/v1`,hasApiKey:true},{onClose})
      :app.workspace.openHistory({nodes:[{id:label,role:'assistant',text:`${label} branch`,active:true}]},{onClose});
    let nested:Session|undefined;
    const old=open('old',()=>{events.push('old');nested=open('nested',()=>events.push('nested'));});
    const outer=open('outer',()=>events.push('outer'));
    outer.fail('Superseded outer failure');outer.close();outer.destroy();old.close();old.destroy();
    const before={oldOpen:old.isOpen(),outerOpen:outer.isOpen(),nestedOpen:nested!.isOpen(),events:[...events],openDialogs:document.querySelectorAll('dialog[open]').length,
      current:kind==='fixed'?document.querySelector<HTMLInputElement>('dialog[open] input[type="url"]')?.value:document.querySelector('dialog[open] .pui-branch-node p')?.textContent,
      staleError:document.body.textContent!.includes('Superseded outer failure')};
    nested!.close();nested!.destroy();app.destroy();
    return {before,after:{events,openDialogs:document.querySelectorAll('dialog[open]').length}};
  },kind);
  expect(result.before).toEqual({oldOpen:false,outerOpen:false,nestedOpen:true,events:['old','outer'],openDialogs:1,current:kind==='fixed'?'https://nested.example/v1':'nested branch',staleError:false});
  expect(result.after).toEqual({events:['old','outer','nested'],openDialogs:0});
});

test('a feature dialog close callback can open a complete new owned dialog',async ({page})=>{
  await page.evaluate(async()=>{
    const entry='/src/app/index.ts';const {createApplication}=await import(entry);
    const fixture:Fixture={app:createApplication(document.body),events:[]};window.appEnvironmentFixture=fixture;
    fixture.old=fixture.app.workspace.openHistory({nodes:[]},{onClose(){fixture.events.push('old');fixture.nested=fixture.app.workspace.openHistory({nodes:[{id:'nested',role:'assistant',text:'Nested branch after dismissal',active:true}]},{onClose(){fixture.events.push('nested');}});}});
  });
  await page.getByRole('button',{name:'Close conversation branches',exact:true}).click();
  await expect(page.getByText('Nested branch after dismissal',{exact:true})).toBeVisible();
  const result=await page.evaluate(()=>{
    const fixture=window.appEnvironmentFixture;
    const before={oldOpen:fixture.old!.isOpen(),nestedOpen:fixture.nested!.isOpen(),events:[...fixture.events]};
    fixture.old!.close();fixture.old!.destroy();fixture.nested!.close();fixture.nested!.destroy();fixture.app.destroy();
    return {before,after:{events:fixture.events,openDialogs:document.querySelectorAll('dialog[open]').length}};
  });
  expect(result).toEqual({before:{oldOpen:false,nestedOpen:true,events:['old']},after:{events:['old','nested'],openDialogs:0}});
});

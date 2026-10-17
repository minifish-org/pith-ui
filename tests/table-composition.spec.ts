import {expect,test} from '@playwright/test';

test('table preserves native columns, keyed cell focus and nested detail state',async({page})=>{
  await page.goto('/tests/fixture.html');
  await page.evaluate(async()=>{
    const ui=await import('../src/index.js');
    const input=ui.createTextInput({label:'Request note',value:'Original'});
    const details=ui.createDisclosure({title:'Price source',content:ui.createText({text:'Saved price'})});
    const first={key:'first',cells:[input,ui.createText({text:'1,234'})]};
    const second={key:'second',cells:[details,ui.createText({text:'321'})]};
    const table=ui.createTable({label:'Usage',columns:[{key:'request',label:'Request'},{key:'input',label:'Input'}],rows:[first,second],empty:'No recorded requests yet.'});
    (window as any).tableFixture={table,first,second,input,details,mounted:ui.mount(document.body,table)};
  });
  const table=page.getByRole('table',{name:'Usage',exact:true});
  await expect(table.getByRole('columnheader')).toHaveText(['Request','Input']);
  await expect(table.getByRole('row')).toHaveCount(3);
  expect(await table.evaluate(node=>{const heading=getComputedStyle(node.querySelector('th')!),cell=getComputedStyle(node.querySelector('td')!),wrapper=getComputedStyle(node.parentElement!);return{fontSize:heading.fontSize,lineHeight:heading.lineHeight,fontWeight:heading.fontWeight,padding:heading.padding,textAlign:heading.textAlign,verticalAlign:cell.verticalAlign,minWidth:cell.minWidth,overflow:wrapper.overflowX,border:wrapper.borderTopWidth};})).toEqual({fontSize:'14px',lineHeight:'21px',fontWeight:'600',padding:'12px 8px',textAlign:'left',verticalAlign:'top',minWidth:'220px',overflow:'auto',border:'0px'});
  await page.locator('summary').filter({hasText:'Price source'}).click();
  const note=page.getByRole('textbox',{name:'Request note',exact:true});
  await note.fill('Retained note');
  await page.evaluate(()=>{const f=(window as any).tableFixture;f.table.update({rows:[f.second,f.first]});});
  await expect(note).toBeFocused();
  await expect(note).toHaveValue('Retained note');
  await expect(page.getByText('Saved price',{exact:true})).toBeVisible();
  await expect(table.getByRole('row').nth(1)).toContainText('Price source');
  await page.evaluate(()=>{const f=(window as any).tableFixture;f.table.update({rows:[]});});
  await expect(table.getByRole('cell')).toHaveCount(1);
  await expect(table.getByRole('cell')).toHaveAttribute('colspan','2');
  await expect(table.getByRole('cell')).toHaveText('No recorded requests yet.');
  await page.evaluate(()=>{const f=(window as any).tableFixture;f.mounted.destroy();});
  await expect(page.getByRole('table')).toHaveCount(0);
});

test('table rejects unbounded options, malformed keys and shared cell ownership',async({page})=>{
  await page.goto('/tests/fixture.html');
  const failures=await page.evaluate(async()=>{
    const ui=await import('../src/index.js');
    if(typeof ui.createTable!=='function')throw new Error('The table API is missing.');
    const failures:string[]=[];
    const attempt=(label:string,run:()=>unknown)=>{try{run();}catch{failures.push(label);}};
    const columns=[{key:'request',label:'Request'},{key:'count',label:'Count'}];
    attempt('arbitrary CSS',()=>ui.createTable({...{label:'Usage',columns,rows:[]},style:'color:red'} as any));
    attempt('column width',()=>ui.createTable({label:'Usage',columns:[{key:'request',label:'Request',width:220} as any],rows:[]}));
    attempt('duplicate column key',()=>ui.createTable({label:'Usage',columns:[columns[0],columns[0]],rows:[]}));
    attempt('missing cell',()=>ui.createTable({label:'Usage',columns,rows:[{key:'first',cells:[ui.createText({text:'one'})]}]}));
    attempt('duplicate row key',()=>ui.createTable({label:'Usage',columns,rows:[{key:'same',cells:[ui.createText({text:'one'}),ui.createText({text:'1'})]},{key:'same',cells:[ui.createText({text:'two'}),ui.createText({text:'2'})]}]}));
    const shared=ui.createText({text:'shared'});
    attempt('shared cell',()=>ui.createTable({label:'Usage',columns,rows:[{key:'first',cells:[shared,shared]}]}));
    const owned=ui.createText({text:'Owned'});
    ui.createStack({children:[owned]});
    attempt('foreign ownership',()=>ui.createTable({label:'Usage',columns:[columns[0]],rows:[{key:'first',cells:[owned]}]}));
    return failures;
  });
  expect(failures).toEqual(['arbitrary CSS','column width','duplicate column key','missing cell','duplicate row key','shared cell','foreign ownership']);
});

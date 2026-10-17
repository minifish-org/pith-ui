import type {Page} from '@playwright/test';

// Independent literal0.3.1 templates and final CSS: tasks/approval.ts,
// files/systems.ts, styles.css:583–612/860–869. No Pith UI modules/classes.
// The browser's own system fonts must wrap the old and new text identically.
export async function measureSourceTaskPieces(page:Page) {
 return page.evaluate(()=>{
  const frame=document.createElement('iframe');
  frame.title='Independent original task notice measurement';
  frame.style.cssText=`position:fixed;left:-10000px;top:0;width:${innerWidth}px;height:${innerHeight}px;border:0;`;
  document.body.append(frame);
  try{
   const doc=frame.contentDocument!;
   doc.open();doc.write(`<!doctype html><html><head><style>
    :root{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;font-weight:400;line-height:1.5;font-synthesis:none;letter-spacing:normal}
    *{box-sizing:border-box}body{margin:0}strong{font-weight:600}code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace}button{font:inherit;border:0;cursor:pointer}svg{display:inline-block;flex-shrink:0;vertical-align:middle;width:19px;height:19px}
    [data-card]{width:810px;padding:16px;border:1px solid;border-radius:12px;margin-bottom:12px}
    [data-heading]{display:flex;align-items:center;gap:8px}[data-heading]>svg{width:21px;height:21px}
    [data-heading] strong{display:block;font-size:14px;font-weight:600;margin-bottom:4px}[data-heading] span:not([data-badge]){font-size:12px}
    [data-badge]{margin-left:auto;border:1px solid;border-radius:5px;padding:4px 8px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;max-width:35%;overflow:hidden;text-overflow:ellipsis}
    [data-file]{display:flex;align-items:baseline;gap:8px;margin:12px 0 8px;min-width:0;font-size:12px}
    [data-file] code{overflow-wrap:anywhere}[data-card] pre{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;line-height:1.5;padding:12px;border-radius:6px;max-height:160px;overflow:auto;white-space:pre-wrap;overflow-wrap:anywhere}
    [data-card] pre[data-diff]{max-height:min(260px,26vh);white-space:pre;overflow-wrap:normal;border:1px solid;padding:8px 0}
    [data-diff]>span{display:block;min-height:1.5em;padding:0 12px}
    [data-args]{margin-top:8px;font-size:12px}[data-scope]{font-size:12px;line-height:1.5;margin:8px 0 12px}
    [data-actions]{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap}
    [data-actions] button{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:40px;font-size:14px;line-height:1.5;font-weight:600;padding:8px 12px;border-radius:7px}
    [data-actions] button:not([data-primary]){border:1px solid}[data-actions] svg{width:14px;height:14px}
    [data-region]{position:fixed;z-index:20;right:24px;top:96px;width:min(360px,calc(100vw - 32px));max-height:calc(100dvh - 320px);overflow-y:auto;display:grid;gap:8px}
    [data-toast]{display:flex;align-items:flex-start;gap:12px;padding:16px;border:1px solid;border-radius:12px}
    [data-check]{width:23px;height:23px;display:grid;place-items:center;border-radius:50%;flex:0 0 23px}[data-check] svg{width:15px;height:15px}
    [data-body]{flex:1;min-width:0}[data-body] strong{font-size:14px}[data-body] p{font-size:12px;margin:8px 0;overflow-wrap:anywhere}
    [data-body] button{background:none;padding:0;font-size:12px;text-decoration:none}
    [data-dismiss]{width:22px;height:22px;flex:0 0 22px;padding:4px;border-radius:6px}
    @media(max-width:700px){[data-region]{right:16px;top:76px}}
   </style></head><body>
    <section data-card><div data-heading><svg></svg><div><strong>Pith needs your permission</strong><span>Review this action before it runs.</span></div><span data-badge>edit_file</span></div><div data-file><strong>Modify file</strong><code>README.md</code></div><div><pre data-diff><span>--- a/README.md</span><span>+++ b/README.md</span><span>-Old layout</span><span>+Preserved layout</span></pre></div><details data-args><summary>Tool arguments</summary><div></div></details><p data-scope>Workspace permission applies to this conversation. Commands and external connection tools still need approval.</p><div data-actions><button>Deny</button><button>Always allow workspace changes</button><button data-primary><svg></svg>Allow this action</button></div></section>
    <section data-region><div data-toast><span data-check><svg></svg></span><div data-body><strong>Task completed</strong><p>Review workspace · Conversation b</p><button>Open conversation</button></div><button data-dismiss><svg></svg></button></div></section>
   </body></html>`);doc.close();
   if(doc.querySelector('[class]'))throw new Error('The source oracle must not use Pith UI classes');
   const height=(selector:string)=>doc.querySelector(selector)!.getBoundingClientRect().height;
   return{card:height('[data-card]'),heading:height('[data-heading]'),toast:height('[data-toast]')};
  }finally{frame.remove();}
 });
}

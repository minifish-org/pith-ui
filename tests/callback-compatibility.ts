import type {ConversationViewOptions, FilePreviewOptions, PagedPreviewOptions} from '../src/internal-components.js';

// Compile-only regressions: a void callback deliberately permits a caller to
// return an incidental value. Adding async support must not narrow that contract.
const copied: string[] = [];
const conversation = {onCopyCode: text => copied.push(text)} satisfies ConversationViewOptions;
const paged = {text:'',kind:'markdown',onCopyCode: text => copied.push(text)} satisfies PagedPreviewOptions;
const file = {onCopyCode: text => copied.push(text)} satisfies FilePreviewOptions;

type Same<Left,Right> = (<Value>() => Value extends Left ? 1 : 2) extends (<Value>() => Value extends Right ? 1 : 2) ? true : false;

// Async callbacks keep contextual string/button types without annotations or
// casts, including the actual button used by host-owned copy feedback.
const asyncConversation = {onCopyCode: async (text,button) => {
  const parameters: [Same<typeof text,string>,Same<typeof button,HTMLButtonElement>] = [true,true];
  await Promise.resolve();
  void parameters;
}} satisfies ConversationViewOptions;
const asyncPaged = {text:'',kind:'markdown',onCopyCode: async (text,button) => {
  const parameters: [Same<typeof text,string>,Same<typeof button,HTMLButtonElement>] = [true,true];
  await Promise.resolve();
  void parameters;
}} satisfies PagedPreviewOptions;
const asyncFile = {onCopyCode: async (text,button) => {
  const parameters: [Same<typeof text,string>,Same<typeof button,HTMLButtonElement>] = [true,true];
  await Promise.resolve();
  void parameters;
}} satisfies FilePreviewOptions;

void [conversation,paged,file,asyncConversation,asyncPaged,asyncFile];

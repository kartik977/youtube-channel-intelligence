// A calendar idea is a prospective brief, not an upload or watched footage.
const cut=(value,max)=>typeof value==='string'?value.trim().slice(0,max):'';
export function ideaToOptimizerDraft(slot,config={}){
  if(!slot||typeof slot!=='object')throw Error('Select a content idea.');
  const title=cut(slot.title,130),idea=cut(slot.idea,370),hook=cut(slot.hook,160);
  if(!title||!idea)throw Error('This idea is incomplete.');
  return {
    title,
    kind:'short',
    // This label makes the status of the concept unambiguous even after handoff.
    description:cut('PLANNED CONCEPT — not recorded footage. Proposed content: '+idea+
      (hook?' Suggested opening hook (to use if appropriate): '+hook:'')+
      ' Verify all events, outcomes and details after recording.',650),
    audience:cut(config.audience,100),
    origin:'calendar',
    sourcePlatform:slot.platform==='Instagram Reel'?'Instagram Reel':'YouTube Short'
  };
}

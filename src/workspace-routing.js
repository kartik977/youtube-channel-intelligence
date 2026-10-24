// Platform navigation only; no social accounts or private platform data.
export const workspaceConfig=[
  {id:'youtube',label:'YouTube',subtitle:'Channel intelligence',route:'youtube',home:'overview',
    tabIds:['overview','videos','compare','insights','advisor','optimizer','opportunities']},
  {id:'instagram',label:'Instagram',subtitle:'Reels & profile writing',route:'instagram',home:'instagram',
    tabIds:['instagram']},
  {id:'creator',label:'Creator Tools',subtitle:'Across both platforms',route:'creator',home:'social',
    tabIds:['social','calendar','upload']}
];
const paths={
  overview:'overview',videos:'video-library',compare:'compare-channels',
  insights:'creator-insights',advisor:'ai-creator-advisor',optimizer:'video-optimizer',
  opportunities:'content-opportunities',instagram:'studio',
  social:'social-publishing',calendar:'content-calendar',upload:'video-upload-studio'
};
export const tabIds=Object.keys(paths);
export function getWorkspaceForTab(tab){
  return workspaceConfig.find(w=>w.tabIds.includes(tab))?.id||'youtube';
}
export function getWorkspace(id){
  return workspaceConfig.find(w=>w.id===id)||workspaceConfig[0];
}
export function defaultTabForWorkspace(id){return getWorkspace(id).home;}
export function tabsForWorkspace(id){return getWorkspace(id).tabIds;}
export function hashForTab(tab){
  if(tab==='home')return '#/home';
  const valid=tabIds.includes(tab)?tab:'overview';
  const workspace=getWorkspace(getWorkspaceForTab(valid));
  return '#/'+workspace.route+'/'+paths[valid];
}
export function tabFromHash(hash){
  if(!hash||typeof hash!=='string')return 'overview';
  const clean=hash.trim().replace(/^#/,'').replace(/^\/+/,'').replace(/\/+$/,'').toLowerCase();
  if(clean==='home')return 'home';
  // Old-style hashes like #/optimizer remain accepted.
  if(tabIds.includes(clean))return clean;
  const parts=clean.split('/');
  if(parts.length!==2)return 'overview';
  const workspace=workspaceConfig.find(w=>w.route===parts[0]);
  if(!workspace)return 'overview';
  return workspace.tabIds.find(tab=>paths[tab]===parts[1])||workspace.home;
}

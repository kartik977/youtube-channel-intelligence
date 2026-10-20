// Topic-aware *ideas to make*, not claims about already recorded footage.
// Keep no-cost plans useful even when Groq fails or reaches free-tier limits.
const neat=(s,max=90)=>String(s||'').replace(/\s+/g,' ').trim().slice(0,max);
const shortLabel=(s,max=42)=>neat(s,max).replace(/[.!?]+$/,'');
export function classifyCalendarNiche(raw){
  const niche=neat(raw,180).toLowerCase();
  if(/\b(?:ps[345]|playstation|xbox|nintendo|switch|steam|gaming|gameplay|gamer|games|cricket\s*26|fc\s*26|fifa|minecraft|call of duty|fortnite|valorant|roblox)\b/i.test(niche))return 'gaming';
  if(/\b(?:travel|vacation|trip|destination|city walks?|tourism|backpack|sightseeing|wanderlust)\b/i.test(niche))return 'travel';
  if(/\b(?:food|recipe|cook|baking|chef|meal|kitchen|restaurant|dessert)\b/i.test(niche))return 'food';
  if(/\b(?:fitness|workout|exercise|gym|yoga|running|pilates|strength)\b/i.test(niche))return 'fitness';
  if(/\b(?:coding|software|developer|programming|technology|tech|javascript|python|apps?)\b/i.test(niche))return 'tech';
  if(/\b(?:beauty|makeup|skincare|fashion|outfit|style|haircare)\b/i.test(niche))return 'lifestyle';
  return 'general';
}
function idea(pillar,title,action,hook,cta){
  return {pillar,title,action,hook,cta};
}
export function getCalendarIdeas(config){
  const topic=shortLabel(config.niche,55);
  const low=topic.toLowerCase();
  const game=/cricket\s*26/i.test(topic)?'Cricket 26':/\b(?:ps[345]|playstation)\b/i.test(topic)?'PS5':
    /\b(?:xbox)\b/i.test(topic)?'Xbox':/\b(?:minecraft)\b/i.test(topic)?'Minecraft':'gaming';
  const kinds={
    gaming:[
      idea('Compare','Which '+game+' game has the best opening?',
        'Pick two games you can access. Capture a short opening segment from each and invite a comparison; use actual footage only.',
        'Two game openings. Which one grabs your attention first?','Which one would you play?'),
      idea('Challenge','One challenge, two '+game+' games',
        'Choose one feasible challenge you can try in two different games. Record the attempts and honestly show what happened.',
        'Same challenge, two games. Which one will be tougher?','Suggest the next challenge.'),
      idea('Audience choice','You choose my next '+game+' game',
        'Show two or three games you are considering playing and let viewers vote; avoid presenting the vote as an actual result.',
        'I have a few games to choose from. Which one should be next?','Vote for the next game in the comments.'),
      idea('Gameplay detail','One small '+game+' gameplay detail worth noticing',
        'Capture a real mechanic, animation or menu detail from a game you play and explain why it caught your attention.',
        'Have you noticed this detail while playing?','Have you spotted something similar?'),
      idea('Mini series','First five minutes: two '+game+' experiences',
        'Try the first five minutes of two accessible games and compare only what you actually observe.',
        'Two games, five minutes each. Which start feels better?','Which game deserves a part two?'),
      idea('Viewer debate','Fast action or exploration in '+game+'?',
        'Find one genuine action-focused clip and one exploration-focused clip from games you can access.',
        'Fast action or slow exploration—which do you prefer?','Team action or team exploration?'),
      idea('First impression','A first look at a '+game+' game I have not tried',
        'Choose an unfamiliar game you have access to. Record your actual first impressions without inventing reactions.',
        'Trying a different game—what will stand out first?','What should I test next time?'),
      idea('Experiment','Can I beat my own time in a '+game+' challenge?',
        'Select a repeatable in-game objective, record two real attempts and show the actual difference without promising success.',
        'One challenge, two attempts. Can the time improve?','Would you try this challenge?'),
      idea('Hidden detail','A '+game+' menu or setting people might overlook',
        'Show a setting or accessibility option you have actually checked; do not claim it boosts performance without evidence.',
        'This small setting is worth a look. Have you tried it?','Which setting should I explore next?'),
      idea('Gaming preferences','Two '+game+' titles I would choose between',
        'Put two games you can actually play side by side and give one honest reason for considering each.',
        'I could play either of these next. Which would you pick?','Tell me your pick.'),
      idea('Series','Start a '+game+' mini challenge series',
        'Plan a short, repeatable game challenge that can become a two- or three-part series. Only promise episodes you can make.',
        'One new challenge. Should this become a series?','Want part two?'),
      idea('Community Q&A','Answer a real question about '+game+' gameplay',
        'Pick a genuine question you can answer from your experience, show supporting gameplay, and invite further questions.',
        'Someone might be wondering about this gameplay choice.','What should I answer next?')
    ],
    travel:[
      idea('Place spotlight','One memorable detail from '+topic,'Select a real location or detail you visited or can film and show viewers what makes it distinctive.','What stands out about this place?','Would you add this to your list?'),
      idea('Two perspectives','Compare two views of '+topic,'Film or select two authentic viewpoints of the same place and invite viewers to choose.','One place, two views. Which would you pick?','Vote for your favorite view.'),
      idea('Budget question','A realistic budget question for '+topic,'Share actual costs you verified or ask viewers how they would plan within a stated budget.','What would you prioritize with a limited travel budget?','What would you budget for first?'),
      idea('Planning tip','One practical planning consideration for '+topic,'Share one verifiable route, accessibility, or planning detail you can substantiate.','Here is one thing worth checking before a trip.','What would you check?'),
      idea('Photo moment','A short scenic moment from '+topic,'Show a scene you filmed or plan to film; avoid claiming you have visited somewhere you have not.','Take a moment to enjoy this view.','What scenery would you like next?'),
      idea('Choose next','Help choose the next '+topic+' story','Offer two realistic ideas for upcoming travel content and let your audience vote.','Which travel story should come next?','Pick A or B.')
    ],
    food:[
      idea('Ingredient','One ingredient, two ways in '+topic,'Pick one ingredient and plan two realistic preparations you can actually make.','Same ingredient, two possibilities. Which would you choose?','Which version would you try?'),
      idea('Quick recipe','A simple '+topic+' recipe worth trying','Select a recipe you can prepare; film real steps and show the actual outcome.','Can this recipe fit into a short video?','Want the ingredient list?'),
      idea('Taste test','Compare two '+topic+' variations','Prepare two comparable options and record your honest reaction without inventing a winner.','Two versions, one taste test.','Which would you taste first?'),
      idea('Kitchen tip','One useful '+topic+' kitchen technique','Demonstrate a technique you have personally tested and explain the result accurately.','What difference does this step make?','What should I try next?'),
      idea('Audience vote','Let viewers choose a '+topic+' ingredient','Offer two plausible ingredients and ask the audience which to use in the next recipe.','You choose the next ingredient.','Which option wins your vote?'),
      idea('Process','From ingredients to plate: '+topic,'Record a real process from preparation through serving, with no fabricated result.','What does this recipe look like from start to finish?','Would you make this?')
    ],
    fitness:[
      idea('Form','One movement to focus on in '+topic,'Demonstrate a basic movement you can safely perform and avoid giving medical promises.','What does controlled technique look like?','Which movement should be covered next?'),
      idea('Routine','A realistic short '+topic+' routine','Plan a brief session you can actually perform; clarify that it is not a guaranteed result.','Could a short session fit your routine?','What is your favorite exercise?'),
      idea('Comparison','Compare two '+topic+' movements','Demonstrate two safe movements and describe factual differences, not promised outcomes.','Two movements, different feels. Which do you prefer?','Vote for the next comparison.'),
      idea('Habit','One consistency habit for '+topic,'Describe a manageable planning habit from real experience without making health claims.','What is one habit you can keep repeating?','What helps you stay consistent?'),
      idea('Question','Ask a useful '+topic+' training question','Invite opinions on a choice of routines without presenting medical advice.','Morning or evening training—what suits you?','When do you prefer to train?'),
      idea('Progress','One way to track '+topic+' practice','Demonstrate a simple non-medical consistency tracker, without predicting results.','How do you remember your last session?','What do you like to track?')
    ],
    tech:[
      idea('Walkthrough','One useful feature in '+topic,'Pick a real feature you can access and demo its actual behavior.','Have you tried this feature?','Which feature should I show next?'),
      idea('Comparison','Two approaches to '+topic,'Demonstrate a small, verifiable comparison between two alternatives.','Same task, two methods. Which feels clearer?','What approach do you prefer?'),
      idea('Mini build','A tiny project idea using '+topic,'Choose a feasible example you can actually build and document the real steps.','What can you build with a small starting point?','Want a walkthrough?'),
      idea('Debugging','One common '+topic+' mistake to avoid','Use a real reproducible example and show the verified fix.','This small issue can be confusing.','What should I debug next?'),
      idea('Tools','Choose a tool for '+topic,'Compare two actual tools using your own test or documented features.','Which tool would you choose for this task?','Tell me your favorite.'),
      idea('Question','Answer one practical '+topic+' question','Select a common question you can verify and answer concisely.','Here is a quick question worth answering.','What should I cover next?')
    ],
    lifestyle:[
      idea('Showcase','One look inspired by '+topic,'Show one real style or routine and describe only what is visible or experienced.','What catches your eye about this look?','Would you try this style?'),
      idea('Two looks','Two different takes on '+topic,'Create or select two distinct looks and ask viewers which fits their preference.','One theme, two looks. Which is more you?','Vote A or B.'),
      idea('Detail','One small detail in '+topic,'Highlight one authentic element of an outfit, routine or design.','Sometimes one detail makes the difference.','What detail would you choose?'),
      idea('Routine','A simple '+topic+' routine to share','Film a real routine or walk through a truthful plan without unsupported results.','How would you fit this into your routine?','What do you do differently?'),
      idea('Question','Audience picks the next '+topic+' look','Present two options you could actually create and ask for input.','Which style should come next?','Tell me your pick.'),
      idea('Process','An honest behind-the-scenes look at '+topic,'Show real preparation or work involved in a post and avoid staging it as spontaneous.','What goes into this kind of content?','Want more behind the scenes?')
    ],
    general:[
      idea('Compare',topic+': two approaches to explore','Choose two real examples within your niche and show verifiable differences.','Two approaches. What would you choose?','Which option interests you?'),
      idea('Audience choice',topic+': let viewers decide','Offer two genuine upcoming content ideas related to your topic and ask viewers to vote.','Which part of this topic should come next?','Vote for the next idea.'),
      idea('Spotlight',topic+': one detail worth seeing','Select one concrete fact, object or moment from this topic and demonstrate it truthfully.','Here is one real detail to focus on.','What catches your attention?'),
      idea('Challenge',topic+': try a small challenge','Design an achievable challenge related to your niche; film the actual attempt rather than inventing the result.','Can this small challenge be done?','Would you try it?'),
      idea('Answer',topic+': answer one audience question','Pick a genuine question and create a short, verifiable answer.','One quick question about this topic.','What would you ask next?'),
      idea('Series',topic+': start a focused mini-series','Break this subject into two distinct, achievable posts.','What belongs in part one of this series?','Would you watch part two?')
    ]
  };
  return kinds[classifyCalendarNiche(config.niche)];
}

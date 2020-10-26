export const taskTrackerSettings = localStorage.taskTrackerSettings && JSON.parse(localStorage.taskTrackerSettings)

export const asanaHeaders = new Headers({
  'Accept': 'application/json',
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${taskTrackerSettings && taskTrackerSettings.pat || 'OPEN TELEGRAM SETTINS > TaskTracker'}`,
})

export function parseMapping (mappingText) {
  const res = {};
  normMapping(mappingText).trim().replace(/\s*\(.+?\)/g, '').split('\n').forEach(line => {
    const [chatId, projectId] = line.trim().split(' ')
    res[chatId] = {tasksStore: {projectId}};
  })
  return res;
}


export function normMapping (mappingText) {
  return mappingText.trimLeft().replace(/\n{2,}/g, '\n').replace(/ +/g, ' ');
}

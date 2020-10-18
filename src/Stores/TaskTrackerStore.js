import EventEmitter from './EventEmitter';
import {memoize} from 'lodash'; // Note: uses 1th arg as string only!

export const TT = {
  ASANA: 'ASANA',
}
const taskTrackerSettings = localStorage.taskTrackerSettings && JSON.parse(localStorage.taskTrackerSettings)
export const initialTasks = []
export const initialProjects = []
export const initialChats = parseMapping(taskTrackerSettings.mappingText)
const asanaHeaders = new Headers({
  'Accept': 'application/json',
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${taskTrackerSettings && taskTrackerSettings.pat || 'OPEN TELEGRAM SETTINS > TaskTracker'}`,
})
const getTaskPlaces = getTaskPlaceScript(taskTrackerSettings)


class TaskTrackerStore extends EventEmitter {
  constructor() {
      super();
      this.reset();
      setTimeout(() => {
        this.loadProjects();
        this.loadUsers();
      }, 1000); // low priority
    this.getTasks = memoize(this._getTasks);
  }
  reset() {
    this.projects = initialProjects;
    this.chats = initialChats;
    this.users = [];
  }
  async loadProjects() {
    const {data: projects} = await fetch('https://app.asana.com/api/1.0/projects', { headers: asanaHeaders }).then(r => r.json())
    this.projects = projects.map((item) => ({...item, id: item.gid}));
    // todo: error,loading
  }
  async loadUsers() {
    const {data: users} = await fetch('https://app.asana.com/api/1.0/users', { headers: asanaHeaders }).then(r => r.json())
    this.users = users.map((item) => ({...item, id: item.gid}));
    // todo: error,loading
  }
  async _getTasks(projectId) {
    if (!projectId) {
      console.error('getTasks: projectId is unset')
      return []
    }
    const {data: tasks} = await fetch(`https://app.asana.com/api/1.0/tasks?project=${projectId}`, { headers: asanaHeaders }).then(r => r.json())
    return tasks.map((item) => ({...item, id: item.gid}));
    // todo: error,loading
  }

  //
  // == Public

  /**
   * @param projectId {number}
   * @param data {object}
   */
  submitTask = async (projectId, data) => {
    const params = { method: 'POST', headers: asanaHeaders, body: JSON.stringify({data: {...data, projects: [projectId]}}) };
    const res = await fetch('https://app.asana.com/api/1.0/tasks', params).then(res => res.json());
    if (res.errors) throw new Error(res.errors[0] && res.errors[0].message || 'Error');
  }

  getTaskPlaces = async (projectId) => {
    const tasks = await this.getTasks(projectId)
    return getTaskPlaces({ tasks })
  }
}

function parseMapping (mappingText) {
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

function getTaskPlaceScript (settings) {
  const result = settings && settings.placeScript && eval(settings.placeScript)
  if (typeof result === 'function') return result;
  if (Array.isArray(result)) return () => result;
  return undefined;
}

const store = new TaskTrackerStore();
window.tasksStore = store;
export default store;

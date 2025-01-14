import EventEmitter from './EventEmitter';
import {memoize} from 'lodash'; // Note: uses 1th arg as string only!
import { taskTrackerSettings, parseMapping, asanaHeaders } from '../Utils/Api';
export const initialTasks = []
export const initialProjects = []
export const initialChats = taskTrackerSettings ? parseMapping(taskTrackerSettings.mappingText) : {}

export const TT = {
  ASANA: 'ASANA',
}
const _getTaskPlaces = getTaskPlaceScript(taskTrackerSettings)


class TaskTrackerStore extends EventEmitter {
  constructor() {
      super();
      this.reset();
      setTimeout(() => {
        this.loadProjects();
        this.loadUsers();
      }, 1000); // low priority
  }
  reset() {
    this.projects = initialProjects;
    this.chats = initialChats;
    this.users = [];
  }
  async loadProjects() {
    const {data: projects, errors} = await fetch('https://app.asana.com/api/1.0/projects', { headers: asanaHeaders }).then(r => r.json())
    if (errors) throw new Error(errors[0] && errors[0].message || 'Error');
    this.projects = withIds(projects)
  }
  async loadUsers() {
    const {data: users, errors} = await fetch('https://app.asana.com/api/1.0/users', { headers: asanaHeaders }).then(r => r.json())
    if (errors) throw new Error(errors[0] && errors[0].message || 'Error');
    this.users = withIds(users)
  }

  //
  // == Public

  getTasks = async (projectId) => {
    if (!projectId) {
      console.error('getTasks: projectId is unset')
      return []
    }
    const {data: tasks, errors} = await fetch(`https://app.asana.com/api/1.0/projects/${projectId}/tasks`, { headers: asanaHeaders }).then(r => r.json())
    if (errors) throw new Error(errors[0] && errors[0].message || 'Error');
    return withIds(tasks)
  }
  getTasksBySection = async (sectionId, fields) => {
    if (!sectionId) {
      console.error('getTasksBySection: sectionId is unset')
      return []
    }
    const url = `https://app.asana.com/api/1.0/sections/${sectionId}/tasks${fields ? `?opt_expand=${fields.join(',')}` : ''}`
    const {data: tasks, errors} = await fetch(url, { headers: asanaHeaders }).then(r => r.json())
    if (errors) throw new Error(errors[0] && errors[0].message || 'Error');
    return withIds(tasks)
  }
  /**
   * @param projectId {number}
   * @param data {object}
   */
  submitTask = async (projectId, data) => {
    const params = { method: 'POST', headers: asanaHeaders, body: JSON.stringify({data: {...data, projects: [projectId]}}) };
    const res = await fetch('https://app.asana.com/api/1.0/tasks', params).then(res => res.json());
    if (res.errors) throw new Error(res.errors[0] && res.errors[0].message || 'Error');
    this.emit('taskCreated', res)
  }

  getTaskPlaces = ({tasks}) => _getTaskPlaces({tasks})

  getSectionsWithTasks = async (projectId) => {
    const allTasks = {}
    const taskFields = ['notes', 'name', 'permalink_url', 'gid', 'assignee.name', 'completed', 'section', 'due_on'];
    const sections = await Promise.all((await this.getSections(projectId))
      .map(section => awaitAndEnchance(
        this.getTasksBySection(section.id, taskFields),
        tasks => {
          tasks.forEach(t => allTasks[t.id] = t)
          return {tasks: tasks.map(t => t.id), ...section}
        }
      ))
    );
    return {sections, all: { tasks: allTasks }}; // Array<{id, name, tasks: Task[]}>
  }

  getSections = async (projectId) => {
    const {data: tasks, errors} = await fetch(`https://app.asana.com/api/1.0/projects/${projectId}/sections`, { headers: asanaHeaders }).then(r => r.json())
    if (errors) throw new Error(errors[0] && errors[0].message || 'Error');
    return withIds(tasks)
  }
}

function withIds (items) {
  return items.map((item) => ({...item, id: item.gid}));
}

function awaitAndEnchance (promise, mapper) {
  return new Promise((resolve, reject) => {
    promise.then((res) => resolve(mapper(res)), reject);
  })
}

function getTaskPlaceScript (settings) {
  let result = []
  try {
    result = settings && settings.placeScript && eval(settings.placeScript)
  } catch (e) {
    console.error('Task Place Compute Script отработал с ошибкой')
  }
  if (typeof result === 'function') return result;
  if (Array.isArray(result)) return () => result;
  return undefined;
}

const store = new TaskTrackerStore();
window.tasksStore = store;
export default store;
